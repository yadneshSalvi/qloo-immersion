import { apiLearner } from '@/server/auth';
import { getMediaManifest } from '@/server/media';
import { apiError, privateHeaders } from '@/server/http';
import { z } from 'zod';
export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try { const learner = await apiLearner(); const { sessionId } = await context.params; z.uuid().parse(sessionId); return Response.json(await getMediaManifest(learner.id, sessionId), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
