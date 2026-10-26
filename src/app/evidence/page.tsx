import Link from 'next/link';
import {
  Check,
  ArrowUpRight,
  BookOpen,
  Link2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Circle,
} from 'lucide-react';
import { currentLearner } from '@/server/auth';
import { getLiveOverview } from '@/server/live-store';
import { DiscoveryComparison } from '@/components/live-discovery';
import { getEvents, getCatalog } from '@/server/store';
export const metadata = { title: 'About this edition & your evidence' };
function Detail({ value }: { value: unknown }) {
  if (value === null) return <span>None</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'object') return <pre>{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}
export default async function Evidence() {
  const [learner, catalog] = await Promise.all([currentLearner(), getCatalog()]);
  const [events, live] = learner
    ? await Promise.all([getEvents(learner.id), getLiveOverview(learner.id)])
    : [[], null];
  const discovery =
    live?.latestDiscovery?.state === 'succeeded' &&
    live.latestDiscovery.result?.kind === 'discovery'
      ? live.latestDiscovery.result
      : null;
  return (
    <div className="container evidence-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A clear view behind the story</span>
          <h1>
            Good learning begins
            <br />
            with knowing what’s real.
          </h1>
          <p>
            What this edition does, what it doesn’t yet do, and the decisions saved along your path.
          </p>
        </div>
        <span className="edition large">
          <span className="status-dot" />
          Authored sample edition
        </span>
      </div>
      <div className="evidence-intro">
        <BookOpen size={24} strokeWidth={1.3} />
        <p>
          The collection contains{' '}
          <strong>{catalog.length} original fictional Spanish pieces</strong>, written with AI
          assistance for IMMERSION. The illustrations are original code artwork. Sample language,
          glosses, translations, and assessment keys are <strong>pending educator review</strong>.
          No third-party media is included. Cultural film connections use a separate editorial theme
          bridge; they are not a claim that these stories came from Qloo. No measured learning gain
          is asserted.
        </p>
      </div>
      <section className="capabilities">
        <article>
          <span className="capability-icon">
            <Check size={20} />
          </span>
          <span className="eyebrow">In this edition</span>
          <h2>Your complete sample journey</h2>
          <ul>
            <li>Saved interests and self-selected A2/B1 starting bands</li>
            <li>
              Reading, translations, source-specific exercises, and synthetic narration where
              available
            </li>
            <li>Durable sessions, vocabulary, and 1/3/7/14-day review scheduling</li>
            <li>Separate taste and comprehension feedback with visible adaptation</li>
            <li>Isolated guest data, export, and deletion</li>
          </ul>
        </article>
        <article>
          <span className="capability-icon muted">
            <Link2 size={20} />
          </span>
          <span className="eyebrow">
            {!live
              ? 'After you create a path'
              : live.qlooAvailable
                ? 'Available on request'
                : 'Currently unavailable'}
          </span>
          <h2>Cultural discovery</h2>
          <p>
            Confirm the exact Qloo entity for a favorite before requesting discovery. Qloo ranks
            film connections; IMMERSION maps film themes to original Spanish pieces. Saved results
            are labeled live or cached. Editorial browsing remains available when the provider is
            unavailable.
          </p>
          <div className="capability-status">
            <Circle size={10} />
            {live?.qlooAvailable
              ? 'Qloo configured · explicit requests only'
              : 'No provider request is made by opening this page'}
          </div>
          <p className="fine-print">
            Qloo affinity is query-relative cultural evidence, never a probability of enjoyment,
            language assessment, or grant of media rights.
          </p>
        </article>
        <article>
          <span className="capability-icon muted">
            <Sparkles size={20} />
          </span>
          <span className="eyebrow">
            {!live
              ? 'After a source exercise'
              : live.coachingAvailable
                ? 'Available with consent'
                : 'Currently unavailable'}
          </span>
          <h2>Optional AI writing feedback</h2>
          <p>
            Source questions use fixed authored answer keys. A separate optional writing activity
            sends your answer and story context to an AI provider only with your processing consent.
            It offers one success, at most two corrections, source quotes, and up to three requests
            per session. There is no speech recognition or pronunciation score.
          </p>
          <div className="capability-status">
            <Circle size={10} />
            Writing feedback does not change comprehension results
          </div>
          <p className="fine-print">
            Saved narration uses an explicitly synthetic voice with timed passage seeking. If it is
            unavailable, optional read-aloud uses your browser’s voice service. Playback always
            begins on an explicit click, and the complete text stays available.
          </p>
        </article>
      </section>
      {discovery && <DiscoveryComparison result={discovery} />}
      <section className="evidence-policy">
        <div>
          <ShieldCheck size={22} />
          <h2>The boundaries that matter.</h2>
        </div>
        <div className="policy-grid">
          <article>
            <span>01</span>
            <h3>Taste is not comprehension.</h3>
            <p>
              Wanting a different topic never lowers your working band. Needing more support never
              marks a topic as disliked.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Questions belong to their source.</h3>
            <p>
              The server checks the exact content version, session, and assigned objective before
              accepting an answer. Future answer keys stay on the server.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Source permission is checked again.</h3>
            <p>
              Withdrawal prevents access to source text, exercises, and review words, including
              retried requests. Your activity record is kept.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>One result is one observation.</h3>
            <p>
              Repeated saves don’t duplicate results. Three sample questions are an observation
              about this piece, not a language certificate or evidence of long-term learning.
            </p>
          </article>
        </div>
      </section>
      <section className="trace-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Your actual activity</span>
            <h2>A path you can follow.</h2>
          </div>
          <span className="fine-print">Private to this guest space</span>
        </div>
        {events.length ? (
          <div className="trace-list">
            {events.map((event, i) => (
              <details className="trace-event" key={event.id}>
                <summary>
                  <span className="trace-number">{String(events.length - i).padStart(2, '0')}</span>
                  <div>
                    <span className="eyebrow">{event.kind.replaceAll('.', ' / ')}</span>
                    <h3>{event.summary}</h3>
                    <span className="fine-print">
                      {new Intl.DateTimeFormat('en', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: learner?.profile.timezone ?? 'UTC',
                      }).format(new Date(event.createdAt))}
                    </span>
                  </div>
                  <span className="trace-mode">
                    {event.kind.startsWith('live.') || event.kind.startsWith('interest.')
                      ? 'Recorded action'
                      : 'Authored sample'}
                  </span>
                  <ArrowUpRight size={17} />
                </summary>
                <dl>
                  {Object.entries(event.detail).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd>
                        <Detail value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </div>
        ) : (
          <div className="saved-empty">
            <BookOpen size={22} />
            <p>
              {learner
                ? 'Your decisions will appear here as you begin a session.'
                : 'Create a guest path to see the actual decisions from your own learning sessions.'}
            </p>
            <Link href={learner ? '/discover' : '/start'} className="quiet-link">
              {learner ? 'Find a story' : 'Build my path'}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <section className="credits-note">
        <span className="eyebrow">Source & typography credits</span>
        <p>
          Original sample text is offered under CC0-1.0. Application code and original SVG
          illustrations are MIT licensed. No third-party media is included. Fraunces by Undercase
          Type and Source Sans 3 by Adobe are bundled locally under the SIL Open Font License.{' '}
          <a href="https://github.com/yadneshSalvi/qloo-immersion" target="_blank" rel="noreferrer">
            View the public source <ArrowUpRight size={13} />
          </a>
        </p>
      </section>
    </div>
  );
}
