import { after } from 'next/server';
import { apiLearner } from '@/server/auth';
import { createCoachingRun, getCoachingHistory } from '@/server/live-store';
import { coachingInputSchema } from '@/domain/live-commands';
import { dispatchLearning } from '@/server/dispatch';
import { apiError, assertOrigin, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try {
    assertOrigin(request); const learner = await apiLearner();
    const run = await createCoachingRun(learner.id, coachingInputSchema.parse(await readJson(request)));
    if (run.state === 'queued' || run.state === 'running') after(() => dispatchLearning(run.id));
    return Response.json(run, { status: 202, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
export async function GET(request: Request) {
  try { const learner = await apiLearner(); return Response.json(await getCoachingHistory(learner.id, new URL(request.url).searchParams.get('sessionId') ?? ''), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
