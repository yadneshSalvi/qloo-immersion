import { requireLearner } from '@/server/auth';
import { getLiveOverview } from '@/server/live-store';
import { TasteStudio } from '@/components/taste-studio';
export const metadata = { title: 'Your interests' };
export default async function Taste() {
  const learner = await requireLearner();
  return <TasteStudio learner={learner} initialOverview={await getLiveOverview(learner.id)} />;
}
