import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findLearner } from './store';
export const COOKIE_NAME = 'immersion_guest';
export async function currentLearner() {
  return findLearner((await cookies()).get(COOKIE_NAME)?.value);
}
export async function requireLearner() {
  const learner = await currentLearner();
  if (!learner) redirect('/start');
  return learner;
}
