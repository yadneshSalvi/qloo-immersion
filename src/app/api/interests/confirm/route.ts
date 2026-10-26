import { apiLearner } from '@/server/auth';
import { confirmInterest, removeInterest } from '@/server/live-store';
import { confirmationInputSchema, removalInputSchema } from '@/domain/live-commands';
import { apiError, assertOrigin, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try { assertOrigin(request); const learner = await apiLearner(); return Response.json(await confirmInterest(learner.id, confirmationInputSchema.parse(await readJson(request))), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try { assertOrigin(request); const learner = await apiLearner(); return Response.json(await removeInterest(learner.id, removalInputSchema.parse(await readJson(request))), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
