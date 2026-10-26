'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import type { DiscoveryResult, LiveOverview, DiscoveryEvidence } from '@/domain/live';
import { Button } from './ui/button';
import { useLiveRun, isPending, liveRequest } from './live-api';
import { LiveRunStatus } from './live-run-status';
export function DiscoveryConnection({
  overview: initialOverview,
  signedIn,
  children,
}: {
  overview?: LiveOverview | null;
  signedIn: boolean;
  children: (result: DiscoveryResult | null) => React.ReactNode;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const action = useLiveRun(initialOverview?.latestDiscovery ?? null);
  const { setRun } = action;
  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    liveRequest<LiveOverview>('/api/interests', undefined, 'GET', controller.signal)
      .then((next) => {
        setOverview(next);
        setRun((current) => current ?? next.latestDiscovery);
      })
      .catch(() => {
        /* Keep the server-rendered state when offline. */
      });
    return () => controller.abort();
  }, [signedIn, setRun]);
  const result =
    action.run?.state === 'succeeded' && action.run.result?.kind === 'discovery'
      ? action.run.result
      : null;
  return (
    <>
      <section className="connection-banner" aria-label="Cultural discovery">
        <div className="connection-title">
          <Sparkles size={20} />
          <div>
            <span className="eyebrow">Follow a cultural connection</span>
            <h2>{result ? 'A thread from your world.' : 'Let your favorites open a door.'}</h2>
            <p>
              {result
                ? `${result.mode === 'cached' ? 'Cached' : 'Live'} Qloo cultural ranking → editorial themes → original Spanish stories.`
                : !signedIn
                  ? 'Create a path to confirm a favorite and request cultural connections. The original collection is ready to explore.'
                  : overview?.qlooAvailable
                    ? 'Confirm a favorite to discover film connections, then follow an editorial theme into Spanish.'
                    : 'Taste discovery is unavailable. You can still explore our editorial collection and continue saved lessons.'}
            </p>
          </div>
        </div>
        {overview?.qlooAvailable && overview.interests.length > 0 ? (
          <Button
            variant="secondary"
            disabled={action.busy || isPending(action.run)}
            onClick={() =>
              action.submit('/api/discovery/runs', { expectedVersion: overview.profileVersion })
            }
          >
            Refresh my connections <ArrowRight size={16} />
          </Button>
        ) : (
          <Link className="button button-secondary" href={signedIn ? '/taste' : '/start'}>
            {signedIn ? 'Confirm a favorite' : 'Build my path'}
            <ArrowRight size={16} />
          </Link>
        )}
        <div className="connection-run">
          <LiveRunStatus {...action} onCancel={action.cancel} onCheck={action.resume} />
        </div>
      </section>
      {children(result)}
    </>
  );
}
export function DiscoveryComparison({ result }: { result: DiscoveryResult }) {
  return (
    <details className="discovery-comparison">
      <summary>
        <Sparkles size={16} /> See how the order changed{' '}
        <span className="evidence-pill">
          {result.mode === 'live' ? 'Live Qloo' : 'Cached Qloo'}
        </span>
      </summary>
      <div className="comparison-content">
        <h3>Two orders. The same eligible shortlist.</h3>
        <p>
          {result.comparison.candidateCount} candidates · {result.comparison.changedPositions}{' '}
          changed positions ·{' '}
          {result.comparison.sameFirstChoice ? 'Same first choice' : 'Different first choice'}. This
          compares ranking; it is not evidence of learning gain or causal lift.
        </p>
        <div className="comparison-columns">
          {[
            { title: 'Editorial baseline', items: result.comparison.baseline },
            { title: 'Qloo-informed order', items: result.comparison.qloo },
          ].map((column) => (
            <div key={column.title}>
              <h4>{column.title}</h4>
              <ol>
                {column.items.map((item) => (
                  <li key={item.pieceId}>
                    <Link href={`/piece/${item.pieceId}`}>
                      <span lang="es">{item.title}</span>
                      <ArrowUpRight size={13} />
                    </Link>
                    <small>Film connection: {item.anchorName}</small>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="fine-print">{result.comparison.policy}</p>
        {result.notes.map((note, i) => (
          <p className="fine-print" key={i}>
            {note}
          </p>
        ))}
        <p className="fine-print">
          Evidence checked{' '}
          {new Date(result.evidenceAt).toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })}
          . Qloo supplies cultural affinity. IMMERSION authors the stories and editorial theme
          mapping; affinity supplies neither source permission nor CEFR assessment.
        </p>
      </div>
    </details>
  );
}

export function LiveStudyPlan({
  evidence,
  mode,
}: {
  evidence: DiscoveryEvidence;
  mode: 'ai' | 'deterministic';
}) {
  if (!evidence.studyFocus && !evidence.warmupQuestion) return null;
  return (
    <div className="live-study-plan">
      <span className="eyebrow">
        {mode === 'ai' ? 'AI-assisted study invitation' : 'Editorial study invitation'}
      </span>
      {evidence.studyFocus && <p>{evidence.studyFocus}</p>}
      {evidence.warmupQuestion && <p className="study-warmup">{evidence.warmupQuestion}</p>}
      {evidence.sourceQuote && (
        <details>
          <summary>A glimpse of the original source</summary>
          <blockquote lang="es">{evidence.sourceQuote}</blockquote>
        </details>
      )}
      <span className="fine-print">Study guidance is separate from Qloo’s cultural ranking.</span>
    </div>
  );
}
