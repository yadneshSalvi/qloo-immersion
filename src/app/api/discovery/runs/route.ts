import { after } from 'next/server';
import { apiLearner } from '@/server/auth';
import { createDiscoveryRun } from '@/server/live-store';
import { discoveryInputSchema } from '@/domain/live-commands';
import { dispatchLearning } from '@/server/dispatch';
import { apiError, assertOrigin, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try {
    assertOrigin(request); const learner = await apiLearner();
    const run = await createDiscoveryRun(learner.id, discoveryInputSchema.parse(await readJson(request)));
    if (run.state === 'queued' || run.state === 'running') after(() => dispatchLearning(run.id));
    return Response.json(run, { status: 202, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
