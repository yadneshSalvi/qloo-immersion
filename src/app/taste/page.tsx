import { requireLearner } from '@/server/auth';
import { Onboarding } from '@/components/onboarding';
export const metadata = { title: 'Your interests' };
export default async function Taste() {
  return <Onboarding learner={await requireLearner()} />;
}
