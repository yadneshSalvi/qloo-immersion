'use client';
import { useState } from 'react';
import type { DiscoveryResult, LiveOverview } from '@/domain/live';
import { DiscoveryConnection, DiscoveryComparison, LiveStudyPlan } from './live-discovery';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Headphones,
  Clock3,
  SlidersHorizontal,
  Search,
  X,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { Artwork } from './artwork';
import { PieceCard } from './piece-card';
import { Button } from './ui/button';
import { useCommand } from './client-api';
import {
  clusters,
  clusterLabels,
  type Cluster,
  type Piece,
  type Learner,
  type DiscoveryCard,
} from '@/domain/types';
interface DiscoveryProps {
  catalog: Piece[];
  learner: Learner | null;
  routes: DiscoveryCard[];
  bookmarks: string[];
  resume: { id: string; title: string; state: string } | null;
  liveOverview?: LiveOverview | null;
}
export function Discovery(props: DiscoveryProps) {
  return (
    <DiscoveryConnection overview={props.liveOverview} signedIn={!!props.learner}>
      {(result) => <DiscoveryContent {...props} liveResult={result} />}
    </DiscoveryConnection>
  );
}
function DiscoveryContent({
  catalog,
  learner,
  routes: editorialRoutes,
  liveResult,
  bookmarks: initialBookmarks,
  resume,
}: DiscoveryProps & { liveResult: DiscoveryResult | null }) {
  const routes = liveResult?.recommendations.length ? liveResult.recommendations : editorialRoutes;
  const [cluster, setCluster] = useState<Cluster | 'all'>('all');
  const [format, setFormat] = useState('all');
  const [band, setBand] = useState('all');
  const [search, setSearch] = useState('');
  const [short, setShort] = useState(false);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const action = useCommand();
  const featured = routes[0]?.piece ?? catalog[0];
  const filtered = catalog.filter(
    (p) =>
      (cluster === 'all' || p.cluster === cluster) &&
      (format === 'all' || p.format === format) &&
      (band === 'all' || p.band === band) &&
      (!short || p.minutes <= 6) &&
      `${p.title} ${p.subtitle} ${p.country}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  async function bookmark() {
    if (!featured || !learner) return;
    const saved = !bookmarks.includes(featured.versionId);
    if (await action.run({ type: 'bookmark', versionId: featured.versionId, saved }))
      setBookmarks(
        saved
          ? [...bookmarks, featured.versionId]
          : bookmarks.filter((v) => v !== featured.versionId),
      );
  }
  return (
    <div className="container discover-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your daily invitation</span>
          <h1>
            {learner?.profile.name
              ? `A little curiosity, ${learner.profile.name}.`
              : 'Where will Spanish take you?'}
          </h1>
          <p>Choose a story. Stay for a feeling. Take a little language with you.</p>
        </div>
        <Link className="quiet-link" href={learner ? '/taste' : '/start'}>
          <SlidersHorizontal size={16} />
          {learner ? 'Your interests' : 'Make it yours'}
        </Link>
      </div>
      {resume && (
        <Link className="resume-banner" href={`/session/${resume.id}`}>
          <span>
            <span className="status-dot" />
            Your place is saved
          </span>
          <strong lang="es">{resume.title}</strong>
          <span>
            Pick up where you left off <ArrowRight size={16} />
          </span>
        </Link>
      )}
      {learner?.profile.adaptation && (
        <div className="adaptation-banner">
          <Sparkles size={18} />
          <div>
            <strong>{learner.profile.adaptation.reason}</strong>
            <span>
              From your last session · your {learner.profile.readingBand} reading /{' '}
              {learner.profile.listeningBand} listening working bands are unchanged.
            </span>
          </div>
          <Link href="/evidence">
            See why <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      {featured && (
        <section className="discovery-feature">
          <div className="feature-copy">
            <div className="eyebrow">
              <span className="tiny-star">✳</span>
              {routes[0]?.route ?? 'A place to begin'}
              <span className="issue-no">01 / 03</span>
            </div>
            <div className="feature-category">
              {clusterLabels[featured.cluster]} <span>·</span> {featured.country}
            </div>
            <h2 lang="es">{featured.title}</h2>
            <p className="feature-description">{featured.description}</p>
            <div className="piece-metadata">
              <span>
                {featured.format === 'read' ? <BookOpen size={16} /> : <Headphones size={16} />}{' '}
                {featured.format === 'read' ? 'Read' : 'Read + listen'}
              </span>
              <span>
                <Clock3 size={16} />
                {featured.minutes} min
              </span>
              <span className="band-tag">{featured.band} working band</span>
            </div>
            <div className="button-row">
              <Link href={`/piece/${featured.id}`} className="button button-ink">
                Step into the story <ArrowRight size={17} />
              </Link>
              {learner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={bookmark}
                  disabled={action.busy}
                  aria-label={
                    bookmarks.includes(featured.versionId)
                      ? 'Remove from saved pieces'
                      : 'Save piece for later'
                  }
                >
                  <Bookmark
                    size={19}
                    fill={bookmarks.includes(featured.versionId) ? 'currentColor' : 'none'}
                  />
                </Button>
              )}
            </div>
            <details className="why-detail on-paper">
              <summary>Why this piece?</summary>
              <p>
                {routes[0]?.reason ??
                  'An original sample selected by the IMMERSION collection order. Create your path to choose categories and a starting band.'}
              </p>
            </details>
            {liveResult?.recommendations[0] && (
              <div className="cultural-bridge">
                <span className="eyebrow">The connection, in three steps</span>
                <ol>
                  <li>
                    <span>Qloo film connection</span>
                    <strong>{liveResult.recommendations[0].evidence.anchorName}</strong>
                  </li>
                  <li>
                    <span>IMMERSION editorial theme</span>
                    <strong>{liveResult.recommendations[0].evidence.theme}</strong>
                  </li>
                  <li>
                    <span>Original Spanish story</span>
                    <strong lang="es">{featured.title}</strong>
                  </li>
                </ol>
                <p>{liveResult.recommendations[0].evidence.explanation}</p>
                <a
                  className="quiet-link"
                  href={liveResult.recommendations[0].evidence.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Film reference <ArrowUpRight size={13} />
                </a>
              </div>
            )}
            {liveResult?.recommendations[0] && (
              <LiveStudyPlan
                evidence={liveResult.recommendations[0].evidence}
                mode={liveResult.planning.mode}
              />
            )}
            <span className="feature-credit">Original sample · Educator review pending</span>
            {action.error && (
              <p role="alert" className="error-message">
                {action.error}
              </p>
            )}
          </div>
          <Link className="feature-art" href={`/piece/${featured.id}`}>
            <Artwork cluster={featured.cluster} palette={featured.palette} />
            <span className="sr-only">Explore {featured.title}. </span>
            <span className="art-caption">
              {featured.scene} <span>ORIGINAL ILLUSTRATION</span>
            </span>
          </Link>
        </section>
      )}
      <div className="discovery-status">
        <span>
          <span className="status-dot" />
          {liveResult
            ? `${liveResult.mode === 'live' ? 'Live' : 'Cached'} Qloo-informed discovery`
            : 'Editorial collection discovery'}
        </span>
        <p>
          {liveResult
            ? 'Cultural affinity shapes this order. Source eligibility and working bands are checked separately.'
            : 'Selected from your categories and working bands. Confirm favorites to request cultural discovery.'}
        </p>
        <Link href="/evidence">
          View evidence <ArrowUpRight size={14} />
        </Link>
      </div>
      {liveResult && <DiscoveryComparison result={liveResult} />}
      {routes.length > 1 && (
        <section className="other-routes">
          <div className="section-heading">
            <h2>Or follow another thread.</h2>
            <span className="fine-print">Curiosity doesn’t need a straight line.</span>
          </div>
          <div className="two-route-grid">
            {routes.slice(1).map((route) => (
              <Link key={route.piece.id} className="route-small" href={`/piece/${route.piece.id}`}>
                <Artwork cluster={route.piece.cluster} palette={route.piece.palette} />
                <div>
                  <span className="eyebrow">{route.route}</span>
                  <h3 lang="es">{route.piece.title}</h3>
                  <p>{route.piece.subtitle}</p>
                  <span className="route-meta">
                    {route.piece.country} · {route.piece.minutes} min · {route.piece.band}
                  </span>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="catalog-section" id="collection">
        <div className="section-heading">
          <div>
            <span className="eyebrow">The original collection</span>
            <h2>A world of small stories.</h2>
          </div>
          <span className="catalog-count">{catalog.length} pieces · 6 cultural threads</span>
        </div>
        <div className="category-tabs" role="group" aria-label="Filter by cultural category">
          <button onClick={() => setCluster('all')} aria-pressed={cluster === 'all'}>
            All stories
          </button>
          {clusters.map((c) => (
            <button key={c} onClick={() => setCluster(c)} aria-pressed={cluster === c}>
              {clusterLabels[c]}
            </button>
          ))}
        </div>
        <div className="catalog-filters">
          <label className="search-field">
            <Search size={17} />
            <span className="sr-only">Search the collection</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a story or a place…"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </label>
          <label className="select-field">
            <span className="sr-only">Format</span>
            <select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="all">All formats</option>
              <option value="read">Reading</option>
              <option value="listen">Read + listen</option>
            </select>
          </label>
          <label className="select-field">
            <span className="sr-only">Working band</span>
            <select
              aria-label="Working band"
              value={band}
              onChange={(e) => setBand(e.target.value)}
            >
              <option value="all">A2 + B1</option>
              <option>A2</option>
              <option>B1</option>
            </select>
          </label>
          <button className="filter-chip" onClick={() => setShort(!short)} aria-pressed={short}>
            <Clock3 size={14} />6 minutes or less
          </button>
        </div>
        {filtered.length ? (
          <div className="piece-grid">
            {filtered.map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <Search size={25} />
            <h3>No stories in this particular corner.</h3>
            <p>
              Try another format, working band, or a little more time. The source and rights
              requirements stay the same.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setCluster('all');
                setFormat('all');
                setBand('all');
                setSearch('');
                setShort(false);
              }}
            >
              Show the whole collection
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
