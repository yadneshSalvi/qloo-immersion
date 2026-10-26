'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Search, Sparkles, X, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
import { Artwork } from './artwork';
import { Onboarding } from './onboarding';
import { LiveRunStatus } from './live-run-status';
import { isPending, liveRequest, useLiveRun } from './live-api';
import { culturalTypes, type CulturalType, type LiveOverview } from '@/domain/live';
import type { Learner } from '@/domain/types';
const labels: Record<CulturalType, string> = {
  artist: 'Artist',
  movie: 'Film',
  book: 'Book',
  person: 'Person',
  brand: 'Brand',
  place: 'Place',
};
export function TasteStudio({
  learner,
  initialOverview,
}: {
  learner: Learner;
  initialOverview: LiveOverview;
}) {
  const router = useRouter();
  const [overview, setOverview] = useState(initialOverview);
  const previousSearch = initialOverview.latestResolution?.result;
  const [query, setQuery] = useState(
    previousSearch?.kind === 'resolution' ? previousSearch.query : '',
  );
  const [entityType, setEntityType] = useState<CulturalType>(
    previousSearch?.kind === 'resolution' ? previousSearch.entityType : 'movie',
  );
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const resolution = useLiveRun(initialOverview.latestResolution);
  const discovery = useLiveRun(
    isPending(initialOverview.latestDiscovery) ? initialOverview.latestDiscovery : null,
  );
  const { setRun: setResolution } = resolution;
  const { setRun: setDiscovery } = discovery;
  useEffect(() => {
    const controller = new AbortController();
    liveRequest<LiveOverview>('/api/interests', undefined, 'GET', controller.signal)
      .then((next) => {
        setOverview(next);
        setResolution((current) => current ?? next.latestResolution);
        setDiscovery(
          (current) => current ?? (isPending(next.latestDiscovery) ? next.latestDiscovery : null),
        );
      })
      .catch(() => {
        /* The server-rendered overview remains usable. */
      });
    return () => controller.abort();
  }, [setResolution, setDiscovery]);
  const result =
    resolution.run?.state === 'succeeded' && resolution.run.result?.kind === 'resolution'
      ? resolution.run.result
      : null;
  const locked =
    resolution.busy ||
    isPending(resolution.run) ||
    !!saving ||
    discovery.busy ||
    isPending(discovery.run);
  async function updateInterest(candidateId: string, remove = false) {
    if (locked) return;
    setSaving(candidateId);
    setError('');
    try {
      setOverview(
        await liveRequest<LiveOverview>(
          '/api/interests/confirm',
          {
            key: crypto.randomUUID(),
            ...(remove ? { entityId: candidateId } : { runId: resolution.run?.id, candidateId }),
          },
          remove ? 'DELETE' : 'POST',
        ),
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Your interest could not be saved. Please try again.',
      );
    } finally {
      setSaving('');
    }
  }
  async function discover() {
    const run = await discovery.submit('/api/discovery/runs', {
      expectedVersion: overview.profileVersion,
    });
    if (run) {
      router.push('/discover');
      router.refresh();
    }
  }
  return (
    <>
      <div className="container taste-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Your world, a new way in</span>
            <h1>Name something you love.</h1>
            <p>A film that stays with you. An artist on repeat. It doesn’t have to be Spanish.</p>
          </div>
          <Link className="quiet-link" href="/discover">
            Browse the collection <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="taste-layout">
          <section className="taste-main" aria-labelledby="favorite-heading">
            <span className="eyebrow">01 / Find a familiar thread</span>
            <h2 id="favorite-heading">Start with one favorite.</h2>
            <p>Choose the right match before it becomes part of your path.</p>
            {!overview.qlooAvailable && (
              <div className="live-unavailable">
                <CircleUnavailable />
                Taste discovery is unavailable right now. Your saved interests and the original
                collection are still here.
              </div>
            )}
            <form
              className="favorite-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim().length >= 2 && !locked)
                  resolution.submit('/api/interests/resolve', { query: query.trim(), entityType });
              }}
            >
              <label className="field-label" htmlFor="favorite-type">
                What kind of favorite?
              </label>
              <select
                id="favorite-type"
                value={entityType}
                disabled={locked}
                onChange={(e) => setEntityType(e.target.value as CulturalType)}
              >
                {culturalTypes.map((type) => (
                  <option value={type} key={type}>
                    {labels[type]}
                  </option>
                ))}
              </select>
              <label className="field-label" htmlFor="favorite-query">
                Name your favorite
              </label>
              <div className="input-action">
                <input
                  id="favorite-query"
                  placeholder="e.g. Spirited Away"
                  value={query}
                  maxLength={120}
                  disabled={locked}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button
                  type="submit"
                  disabled={!overview.qlooAvailable || query.trim().length < 2 || locked}
                >
                  <Search size={17} /> Find a match
                </Button>
              </div>
            </form>
            <LiveRunStatus
              {...resolution}
              onCancel={resolution.cancel}
              onCheck={resolution.resume}
            />
            {result && (
              <section className="candidate-section" aria-labelledby="candidate-heading">
                <div className="section-heading">
                  <h3 id="candidate-heading">Which one did you mean?</h3>
                  <span className="evidence-pill">
                    {result.mode === 'live' ? 'Live Qloo match' : 'Cached Qloo match'}
                  </span>
                </div>
                <p>Results for “{result.query}”. Nothing is added until you confirm.</p>
                {result.candidates.length ? (
                  <div className="candidate-list">
                    {result.candidates.map((candidate) => {
                      const confirmed = overview.interests.some(
                        (interest) => interest.entityId === candidate.entityId,
                      );
                      return (
                        <div className="candidate" key={candidate.entityId}>
                          <div className="candidate-symbol">
                            {labels[candidate.entityType].slice(0, 1)}
                          </div>
                          <div>
                            <strong>{candidate.name}</strong>
                            <span>
                              {labels[candidate.entityType]}
                              {candidate.disambiguation ? ` · ${candidate.disambiguation}` : ''}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="small"
                            disabled={locked || confirmed}
                            aria-label={
                              confirmed
                                ? `${candidate.name} is confirmed`
                                : `Confirm match for ${candidate.name}`
                            }
                            onClick={() => updateInterest(candidate.entityId)}
                          >
                            {confirmed ? (
                              <>
                                <Check size={15} /> Confirmed
                              </>
                            ) : saving === candidate.entityId ? (
                              'Saving…'
                            ) : (
                              'Confirm match'
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <Search size={22} />
                    <h3>We couldn’t match that yet.</h3>
                    <p>
                      Try a fuller name, another category, or another favorite. You can always
                      browse the collection.
                    </p>
                  </div>
                )}
                <p className="fine-print">
                  Evidence checked{' '}
                  {new Date(result.evidenceAt).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}{' '}
                  · Your confirmation identifies a favorite; it does not rate your Spanish.
                </p>
              </section>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </section>
          <aside className="taste-side">
            <div className="taste-art">
              <Artwork cluster="cinema" palette="cinema" />
            </div>
            <div className="taste-side-copy">
              <span className="eyebrow">02 / Make a connection</span>
              <h2>
                A familiar feeling.
                <br />
                <em>An original story.</em>
              </h2>
              <p>
                Qloo connects your confirmed favorites to films. Our editorial themes connect those
                films to original Spanish stories.
              </p>
              <div className="confirmed-interests">
                <h3>
                  Your confirmed interests <span>{overview.interests.length} / 3</span>
                </h3>
                {overview.interests.length ? (
                  <div className="chip-row">
                    {overview.interests.map((interest) => (
                      <button
                        type="button"
                        className="chip"
                        key={interest.entityId}
                        disabled={locked}
                        aria-label={`Remove confirmed interest ${interest.name}`}
                        onClick={() => updateInterest(interest.entityId, true)}
                      >
                        <Check size={13} />
                        {interest.name}
                        <X size={13} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="fine-print">
                    Your confirmed favorites will appear here. One is enough to begin.
                  </p>
                )}
              </div>
              <Button
                onClick={discover}
                disabled={!overview.qlooAvailable || !overview.interests.length || locked}
              >
                <Sparkles size={16} /> Find my cultural connections <ArrowRight size={16} />
              </Button>
              <LiveRunStatus
                {...discovery}
                onCancel={discovery.cancel}
                onCheck={discovery.resume}
              />
              <p className="fine-print">
                Your working bands and source permissions are checked separately from cultural
                affinity.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <details className="container taste-preferences">
        <summary>Adjust your starting bands, support & cultural threads</summary>
        <Onboarding learner={learner} />
      </details>
    </>
  );
}
function CircleUnavailable() {
  return <span className="status-dot" />;
}
