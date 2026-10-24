import { requireLearner } from '@/server/auth';
import { getReviews } from '@/server/store';
import { ReviewNotebook } from '@/components/review-notebook';
export const metadata = { title: 'Your word notebook' };
export default async function Review() {
  const learner = await requireLearner();
  return (
    <ReviewNotebook
      initialItems={await getReviews(learner.id)}
      timezone={learner.profile.timezone}
    />
  );
}
