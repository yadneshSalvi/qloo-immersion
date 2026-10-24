import { redirect } from 'next/navigation';
import { currentLearner } from '@/server/auth';
import { Onboarding } from '@/components/onboarding';
export const metadata = { title: 'Find your starting point' };
export default async function Start() {
  if (await currentLearner()) redirect('/discover');
  return <Onboarding />;
}
