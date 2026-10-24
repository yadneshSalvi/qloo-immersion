import { cookies } from 'next/headers';
import { DomainError } from '@/domain/commands';
import { currentLearner, COOKIE_NAME } from '@/server/auth';
import { deleteLearner } from '@/server/store';
import { assertOrigin, apiError, readJson, privateHeaders } from '@/server/http';
export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const data = (await readJson(request)) as { confirmation?: string };
    if (data?.confirmation !== 'DELETE MY PATH')
      throw new DomainError(
        'CONFIRMATION_REQUIRED',
        'Confirm that you want to delete this learning path.',
      );
    const learner = await currentLearner();
    if (learner) await deleteLearner(learner.id);
    (await cookies()).delete(COOKIE_NAME);
    return Response.json({ deleted: true }, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
