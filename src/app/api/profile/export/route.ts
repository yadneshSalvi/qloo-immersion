import { DomainError } from '@/domain/commands';
import { currentLearner } from '@/server/auth';
import { exportLearner } from '@/server/store';
import { apiError, privateHeaders } from '@/server/http';
export async function GET() {
  try {
    const learner = await currentLearner();
    if (!learner) throw new DomainError('UNAUTHORIZED', 'Start a learning path first.', 401);
    return Response.json(await exportLearner(learner), {
      headers: {
        ...privateHeaders,
        'Content-Disposition': 'attachment; filename="immersion-my-path.json"',
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
