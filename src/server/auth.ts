import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findLearner } from './store';
import { DomainError } from '../domain/commands';
export const COOKIE_NAME = 'immersion_guest';
export async function currentLearner() {
  return findLearner((await cookies()).get(COOKIE_NAME)?.value);
}
export async function requireLearner() {
  const learner = await currentLearner();
  if (!learner) redirect('/start');
  return learner;
}
export async function apiLearner() {
  const learner = await currentLearner();
  if (!learner) throw new DomainError('UNAUTHORIZED', 'Start a learning path to continue.', 401);
  return learner;
}
