import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, BookOpen, Bookmark, Feather, Route } from 'lucide-react';
import { requireLearner } from '@/server/auth';
import { getPath } from '@/server/store';
import { PieceCard } from '@/components/piece-card';
import { clusterLabels } from '@/domain/types';
export const metadata = { title: 'Your learning path' };
export default async function Path() {
  const learner = await requireLearner();
  const path = await getPath(learner.id);
  const complete = path.sessions.filter((s) => s.state === 'completed');
  return (
    <div className="container path-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">The stories become your story</span>
          <h1>Your own way through Spanish.</h1>
          <p>A record of what you explored, what you understood, and what you chose to keep.</p>
        </div>
        <Link href="/taste" className="quiet-link">
          Adjust my path <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="path-summary">
        <div>
          <BookOpen size={20} />
          <strong>{complete.length}</strong>
          <span>sessions completed</span>
        </div>
        <div>
          <Feather size={20} />
          <strong>{path.words}</strong>
          <span>words in your notebook</span>
        </div>
        <div>
          <Check size={20} />
          <strong>
            {path.correctReviews}
            <small> / {path.reviews}</small>
          </strong>
          <span>successful recall attempts</span>
        </div>
        <div>
          <Route size={20} />
          <strong>
            {learner.profile.readingBand}
            <small> / {learner.profile.listeningBand}</small>
          </strong>
          <span>reading / listening · self-selected</span>
        </div>
      </div>
      <p className="metrics-note">
        Activity and sample-answer results are separate from language proficiency. No learning gain
        or certified level is claimed.
      </p>
      <div className="path-columns">
        <section>
          <div className="section-heading">
            <h2>A collection of moments.</h2>
            <span className="fine-print">{path.sessions.length} sessions started</span>
          </div>
          {path.sessions.length ? (
            <div className="timeline">
              {path.sessions.map((s) => (
                <article key={s.id} className="timeline-item">
                  <span className={`timeline-point ${s.state === 'completed' ? 'done' : ''}`}>
                    {s.state === 'completed' ? <Check size={12} /> : <BookOpen size={12} />}
                  </span>
                  <div>
                    <span className="eyebrow">
                      {clusterLabels[s.cluster]} ·{' '}
                      {new Intl.DateTimeFormat('en', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: learner.profile.timezone,
                      }).format(new Date(s.startedAt))}
                    </span>
                    <h3 lang="es">
                      <Link href={`/session/${s.id}`}>{s.title}</Link>
                    </h3>
                    <p>
                      {s.state === 'completed'
                        ? `${Math.round((s.comprehension ?? 0) * 3)} of 3 source questions correct · completed`
                        : `${s.state === 'practice' ? 'Practice in progress' : 'Exploring the source'} · your place is saved`}
                    </p>
                  </div>
                  <Link href={`/session/${s.id}`} className="quiet-link">
                    {s.state === 'completed' ? 'Revisit' : 'Continue'}
                    <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <BookOpen size={28} />
              <h3>Your first story is waiting.</h3>
              <p>
                Finish a source, practice its language, and reflect to add a complete moment to your
                path.
              </p>
              <Link className="button button-primary" href="/discover">
                Begin exploring <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
        <aside className="path-aside">
          <span className="eyebrow">What’s guiding your path</span>
          <h3>Your curiosity comes first.</h3>
          <div className="chip-row">
            {learner.profile.interests.map((c) => (
              <span className="chip" key={c}>
                {clusterLabels[c]}
              </span>
            ))}
          </div>
          {learner.profile.references.length > 0 && (
            <>
              <span className="eyebrow small-heading">Your expressed favorites</span>
              <p>{learner.profile.references.join(' · ')}</p>
              <span className="fine-print">
                Unresolved references. No live Qloo match is asserted.
              </span>
            </>
          )}
          {learner.profile.adaptation && (
            <div className="path-adaptation">
              <span className="eyebrow">The latest adjustment</span>
              <p>{learner.profile.adaptation.reason}</p>
              <Link href="/evidence" className="quiet-link">
                See the decision <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          <Link href="/review" className="button button-secondary">
            {path.dueWords ? `${path.dueWords} words ready for review` : 'Visit my word notebook'}
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <section className="saved-collection">
        <div className="section-heading">
          <h2>For another moment.</h2>
          <span className="fine-print">{path.saved.length} saved pieces</span>
        </div>
        {path.saved.length ? (
          <div className="piece-grid">
            {path.saved.map((p) => (
              <PieceCard key={p.id} piece={p} />
            ))}
          </div>
        ) : (
          <div className="saved-empty">
            <Bookmark size={20} />
            <p>
              Save pieces that catch your eye. Saving a piece doesn’t count as a like or change your
              working band.
            </p>
            <Link href="/discover" className="quiet-link">
              Browse stories <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
