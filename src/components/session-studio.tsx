'use client';
import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  BookmarkPlus,
  Languages,
  Lightbulb,
  ArrowUpRight,
  CircleHelp,
  Leaf,
  RefreshCw,
  Volume2,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Artwork } from './artwork';
import { WritingCoach } from './writing-coach';
import { SpeechPlayer } from './speech-player';
import { useCommand } from './client-api';
import type { SessionView, GlossaryTerm } from '@/domain/types';
import type { TasteFeedback } from '@/domain/learning';
function HighlightedText({
  text,
  words,
  onWord,
}: {
  text: string;
  words: GlossaryTerm[];
  onWord: (id: string) => void;
}) {
  const matches: { start: number; end: number; word: GlossaryTerm }[] = [];
  for (const word of words) {
    const start = text.toLocaleLowerCase('es').indexOf(word.word.toLocaleLowerCase('es'));
    if (start >= 0 && !matches.some((m) => start < m.end && start + word.word.length > m.start))
      matches.push({ start, end: start + word.word.length, word });
  }
  matches.sort((a, b) => a.start - b.start);
  let from = 0;
  const nodes: React.ReactNode[] = [];
  for (const match of matches) {
    nodes.push(text.slice(from, match.start));
    nodes.push(
      <button
        key={match.word.id}
        className="inline-word"
        onClick={() => onWord(match.word.id)}
        aria-label={`Meaning of ${match.word.word}`}
      >
        {text.slice(match.start, match.end)}
      </button>,
    );
    from = match.end;
  }
  nodes.push(text.slice(from));
  return <>{nodes}</>;
}
export function SessionStudio({ initialSession }: { initialSession: SessionView }) {
  const [session, setSession] = useState(initialSession);
  const [audioSegmentId, setAudioSegmentId] = useState<string | null>(null);
  const [audioSeekToken, setAudioSeekToken] = useState(0);
  const [translation, setTranslation] = useState(initialSession.support !== 'independent');
  const [selectedWord, setSelectedWord] = useState(initialSession.piece.glossary[0]?.id ?? '');
  const [questionIndex, setQuestionIndex] = useState(
    initialSession.responses.filter(
      (r) =>
        initialSession.assessments.find((a) => a.id === r.assessmentId)?.kind === 'comprehension',
    ).length,
  );
  const [choice, setChoice] = useState('');
  const [practiceText, setPracticeText] = useState(
    initialSession.responses.find(
      (r) => initialSession.assessments.find((a) => a.id === r.assessmentId)?.kind === 'practice',
    )?.answer ?? '',
  );
  const [retryPractice, setRetryPractice] = useState(false);
  const [reflect, setReflect] = useState(false);
  const [taste, setTaste] = useState<TasteFeedback | null>(null);
  const [difficulty, setDifficulty] = useState<'comfortable' | 'some-help' | 'hard' | null>(null);
  const [consent, setConsent] = useState(true);
  const [note, setNote] = useState(initialSession.note);
  const action = useCommand();
  const router = useRouter();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const wordTrigger = useRef<HTMLElement | null>(null);
  function openWord(id: string) {
    setSelectedWord(id);
    if (window.matchMedia('(max-width:680px)').matches) {
      wordTrigger.current = document.activeElement as HTMLElement;
      setGlossaryOpen(true);
    }
  }
  const source = session.piece;
  const segment = source.segments[session.position];
  const word = source.glossary.find((w) => w.id === selectedWord) ?? source.glossary[0];
  const questions = session.assessments.filter((a) => a.kind === 'comprehension');
  const practice = session.assessments.find((a) => a.kind === 'practice')!;
  const practiceResult = session.responses.find((r) => r.assessmentId === practice.id);
  const question = questions[Math.min(questionIndex, questions.length - 1)];
  const questionResult = question && session.responses.find((r) => r.assessmentId === question.id);
  const allAnswered = questions.every((q) =>
    session.responses.some((r) => r.assessmentId === q.id),
  );
  const inReflection = reflect && allAnswered && !!practiceResult;
  const questionCorrect = session.responses.filter(
    (r) => r.correct && questions.some((q) => q.id === r.assessmentId),
  ).length;
  async function run(command: Parameters<typeof action.run>[0]) {
    const result = await action.run(command);
    if (result?.session) setSession(result.session);
    return result;
  }
  async function position(index: number) {
    if (
      await run({
        type: 'position',
        sessionId: session.id,
        expectedVersion: session.version,
        position: index,
      })
    ) {
      setAudioSeekToken((value) => value + 1);
      setSelectedWord(
        source.glossary.find((w) => w.segmentId === source.segments[index].id)?.id ??
          source.glossary[0].id,
      );
    }
  }
  async function submitAnswer() {
    if (!choice) return;
    await run({
      type: 'answer',
      sessionId: session.id,
      expectedVersion: session.version,
      assessmentId: question.id,
      answer: choice,
    });
  }
  async function submitPractice() {
    if (!practiceText.trim()) return;
    const result = await run({
      type: 'answer',
      sessionId: session.id,
      expectedVersion: session.version,
      assessmentId: practice.id,
      answer: practiceText,
    });
    if (result) setRetryPractice(false);
  }
  async function complete() {
    if (!taste || !difficulty) return;
    const result = await run({
      type: 'complete',
      sessionId: session.id,
      expectedVersion: session.version,
      taste,
      difficulty,
      consent,
      note,
    });
    if (result) router.refresh();
  }
  const stage =
    session.state === 'completed' ? 3 : session.state === 'active' ? 0 : inReflection ? 2 : 1;
  return (
    <div className="studio-wrap">
      <div className="studio-top container">
        <Link href={`/piece/${source.id}`} className="back-link">
          <ArrowLeft size={15} />
          <span lang="es">{source.title}</span>
        </Link>
        <span className="save-status">
          <span className="status-dot" />
          {action.busy ? 'Saving…' : action.error ? 'Change not confirmed' : 'Your place is saved'}
        </span>
      </div>
      <div className="studio-progress container" aria-label="Learning session progress">
        {['Explore the story', 'Use the language', 'Take it with you'].map((label, i) => (
          <div key={label} className={stage === i ? 'active' : stage > i ? 'complete' : ''}>
            <span>{stage > i ? <Check size={13} /> : String(i + 1).padStart(2, '0')}</span>
            {label}
          </div>
        ))}
      </div>
      {session.state === 'completed' ? (
        <section className="completion container">
          <div className="completion-art">
            <Artwork cluster={source.cluster} palette={source.palette} />
            <div className="completion-check">
              <Check size={28} />
            </div>
          </div>
          <div className="completion-copy">
            <span className="eyebrow">One story, a little closer</span>
            <h1>
              Something to
              <br />
              <em>take with you.</em>
            </h1>
            <p>
              You finished <span lang="es">{source.title}</span>. A small part of your day, now part
              of your Spanish.
            </p>
            <div className="completion-stats">
              <div>
                <strong>
                  {questionCorrect}
                  <span> / {questions.length}</span>
                </strong>
                <span>source questions correct</span>
              </div>
              <div>
                <strong>{session.savedWordIds.length}</strong>
                <span>words saved for review</span>
              </div>
              <div>
                <strong>{source.band}</strong>
                <span>working band unchanged</span>
              </div>
            </div>
            {session.feedback?.adaptation ? (
              <div className="completion-next">
                <Leaf size={22} />
                <div>
                  <span className="eyebrow">Your next chapter</span>
                  <h3>{session.feedback.adaptation.reason}</h3>
                  <p>Your interest and your source answers were considered separately.</p>
                </div>
              </div>
            ) : (
              <div className="completion-next">
                <CheckCircle2 size={21} />
                <div>
                  <h3>Your path stays as you chose it.</h3>
                  <p>Your feedback is saved. You chose not to adapt your next recommendations.</p>
                </div>
              </div>
            )}
            <div className="button-row">
              <Link
                className="button button-primary"
                href={session.savedWordIds.length ? '/review' : '/discover'}
              >
                {session.savedWordIds.length ? 'Visit my word notebook' : 'Find another story'}
                <ArrowRight size={17} />
              </Link>
              <Link className="quiet-link" href="/discover">
                Keep exploring <ArrowUpRight size={16} />
              </Link>
            </div>
            <Link href="/evidence" className="completion-evidence">
              See the actual adaptation record <ArrowUpRight size={13} />
            </Link>
            <p className="fine-print">
              These are results on sample exercises, not a certified level or measured learning
              gain.
            </p>
          </div>
        </section>
      ) : session.state === 'active' ? (
        <div className="reading-layout container">
          <article className="reading-canvas">
            <div className="reading-eyebrow">
              <span>THE ORIGINAL COLLECTION / {source.issue}</span>
              <span>
                {source.band} · {source.country}
              </span>
            </div>
            <h1 lang="es">{source.title}</h1>
            <p className="reading-deck">{source.subtitle}</p>
            <div className="reading-toolbar">
              <span>
                <BookOpen size={15} />
                {source.wordCount} words · 3 passages
              </span>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setTranslation(!translation)}
                aria-pressed={translation}
              >
                <Languages size={17} />
                {translation ? 'Hide English' : 'Show English'}
              </Button>
            </div>
            <SpeechPlayer
              text={segment.text}
              sessionId={session.id}
              segmentId={segment.id}
              seekToken={audioSeekToken}
              onSegmentChange={setAudioSegmentId}
            />
            <div className="passage-tabs" role="group" aria-label="Source passages">
              {source.segments.map((s, i) => (
                <button
                  type="button"
                  key={s.id}
                  aria-pressed={session.position === i}
                  aria-current={audioSegmentId === s.id ? 'true' : undefined}
                  data-audio-current={audioSegmentId === s.id || undefined}
                  onClick={() => position(i)}
                  disabled={action.busy}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span lang="es">{s.label}</span>
                  {audioSegmentId === s.id && (
                    <Volume2 size={13} aria-label="Current audio passage" />
                  )}
                </button>
              ))}
            </div>
            <section className="source-passage" aria-label={`Passage ${session.position + 1}`}>
              <span className="eyebrow">
                {String(session.position + 1).padStart(2, '0')} /{' '}
                <span lang="es">{segment.label}</span>
              </span>
              <p className="spanish-text" lang="es">
                <HighlightedText
                  text={segment.text}
                  words={source.glossary.filter((w) => w.segmentId === segment.id)}
                  onWord={openWord}
                />
              </p>
              {translation && (
                <div className="translation">
                  <span className="eyebrow">English translation · sample</span>
                  <p>{segment.translation}</p>
                </div>
              )}
            </section>
            <div className="reading-bottom">
              <p>
                <span className="word-demo">underlined words</span> have a meaning to explore.
              </p>
              {session.position < source.segments.length - 1 ? (
                <Button
                  className="button-ink"
                  onClick={() => position(session.position + 1)}
                  disabled={action.busy}
                >
                  Next passage <ArrowRight size={17} />
                </Button>
              ) : (
                <Button
                  className="button-ink"
                  onClick={() =>
                    run({
                      type: 'begin-practice',
                      sessionId: session.id,
                      expectedVersion: session.version,
                    })
                  }
                  disabled={action.busy}
                >
                  I’ve read the story. Let’s practice <ArrowRight size={17} />
                </Button>
              )}
            </div>
            <div className="source-disclosure">
              Original fictional sample · Written with AI assistance · Educator review pending
            </div>
          </article>
          <aside className="reading-rail">
            <div className="rail-art">
              <Artwork cluster={source.cluster} palette={source.palette} />
            </div>
            <div className="glossary-card" aria-live="polite">
              <div className="eyebrow">
                <span className="tiny-star">✳</span> Meaning here
              </div>
              <h2 lang="es">{word.word}</h2>
              <p className="word-meaning">{word.meaning}</p>
              <p>{word.note}</p>
              <Button
                variant="secondary"
                onClick={() => run({ type: 'save-word', sessionId: session.id, termId: word.id })}
                disabled={action.busy || session.savedWordIds.includes(word.id)}
              >
                {session.savedWordIds.includes(word.id) ? (
                  <Check size={16} />
                ) : (
                  <BookmarkPlus size={16} />
                )}{' '}
                {session.savedWordIds.includes(word.id) ? 'In your notebook' : 'Save for review'}
              </Button>
              <span className="fine-print">First recall is available as soon as you save.</span>
            </div>
            <div className="word-list">
              <span className="eyebrow">Words from this story</span>
              {source.glossary.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWord(w.id)}
                  aria-pressed={word.id === w.id}
                >
                  <span lang="es">{w.word}</span>
                  {session.savedWordIds.includes(w.id) ? (
                    <Check size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}
                </button>
              ))}
            </div>
            <div className="rail-note">
              <Lightbulb size={18} />
              <p>
                {session.support === 'extra'
                  ? 'Take one passage at a time. Listen slowly, then read with the translation.'
                  : 'You don’t need every word. Begin with the people, the place, and what changes.'}
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="practice-layout container">
          <aside className="practice-aside">
            <div className="eyebrow">From the story, into your Spanish</div>
            <h2>
              {inReflection
                ? 'Two different questions.'
                : 'A little understanding. A little practice.'}
            </h2>
            <Artwork cluster={source.cluster} palette={source.palette} />
            <details className="practice-source">
              <summary>
                <BookOpen size={16} />
                Keep the source close
              </summary>
              {source.segments.map((s, i) => (
                <div key={s.id}>
                  <strong>
                    {i + 1}. <span lang="es">{s.label}</span>
                  </strong>
                  <p lang="es">{s.text}</p>
                </div>
              ))}
            </details>
            <div className="rail-note">
              <CircleHelp size={17} />
              <p>
                The three source questions use a fixed answer key. Your language exercise and
                personal reflection don’t change the comprehension score.
              </p>
            </div>
          </aside>
          <article className="practice-canvas">
            {inReflection ? (
              <>
                <span className="eyebrow">Take it with you</span>
                <h1>What stays with you?</h1>
                <p className="lead">
                  How you felt about the story and how much you understood are different things.
                </p>
                <div className="observed-score">
                  <CheckCircle2 size={18} />
                  <span>
                    {questionCorrect} of {questions.length} source questions correct
                  </span>
                  <span>Sample assessment</span>
                </div>
                <fieldset className="feedback-group">
                  <legend>Would you choose more like this?</legend>
                  <div className="feedback-options">
                    {(
                      [
                        {
                          value: 'more',
                          label: 'More like this',
                          sub: 'Keep this cultural thread',
                        },
                        {
                          value: 'different',
                          label: 'Something different',
                          sub: 'Explore another direction',
                        },
                        {
                          value: 'unsure',
                          label: 'I’m not sure yet',
                          sub: 'Keep some room to explore',
                        },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={taste === o.value}
                        onClick={() => setTaste(o.value)}
                      >
                        <span>{o.label}</span>
                        <small>{o.sub}</small>
                        {taste === o.value && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="feedback-group">
                  <legend>How much could you follow?</legend>
                  <div className="feedback-options">
                    {(
                      [
                        {
                          value: 'comfortable',
                          label: 'Comfortably',
                          sub: 'I followed most of the story',
                        },
                        {
                          value: 'some-help',
                          label: 'With some help',
                          sub: 'The meanings and English helped',
                        },
                        {
                          value: 'hard',
                          label: 'I needed more support',
                          sub: 'It was a stretch today',
                        },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={difficulty === o.value}
                        onClick={() => setDifficulty(o.value)}
                      >
                        <span>{o.label}</span>
                        <small>{o.sub}</small>
                        {difficulty === o.value && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="reflection-field">
                  <label htmlFor="reflection">
                    One thought in Spanish <span>Optional · unscored</span>
                  </label>
                  <p className="fine-print">
                    What would you tell a friend about this story? Try “Me gusta…” or “Me gustaría…”
                    and add a reason.
                  </p>
                  <textarea
                    id="reflection"
                    value={note}
                    maxLength={1000}
                    rows={3}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Me gustaría… porque…"
                  />
                  <p className="fine-print">
                    Saved with this session when you complete it. Optional AI writing feedback is a
                    separate activity, with its own processing consent.
                  </p>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>Use my interests and source answers to shape my next piece.</span>
                </label>
                <Button
                  className="button-ink"
                  onClick={complete}
                  disabled={action.busy || !taste || !difficulty}
                >
                  {action.busy ? 'Saving your session…' : 'Complete my session'}
                  <ArrowRight size={17} />
                </Button>
              </>
            ) : questionIndex < questions.length ? (
              <>
                <span className="eyebrow">
                  Understand the story · {questionIndex + 1} of {questions.length}
                </span>
                <h1>{question.prompt}</h1>
                <p className="question-context">
                  Choose the answer supported by the source. You can look back at the text.
                </p>
                <div className="answer-options" role="group" aria-label="Answer choices">
                  {question.options.map((option, i) => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={(questionResult?.answer ?? choice) === option.id}
                      disabled={!!questionResult || action.busy}
                      onClick={() => setChoice(option.id)}
                    >
                      <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{option.text}</span>
                      {(questionResult?.answer ?? choice) === option.id && <Check size={18} />}
                    </button>
                  ))}
                </div>
                {questionResult ? (
                  <div
                    className={`answer-feedback ${questionResult.correct ? 'correct' : 'needs-work'}`}
                    role="status"
                  >
                    <span className="feedback-label">
                      {questionResult.correct ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Lightbulb size={18} />
                      )}{' '}
                      {questionResult.correct
                        ? 'You found the detail.'
                        : 'A useful detail to notice.'}
                    </span>
                    <p>{questionResult.feedback}</p>
                    <details>
                      <summary>See the source behind this answer</summary>
                      <blockquote lang="es">{questionResult.sourceQuote}</blockquote>
                    </details>
                    <Button
                      className="button-ink"
                      onClick={() => {
                        setQuestionIndex(questionIndex + 1);
                        setChoice('');
                      }}
                    >
                      {questionIndex === questions.length - 1
                        ? 'Try a little Spanish'
                        : 'Next question'}
                      <ArrowRight size={17} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <details className="hint-detail">
                      <summary>Need a small hint?</summary>
                      <p>{question.hint}</p>
                    </details>
                    <Button
                      className="button-ink"
                      onClick={submitAnswer}
                      disabled={!choice || action.busy}
                    >
                      {action.busy ? 'Saving your answer…' : 'Check my answer'}
                      <ArrowRight size={17} />
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="eyebrow">Use the language · One small expression</span>
                <h1>A phrase you can keep.</h1>
                <p className="practice-prompt" lang="es">
                  {practice.prompt}
                </p>
                <label className="field-label" htmlFor="practice-answer">
                  Your missing word
                </label>
                <div className="practice-input">
                  <input
                    id="practice-answer"
                    lang="es"
                    autoComplete="off"
                    spellCheck={false}
                    value={practiceText}
                    onChange={(e) => setPracticeText(e.target.value)}
                    disabled={!!practiceResult && !retryPractice}
                    placeholder="Write one word…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (!practiceResult || retryPractice)) submitPractice();
                    }}
                  />
                  {(!practiceResult || retryPractice) && (
                    <Button
                      className="button-ink"
                      onClick={submitPractice}
                      disabled={!practiceText.trim() || action.busy}
                    >
                      Check <ArrowRight size={16} />
                    </Button>
                  )}
                </div>
                {practiceResult && !retryPractice ? (
                  <div
                    className={`answer-feedback ${practiceResult.correct ? 'correct' : 'needs-work'}`}
                    role="status"
                  >
                    <span className="feedback-label">
                      {practiceResult.correct ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Lightbulb size={18} />
                      )}{' '}
                      {practiceResult.correct
                        ? 'That expression fits.'
                        : 'Here’s the expression to keep.'}
                    </span>
                    <p>{practiceResult.feedback}</p>
                    <div className="button-row">
                      {!practiceResult.correct && practiceResult.attempts < 3 && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setRetryPractice(true);
                            setPracticeText('');
                          }}
                        >
                          <RefreshCw size={15} />
                          Try again
                        </Button>
                      )}
                      <Button className="button-ink" onClick={() => setReflect(true)}>
                        Reflect on the story <ArrowRight size={17} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <details className="hint-detail">
                    <summary>A small hint</summary>
                    <p>{practice.hint}</p>
                  </details>
                )}
                <p className="fine-print practice-limit">
                  This bounded exercise recognizes the authored answer and minor accent differences.
                  It is separate from your three source-question results.
                </p>
              </>
            )}
          </article>
        </div>
      )}
      {session.state !== 'active' &&
        ((allAnswered && practiceResult) || session.state === 'completed') && (
          <div className="container coaching-container">
            <WritingCoach sessionId={session.id} source={source} />
          </div>
        )}
      <Dialog.Root open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content glossary-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              wordTrigger.current?.focus();
            }}
          >
            <div className="eyebrow">Meaning here · from this story</div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close word meaning"
                className="glossary-close"
              >
                <X size={18} />
              </Button>
            </Dialog.Close>
            <Dialog.Title lang="es">{word.word}</Dialog.Title>
            <p className="word-meaning">{word.meaning}</p>
            <Dialog.Description>{word.note}</Dialog.Description>
            <Button
              variant="secondary"
              onClick={() => run({ type: 'save-word', sessionId: session.id, termId: word.id })}
              disabled={action.busy || session.savedWordIds.includes(word.id)}
            >
              {session.savedWordIds.includes(word.id) ? (
                <Check size={16} />
              ) : (
                <BookmarkPlus size={16} />
              )}{' '}
              {session.savedWordIds.includes(word.id) ? 'In your notebook' : 'Save for review'}
            </Button>
            <p className="fine-print">
              Keep it connected to its story. Your first recall is available as soon as you save.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {action.error && (
        <div className="studio-error container" role="alert">
          <p>{action.error}</p>
          <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
            Reload saved progress
          </Button>
        </div>
      )}
    </div>
  );
}
