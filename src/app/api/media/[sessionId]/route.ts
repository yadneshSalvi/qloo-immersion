import { apiLearner } from '@/server/auth';
import { mediaResponse } from '@/server/media';
import { apiError } from '@/server/http';
import { z } from 'zod';
async function serve(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try { const learner = await apiLearner(); const { sessionId } = await context.params; z.uuid().parse(sessionId); return await mediaResponse(learner.id, sessionId, request); }
  catch (error) { return apiError(error); }
}
export const GET = serve;
export const HEAD = serve;
