import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentLearner } from '@/server/auth';
import { getSource, getBookmarks } from '@/server/store';
import { DomainError } from '@/domain/commands';
import { PiecePreview } from '@/components/piece-preview';
export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [source, learner] = await Promise.all([
    getSource(id).catch((error) => {
      if (error instanceof DomainError && error.status === 404) notFound();
      if (error instanceof DomainError && error.status === 410) return null;
      throw error;
    }),
    currentLearner(),
  ]);
  if (!source)
    return (
      <section className="empty-state container">
        <span className="eyebrow">A change in the collection</span>
        <h1>This piece is no longer available.</h1>
        <p>Your progress is saved. Find another story while this source is unavailable.</p>
        <Link className="button button-primary" href="/discover">
          Find another story
        </Link>
      </section>
    );
  const saved = learner ? (await getBookmarks(learner.id)).includes(source.versionId) : false;
  const { segments: _segments, glossary: _glossary, ...piece } = source;
  return <PiecePreview piece={piece} learner={learner} saved={saved} />;
}
