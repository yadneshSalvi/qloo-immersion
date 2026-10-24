'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Lightbulb,
  CalendarDays,
  Feather,
} from 'lucide-react';
import type { ReviewView } from '@/domain/types';
import { Button } from './ui/button';
import { useCommand } from './client-api';
export function ReviewNotebook({
  initialItems,
  timezone,
}: {
  initialItems: ReviewView[];
  timezone: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{
    correct: boolean;
    word: string;
    note: string;
    dueAt: string;
    days: number;
    nextStage: number;
  } | null>(null);
  const [currentId, setCurrentId] = useState(initialItems.find((i) => i.due)?.id ?? null);
  const action = useCommand();
  const current = items.find((i) => i.id === currentId);
  const due = items.filter((i) => i.due);
  const completedThisVisit = initialItems.filter((i) => i.due).length - due.length;
  const date = (value: string) =>
    new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(value));
  async function submit() {
    if (!current || !answer.trim()) return;
    const response = await action.run({
      type: 'review',
      reviewId: current.id,
      expectedVersion: current.version,
      answer,
    });
    if (response?.review) {
      setResult(response.review);
      setItems(
        items.map((i) =>
          i.id === current.id
            ? {
                ...i,
                due: false,
                dueAt: response.review!.dueAt,
                stage: response.review!.nextStage,
                lastResult: response.review!.correct,
                version: i.version + 1,
              }
            : i,
        ),
      );
    }
  }
  function next() {
    setCurrentId(items.find((i) => i.due)?.id ?? null);
    setAnswer('');
    setResult(null);
  }
  return (
    <div className="container review-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your word notebook</span>
          <h1>A word worth coming back to.</h1>
          <p>Little pieces of language, still connected to the stories where you found them.</p>
        </div>
        <span className="review-due-pill">
          <span className="status-dot" />
          {due.length} ready to revisit
        </span>
      </div>
      <div className="review-layout">
        <section className="review-main">
          {current ? (
            <article className="review-card">
              <div className="review-card-top">
                <span className="eyebrow">Recall in context</span>
                <span>{completedThisVisit} revisited this visit</span>
              </div>
              <div className="review-origin">
                <BookOpen size={15} />
                <Link href={`/piece/${current.sourceId}`} lang="es">
                  {current.sourceTitle} <ArrowUpRight size={13} />
                </Link>
              </div>
              <span className="eyebrow review-question">How would you say…</span>
              <h2>{current.meaning}</h2>
              <p className="review-prompt">Recall the Spanish word or expression from the story.</p>
              <details className="context-hint">
                <summary>Bring back the scene</summary>
                <p>{current.context}</p>
              </details>
              <label className="sr-only" htmlFor="review-answer">
                Your Spanish answer
              </label>
              <div className="review-input">
                <input
                  id="review-answer"
                  autoComplete="off"
                  lang="es"
                  spellCheck={false}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !result) submit();
                  }}
                  disabled={!!result}
                  placeholder="The Spanish comes back as…"
                />
                {!result && (
                  <Button
                    className="button-ink"
                    onClick={submit}
                    disabled={action.busy || !answer.trim()}
                  >
                    Check recall <ArrowRight size={17} />
                  </Button>
                )}
              </div>
              {result && (
                <div
                  className={`answer-feedback ${result.correct ? 'correct' : 'needs-work'}`}
                  role="status"
                >
                  <span className="feedback-label">
                    {result.correct ? <CheckCircle2 size={19} /> : <Lightbulb size={19} />}{' '}
                    {result.correct
                      ? 'A familiar word, found again.'
                      : 'A word to meet again tomorrow.'}
                  </span>
                  <h3 lang="es">{result.word}</h3>
                  <p>{result.note}</p>
                  <div className="review-schedule">
                    <CalendarDays size={16} />
                    <span>
                      Next review: {date(result.dueAt)} · {result.days}{' '}
                      {result.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <Button className="button-ink" onClick={next}>
                    {due.length ? 'Next word' : 'Finish this visit'}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              )}
              {action.error && (
                <p className="error-message" role="alert">
                  {action.error}
                </p>
              )}
              <span className="review-card-footer">
                Fixed expression matching · accents are not penalized · source rights checked on
                each attempt
              </span>
            </article>
          ) : (
            <div className="notebook-empty">
              <Feather size={40} strokeWidth={1} />
              <span className="eyebrow">
                {items.length
                  ? 'A little space to let it settle'
                  : 'Your collection begins with one word'}
              </span>
              <h2>{items.length ? 'You’re up to date.' : 'Keep the words that catch you.'}</h2>
              <p>
                {items.length
                  ? 'Your words have their next review dates. Come back when they’re ready, or find a new story in the meantime.'
                  : 'Open a story and tap an underlined word. Save it here, then try recalling it in its original context.'}
              </p>
              <Link href="/discover" className="button button-primary">
                {items.length ? 'Find another story' : 'Explore the collection'}
                <ArrowRight size={17} />
              </Link>
              {items.length > 0 && (
                <span className="fine-print">
                  Next return:{' '}
                  {date([...items].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0].dueAt)}
                </span>
              )}
            </div>
          )}
        </section>
        <aside className="review-rail">
          <span className="eyebrow">A gentle rhythm</span>
          <h3>
            Meet it. Recall it.
            <br />
            Keep it close.
          </h3>
          <div className="review-intervals">
            {[1, 3, 7, 14].map((d, i) => (
              <div key={d}>
                <span>{i + 1}</span>
                <strong>{d}</strong>
                <small>{d === 1 ? 'day' : 'days'}</small>
              </div>
            ))}
          </div>
          <p>Successful recall moves to the next interval. A missed word returns in one day.</p>
          <p className="fine-print">
            This is a transparent scheduling policy, not a measured claim of optimal retention.
            Times are shown in {timezone.replaceAll('_', ' ')}.
          </p>
        </aside>
      </div>
      {items.length > 0 && (
        <section className="saved-words">
          <div className="section-heading">
            <h2>Your growing collection.</h2>
            <span className="fine-print">
              {items.length} saved {items.length === 1 ? 'expression' : 'expressions'}
            </span>
          </div>
          <div className="word-table">
            <div className="word-table-head">
              <span>Meaning to recall</span>
              <span>Found in</span>
              <span>Next visit</span>
            </div>
            {items.map((item) => (
              <div className="word-table-row" key={item.id}>
                <strong>{item.meaning}</strong>
                <Link href={`/piece/${item.sourceId}`} lang="es">
                  {item.sourceTitle}
                  <ArrowUpRight size={13} />
                </Link>
                <span>
                  {item.due ? (
                    <>
                      <span className="status-dot" />
                      Ready now
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      {date(item.dueAt)}
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
