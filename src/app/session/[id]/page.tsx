import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireLearner } from '@/server/auth';
import { getSession } from '@/server/store';
import { DomainError } from '@/domain/commands';
import { SessionStudio } from '@/components/session-studio';
export const metadata = { title: 'Your learning studio' };
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, learner] = await Promise.all([params, requireLearner()]);
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const session = await getSession(learner.id, id).catch((error) => {
    if (error instanceof DomainError && error.status === 404) notFound();
    if (error instanceof DomainError && error.status === 410) return null;
    throw error;
  });
  if (!session)
    return (
      <section className="empty-state container">
        <span className="eyebrow">Your progress is still here</span>
        <h1>This source is no longer available.</h1>
        <p>
          The text, questions, and saved words are unavailable while its source permission is
          withdrawn. Your activity record is preserved.
        </p>
        <div className="button-row">
          <Link href="/discover" className="button button-primary">
            Find another story
          </Link>
          <Link href="/path" className="button button-secondary">
            View my progress
          </Link>
        </div>
      </section>
    );
  return (
    <SessionStudio
      key={`${session.id}:${session.version}:${session.savedWordIds.length}`}
      initialSession={session}
    />
  );
}
