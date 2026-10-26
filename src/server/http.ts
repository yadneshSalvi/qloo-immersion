import { ZodError } from 'zod';
import { DomainError } from '../domain/commands';
import { ProviderError } from '../integrations/qloo-live';
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new Set([process.env.APP_ORIGIN || new URL(request.url).origin]);
  if (!origin || !allowed.has(origin))
    throw new DomainError(
      'ORIGIN_REJECTED',
      'Open IMMERSION in this browser before making changes.',
      403,
    );
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
    throw new DomainError('INVALID_CONTENT_TYPE', 'Send a JSON request.');
}
export async function readJson(request: Request) {
  const maximumBytes = 16000;
  const tooLarge = () => new DomainError('REQUEST_TOO_LARGE', 'This request is too large.', 413);
  if (Number(request.headers.get('content-length')) > maximumBytes) throw tooLarge();
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  let bytes = 0;
  if (reader) {
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > maximumBytes) {
          await reader.cancel().catch(() => undefined);
          throw tooLarge();
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
    ) as unknown;
  } catch {
    throw new DomainError('INVALID_JSON', 'The request could not be read. Please try again.');
  }
}
export function apiError(error: unknown) {
  if (error instanceof ProviderError)
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: ['TIMEOUT', 'UPSTREAM', 'STALE', 'INTERRUPTED'].includes(error.code),
        },
      },
      {
        status:
          error.code === 'BUDGET'
            ? 429
            : error.code === 'INPUT' || error.code === 'GROUNDING'
              ? 422
              : error.code === 'STALE'
                ? 409
                : 503,
        headers: privateHeaders,
      },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: error.issues[0]?.message ?? 'Check your answers and try again.',
          retryable: false,
        },
      },
      { status: 422 },
    );
  if (error instanceof DomainError)
    return Response.json(
      { error: { code: error.code, message: error.message, retryable: error.retryable } },
      { status: error.status },
    );
  console.error('IMMERSION request could not complete.', {
    kind: error instanceof Error ? error.name : 'UnknownError',
  });
  return Response.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message:
          'Your learning space is temporarily unavailable. Your saved progress is safe. Please try again.',
        retryable: true,
      },
    },
    { status: 503 },
  );
}
export const privateHeaders = { 'Cache-Control': 'private, no-store' };
