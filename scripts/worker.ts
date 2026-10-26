import { createServer } from 'node:http';
import { database, closeDatabase } from '../src/server/db';
import { processNextRun } from '../src/server/learning-worker';
import { purgeProviderMetadata, recordHeartbeat } from '../src/server/live-store';
import { providerConfiguration } from '../src/server/live-config';
import { workerDispatchAuthorized } from '../src/server/worker-auth';

let stopped = false,
  active = false,
  ticks = 0,
  lastHeartbeat = Date.now();
let lastFailure: string | null = null;
const controller = new AbortController();
const cloudRunMode =
  process.env.WORKER_AUTH_MODE === 'cloud-run' || process.env.WORKER_MODE === 'cloud-run';
let finishShutdown: (() => void) | undefined;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function tick(jobId?: string) {
  if (active || stopped) return false;
  active = true;
  try {
    const worked = await processNextRun({ signal: controller.signal }, jobId);
    if (++ticks % 100 === 0) await purgeProviderMetadata();
    lastHeartbeat = Date.now();
    lastFailure = null;
    return worked;
  } catch {
    lastFailure = new Date().toISOString();
    await recordHeartbeat(true).catch(() => undefined);
    throw new Error('Worker step could not complete.');
  } finally {
    active = false;
  }
}
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'GET' && ['/health', '/healthz'].includes(request.url ?? '')) {
    let connected = true;
    try {
      await database().query('SELECT 1');
    } catch {
      connected = false;
    }
    const providers = providerConfiguration();
    const healthy =
      !stopped &&
      connected &&
      providers.qloo &&
      providers.model &&
      !lastFailure &&
      (cloudRunMode || Date.now() - lastHeartbeat < 180000);
    response.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        status: healthy ? 'ok' : 'degraded',
        database: connected ? 'connected' : 'unavailable',
        providerConfiguration: providers,
        active,
        heartbeatAt: new Date(lastHeartbeat).toISOString(),
        lastFailureAt: lastFailure,
      }),
    );
    return;
  }
  if (request.method !== 'POST' || request.url !== '/dispatch') {
    response.writeHead(404);
    response.end();
    return;
  }
  if (!workerDispatchAuthorized(request.headers.authorization)) {
    response.writeHead(401);
    response.end();
    return;
  }
  if (Number(request.headers['content-length'] ?? 0) > 1024) {
    response.writeHead(413);
    response.end();
    return;
  }
  if (active) {
    response.writeHead(429);
    response.end();
    return;
  }
  let body = '';
  try {
    for await (const chunk of request) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 1024) {
        response.writeHead(413);
        response.end();
        return;
      }
    }
    const payload: unknown = body ? JSON.parse(body) : {};
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      Object.keys(payload).some((key) => key !== 'jobId')
    ) {
      response.writeHead(400);
      response.end();
      return;
    }
    const jobId = 'jobId' in payload ? payload.jobId : undefined;
    if (
      jobId !== undefined &&
      (typeof jobId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId))
    ) {
      response.writeHead(400);
      response.end();
      return;
    }
    if (active) {
      response.writeHead(429);
      response.end();
      return;
    }
    const worked = await tick(jobId as string | undefined);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ accepted: true, worked }));
  } catch {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Worker step stopped; durable state is preserved.' }));
  }
});
server.listen(Number(process.env.PORT ?? process.env.WORKER_PORT ?? 3104), '0.0.0.0', () =>
  console.log('IMMERSION durable learning worker ready.'),
);
const stop = () => {
  stopped = true;
  controller.abort();
  server.close();
  finishShutdown?.();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  await recordHeartbeat();
  if (cloudRunMode)
    await new Promise<void>((resolve) => {
      finishShutdown = resolve;
    });
  while (!cloudRunMode && !stopped) {
    try {
      if (!(await tick())) await pause(1000);
    } catch {
      console.error('Worker step stopped; durable lease recovery remains available.');
      await pause(2000);
    }
  }
  while (active) await pause(100);
} finally {
  await closeDatabase();
}
