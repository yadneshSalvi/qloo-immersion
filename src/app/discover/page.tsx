import { currentLearner } from '@/server/auth';
import { getCatalog, getDiscovery, getBookmarks, getResume } from '@/server/store';
import { Discovery } from '@/components/discovery';
export const metadata = { title: 'Discover your next story' };
export default async function DiscoverPage() {
  const [learner, catalog] = await Promise.all([currentLearner(), getCatalog()]);
  const [routes, bookmarks, resume] = learner
    ? await Promise.all([
        getDiscovery(learner, catalog),
        getBookmarks(learner.id),
        getResume(learner.id),
      ])
    : [[], [], null];
  return (
    <Discovery
      catalog={catalog}
      learner={learner}
      routes={routes}
      bookmarks={bookmarks}
      resume={resume}
    />
  );
}
