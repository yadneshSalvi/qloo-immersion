import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Headphones, Sparkles } from 'lucide-react';
import { Artwork } from '@/components/artwork';
import { PieceCard } from '@/components/piece-card';
import { getCatalog } from '@/server/store';
import { currentLearner } from '@/server/auth';
export default async function Home() {
  const [catalog, learner] = await Promise.all([getCatalog(), currentLearner()]);
  return (
    <>
      <section className="home-hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✳</span> A culture-first Spanish studio
          </div>
          <h1>
            Follow your
            <br />
            curiosity.
            <br />
            <em>Find your Spanish.</em>
          </h1>
          <p>
            Small stories. New perspectives. A language that becomes part of the things you love.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href={learner ? '/discover' : '/start'}>
              {learner ? 'Continue your path' : 'Build my path'} <ArrowRight size={18} />
            </Link>
            <Link className="quiet-link" href="/discover">
              Explore the collection <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="mini-line" /> For adults · Spanish A2–B1 working bands
          </div>
        </div>
        <div className="hero-editorial">
          <div className="editorial-tag">
            <span>THE ORIGINAL COLLECTION</span>
            <span>VOL. 01 / {catalog.length} PIECES</span>
          </div>
          <div className="hero-art">
            <Artwork cluster="food" palette="market" />
            <span className="vertical-label">AN INVITATION TO STAY A LITTLE LONGER</span>
          </div>
          <div className="editorial-caption">
            <div>
              <span className="eyebrow">Begin somewhere unexpected</span>
              <h2 lang="es">Una mesa en el mercado</h2>
            </div>
            <Link
              href="/piece/una-mesa-en-el-mercado"
              aria-label="Explore Una mesa en el mercado"
              className="round-link"
            >
              <ArrowUpRight />
            </Link>
          </div>
          <div className="paper-stamp">
            <span>LEARN THROUGH</span>
            <BookOpen size={25} strokeWidth={1} />
            <span>WHAT YOU LOVE</span>
          </div>
        </div>
      </section>
      <section className="promise-strip container">
        <p>
          A market conversation.
          <br />
          <em>A different way into Spanish.</em>
        </p>
        <div>
          <span>01</span>
          <h3>Find a thread</h3>
          <p>Choose the culture you’re curious about.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Spend a moment</h3>
          <p>Read, listen, and find meaning in context.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Take something with you</h3>
          <p>Use a little language. Return to it later.</p>
        </div>
      </section>
      <section className="collection-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A few doors to open</span>
            <h2>There’s a story in everything.</h2>
          </div>
          <Link className="quiet-link" href="/discover">
            All {catalog.length} pieces <ArrowRight size={17} />
          </Link>
        </div>
        <div className="piece-grid">
          {catalog
            .filter((p) =>
              ['el-cine-de-los-jueves', 'un-disco-para-la-tarde', 'la-silla-amarilla'].includes(
                p.id,
              ),
            )
            .map((piece) => (
              <PieceCard key={piece.id} piece={piece} />
            ))}
        </div>
      </section>
      <section className="home-note container">
        <Sparkles size={24} strokeWidth={1.2} />
        <div>
          <h2>Your interests lead. Your understanding sets the pace.</h2>
          <p>
            Enjoyed the topic but needed more help? Keep the thread and add support. Understood it
            but want something different? Take a new cultural direction.
          </p>
        </div>
        <Link href="/start" className="button button-secondary">
          Find my starting point <ArrowRight size={16} />
        </Link>
      </section>
      <section className="edition-note container">
        <div>
          <Headphones size={18} />
          <span>Reading, synthetic narration where available, and useful practice.</span>
        </div>
        <p>
          This edition contains original fictional samples, written with AI assistance. Educator
          review is pending. Confirm favorites to request cultural discovery; optional AI writing
          feedback requires your consent. <Link href="/evidence">See what’s working ↗</Link>
        </p>
      </section>
    </>
  );
}
