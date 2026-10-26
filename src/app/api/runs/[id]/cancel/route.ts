import { apiLearner } from '@/server/auth';
import { cancelRun } from '@/server/live-store';
import { cancellationInputSchema } from '@/domain/live-commands';
import { apiError, assertOrigin, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertOrigin(request); const learner = await apiLearner(); const { id } = await context.params; const { key } = cancellationInputSchema.parse(await readJson(request)); return Response.json(await cancelRun(learner.id, id, key), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
