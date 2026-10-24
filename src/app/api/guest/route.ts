import { cookies } from 'next/headers';
import { onboardingSchema } from '@/domain/commands';
import { createLearner } from '@/server/store';
import { COOKIE_NAME, currentLearner } from '@/server/auth';
import { assertOrigin, apiError, readJson, privateHeaders } from '@/server/http';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = onboardingSchema.parse(await readJson(request));
    const existing = await currentLearner();
    if (existing) return Response.json({ learner: existing }, { headers: privateHeaders });
    const learner = await createLearner(input);
    (await cookies()).set(COOKIE_NAME, input.key, {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ learner }, { headers: privateHeaders });
  } catch (e) {
    return apiError(e);
  }
}
