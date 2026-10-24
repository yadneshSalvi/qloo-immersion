import Link from 'next/link';
import { ArrowUpRight, BookOpen, Headphones, Clock3 } from 'lucide-react';
import type { Piece } from '@/domain/types';
import { clusterLabels } from '@/domain/types';
import { Artwork } from './artwork';
export function PieceCard({
  piece,
  route,
  reason,
}: {
  piece: Piece;
  route?: string;
  reason?: string;
}) {
  return (
    <article className="piece-card">
      {route && (
        <div className="route-label">
          <span>{route}</span>
          <span className="thin-rule" />
        </div>
      )}
      <Link
        className="card-art-link"
        href={`/piece/${piece.id}`}
        aria-label={`${piece.format === 'read' ? 'Read' : 'Read + listen'}: ${piece.title}`}
      >
        <Artwork cluster={piece.cluster} palette={piece.palette} />
        <span className="art-corner">
          <ArrowUpRight size={22} />
        </span>
        <span className="format-chip">
          {piece.format === 'read' ? <BookOpen size={14} /> : <Headphones size={14} />}{' '}
          {piece.format === 'read' ? 'Read' : 'Read + listen'}
        </span>
      </Link>
      <div className="card-meta">
        <span>{clusterLabels[piece.cluster]}</span>
        <span>{piece.country}</span>
      </div>
      <h3>
        <Link href={`/piece/${piece.id}`} lang="es">
          {piece.title}
        </Link>
      </h3>
      <p>{piece.subtitle}</p>
      <div className="card-bottom">
        <span>
          <Clock3 size={14} />
          {piece.minutes} min
        </span>
        <span>{piece.band} working band</span>
        <span className="sample-label">Original sample</span>
      </div>
      {reason && (
        <details className="why-detail">
          <summary>Why this piece?</summary>
          <p>{reason}</p>
        </details>
      )}
    </article>
  );
}
