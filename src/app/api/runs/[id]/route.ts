import { apiLearner } from '@/server/auth';
import { getRun } from '@/server/live-store';
import { apiError, privateHeaders } from '@/server/http';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const learner = await apiLearner(); const { id } = await context.params; return Response.json(await getRun(learner.id, id), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
