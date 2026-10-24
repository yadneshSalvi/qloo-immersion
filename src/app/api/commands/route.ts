import { commandEnvelopeSchema, DomainError } from '@/domain/commands';
import { executeCommand } from '@/server/store';
import { currentLearner } from '@/server/auth';
import { assertOrigin, apiError, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const learner = await currentLearner();
    if (!learner) throw new DomainError('UNAUTHORIZED', 'Start a learning path to continue.', 401);
    const { key, command } = commandEnvelopeSchema.parse(await readJson(request));
    const result = await executeCommand(learner.id, key, command);
    return Response.json(result, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
