import { database } from '@/server/db';
import { applicationCapabilities } from '@/server/live-config';
export async function GET() {
  try {
    await database().query('SELECT 1');
    const available = applicationCapabilities();
    const heartbeat = await database().query<{ last_seen_at: Date; last_failure_at: Date | null }>('SELECT last_seen_at,last_failure_at FROM worker_heartbeat WHERE id=1');
    return Response.json(
      {
        status: 'ok',
        database: 'connected',
        edition: 'original-cultural-collection',
        qloo: available.qloo ? 'configured' : 'not-configured',
        model: available.model ? 'configured' : 'not-configured',
        worker: heartbeat.rows[0] ? { lastSeenAt: heartbeat.rows[0].last_seen_at.toISOString(), lastFailureAt: heartbeat.rows[0].last_failure_at?.toISOString() ?? null } : { lastSeenAt: null, lastFailureAt: null },
        speech: 'synthetic-narration-with-browser-fallback',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'unavailable', database: 'unavailable' }, { status: 503 });
  }
}
