'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Headphones,
  Clock3,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { Artwork } from './artwork';
import { Button } from './ui/button';
import { useCommand } from './client-api';
import { clusterLabels, type Piece, type Learner } from '@/domain/types';
import type { SupportMode } from '@/domain/learning';
export function PiecePreview({
  piece,
  learner,
  saved: initialSaved,
}: {
  piece: Piece;
  learner: Learner | null;
  saved: boolean;
}) {
  const [support, setSupport] = useState<SupportMode>(learner?.profile.support ?? 'guided');
  const [saved, setSaved] = useState(initialSaved);
  const action = useCommand();
  const router = useRouter();
  async function start() {
    if (!learner) {
      router.push('/start');
      return;
    }
    const result = await action.run({ type: 'start', versionId: piece.versionId, support });
    if (result?.sessionId) {
      router.push(`/session/${result.sessionId}`);
      router.refresh();
    }
  }
  async function bookmark() {
    if (!learner) {
      router.push('/start');
      return;
    }
    if (await action.run({ type: 'bookmark', versionId: piece.versionId, saved: !saved }))
      setSaved(!saved);
  }
  return (
    <div className="container piece-page">
      <Link className="back-link" href="/discover">
        <ArrowLeft size={16} /> Back to the collection
      </Link>
      <section className="piece-intro">
        <div className="piece-intro-art">
          <Artwork cluster={piece.cluster} palette={piece.palette} />
          <div className="art-caption">
            <span>{piece.scene}</span>
            <span>ORIGINAL ILLUSTRATION</span>
          </div>
        </div>
        <div className="piece-intro-copy">
          <span className="eyebrow">
            {clusterLabels[piece.cluster]} <span className="dot-separator">·</span> {piece.country}
          </span>
          <h1 lang="es">{piece.title}</h1>
          <p className="piece-subtitle">{piece.subtitle}</p>
          <p>{piece.description}</p>
          <div className="piece-metadata">
            <span>
              {piece.format === 'read' ? <BookOpen size={16} /> : <Headphones size={16} />}{' '}
              {piece.format === 'read' ? 'Read' : 'Read + listen'}
            </span>
            <span>
              <Clock3 size={16} />
              {piece.minutes} min session
            </span>
            <span className="pill">{piece.band} working band</span>
          </div>
          <div className="learning-intention">
            <span className="eyebrow">A little language to take away</span>
            <p>{piece.objective}</p>
          </div>
          <fieldset className="support-picker">
            <legend>Make yourself comfortable</legend>
            <div className="support-options">
              <button
                type="button"
                aria-pressed={support !== 'independent'}
                onClick={() =>
                  setSupport(learner?.profile.support === 'extra' ? 'extra' : 'guided')
                }
              >
                <span className="radio-dot" />
                Start with support
                <span>
                  {learner?.profile.support === 'extra'
                    ? 'Extra support: translations and open practice hints'
                    : 'English translations ready when you need them'}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={support === 'independent'}
                onClick={() => setSupport('independent')}
              >
                <span className="radio-dot" />
                Try independently<span>Begin in Spanish, with help a click away</span>
              </button>
            </div>
            {support === 'extra' && (
              <p className="fine-print">
                Your request for extra help carries into this story. Hints and the source open
                during practice; you can close them whenever you prefer.
              </p>
            )}
          </fieldset>
          <div className="button-row">
            <Button onClick={start} disabled={action.busy}>
              {action.busy
                ? 'Opening your session…'
                : learner
                  ? 'Begin this story'
                  : 'Create a path to begin'}
              <ArrowRight size={17} />
            </Button>
            <Button variant="secondary" onClick={bookmark} disabled={action.busy}>
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved' : 'Save for later'}
            </Button>
          </div>
          {action.error && (
            <p className="error-message" role="alert">
              {action.error}
            </p>
          )}
          <span className="fine-print">Your place and words are saved as you go.</span>
        </div>
      </section>
      <div className="piece-details">
        <section className="preview-excerpt">
          <span className="eyebrow">A first glimpse</span>
          <blockquote lang="es">{piece.preview}</blockquote>
          <span className="fine-print">
            Passage 1 · {piece.wordCount} words in the complete piece
          </span>
        </section>
        <aside className="source-note">
          <h3>Know what you’re reading.</h3>
          <p>
            <Check size={15} />
            Original fictional sample · no third-party transcript
          </p>
          <p>
            <Check size={15} />
            {piece.variety}
          </p>
          <p>
            <Check size={15} />
            Written with AI assistance · educator review pending
          </p>
          <p>
            <Check size={15} />
            {piece.band} is an intended working band, not certified
          </p>
          {piece.format === 'listen' && (
            <p>
              <Headphones size={15} />
              Synthetic narration where available, with an optional browser voice; the text is
              always available
            </p>
          )}
          <Link className="quiet-link" href="/evidence">
            Source and edition notes <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
