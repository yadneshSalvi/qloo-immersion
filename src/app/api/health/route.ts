import { database } from '@/server/db';
export async function GET() {
  try {
    await database().query('SELECT 1');
    return Response.json(
      {
        status: 'ok',
        database: 'connected',
        edition: 'authored-sample',
        qloo: 'not-enabled',
        model: 'not-enabled',
        speech: 'optional-browser-synthesis',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'unavailable', database: 'unavailable' }, { status: 503 });
  }
}
