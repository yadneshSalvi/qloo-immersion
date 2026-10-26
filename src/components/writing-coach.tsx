'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import type { Source } from '@/domain/types';
import type { RunView } from '@/domain/live';
import { Button } from './ui/button';
import { liveRequest, useLiveRun, isPending } from './live-api';
import { LiveRunStatus } from './live-run-status';
export function WritingCoach({ sessionId, source }: { sessionId: string; source: Source }) {
  const [answer, setAnswer] = useState('');
  const [consent, setConsent] = useState(false);
  const [availability, setAvailability] = useState<{
    remaining: number;
    available: boolean;
  } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const action = useLiveRun();
  const { setRun } = action;
  useEffect(() => {
    const controller = new AbortController();
    liveRequest<{ runs: RunView[]; remaining: number; available: boolean }>(
      `/api/practice/feedback?sessionId=${encodeURIComponent(sessionId)}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then((data) => {
        setAvailability({ remaining: data.remaining, available: data.available });
        setRun(data.runs[0] ?? null);
        setAnswer((current) => current || data.runs[0]?.submittedAnswer || '');
        setLoadError('');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError(
            'Writing feedback could not be loaded. Your story and fixed exercises are still available.',
          );
      });
    return () => controller.abort();
  }, [sessionId, setRun, reload]);
  const result =
    action.run?.state === 'succeeded' && action.run.result?.kind === 'coaching'
      ? action.run.result
      : null;
  const pending = action.busy || isPending(action.run);
  async function submit() {
    const run = await action.submit('/api/practice/feedback', {
      sessionId,
      answer: answer.trim(),
      consent: true,
    });
    if (run)
      setAvailability((current) =>
        current ? { ...current, remaining: Math.max(0, current.remaining - 1) } : current,
      );
  }
  return (
    <section className="writing-coach" aria-labelledby="writing-coach-heading">
      <div className="coach-heading">
        <Sparkles size={21} />
        <div>
          <span className="eyebrow">Optional / A thought of your own</span>
          <h2 id="writing-coach-heading">Make a little Spanish yours.</h2>
        </div>
        <span className="evidence-pill">AI writing feedback · unscored</span>
      </div>
      <p>
        After <span lang="es">{source.title}</span>, what would you tell a friend about this story?
        Give your opinion and one reason in Spanish.
      </p>
      <p className="fine-print">
        Try to {source.objective.charAt(0).toLowerCase() + source.objective.slice(1)}. Refer to a
        detail from the source.
      </p>
      {loadError ? (
        <div className="live-run has-error">
          <p role="alert">{loadError}</p>
          <button type="button" className="quiet-link" onClick={() => setReload((v) => v + 1)}>
            Try loading feedback again
          </button>
        </div>
      ) : !availability ? (
        <p role="status">Checking writing feedback availability…</p>
      ) : !availability.available && !result ? (
        <div className="live-unavailable">
          AI writing feedback is unavailable right now. You can continue your session and keep your
          own reflection.
        </div>
      ) : (
        <>
          <label className="field-label" htmlFor={`opinion-${sessionId}`}>
            Your opinion in Spanish
          </label>
          <textarea
            id={`opinion-${sessionId}`}
            lang="es"
            rows={4}
            value={answer}
            maxLength={800}
            disabled={pending || !availability.available || availability.remaining === 0}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Me gustaría… porque en la historia…"
          />
          <div className="coach-count">
            <span>Keep it short. A sentence or two is enough.</span>
            <span>{answer.length} / 800</span>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              disabled={pending || !availability.available || availability.remaining === 0}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to send this answer and the story context to the AI provider for writing
              feedback. This is separate from my comprehension results.
            </span>
          </label>
          <div className="button-row">
            <Button
              className="button-ink"
              disabled={
                !consent ||
                answer.trim().length < 5 ||
                pending ||
                !availability.available ||
                availability.remaining === 0
              }
              onClick={submit}
            >
              {pending
                ? 'Preparing your feedback…'
                : result
                  ? 'Get feedback on my revision'
                  : 'Get writing feedback'}
              <ArrowRight size={16} />
            </Button>
            <span className="fine-print">
              {availability.remaining} of 3 requests remaining for this session
            </span>
          </div>
          <LiveRunStatus {...action} onCancel={action.cancel} onCheck={action.resume} />
          {result && (
            <div className="coach-feedback" aria-live="polite">
              {action.run?.submittedAnswer && (
                <details className="coach-model">
                  <summary>Your submitted draft</summary>
                  <p lang="es">{action.run.submittedAnswer}</p>
                </details>
              )}
              <div className="coach-success">
                <span className="eyebrow">
                  {result.status === 'try-again' ? 'A useful next step' : 'Something that works'}
                </span>
                <p>{result.success}</p>
              </div>
              {result.corrections.slice(0, 2).map((correction, i) => (
                <div className="coach-correction" key={i}>
                  <span className="eyebrow">One small adjustment</span>
                  <div lang="es">
                    <del>{correction.before}</del>
                    <ArrowRight size={14} />
                    <strong>{correction.after}</strong>
                  </div>
                  <p>{correction.explanation}</p>
                </div>
              ))}
              {result.sourceEvidence.length > 0 && (
                <details open className="coach-source">
                  <summary>Back to the original story</summary>
                  {result.sourceEvidence.map((evidence) => (
                    <blockquote lang="es" key={evidence.segmentId}>
                      {evidence.quote}
                    </blockquote>
                  ))}
                </details>
              )}
              <details className="coach-model">
                <summary>See a generated example answer</summary>
                <p className="fine-print">
                  AI-generated example · a possible response, not part of the original story
                </p>
                <p lang="es">{result.modelAnswer}</p>
              </details>
              <div className="coach-next">
                <RefreshCw size={17} />
                <p>{result.nextPrompt}</p>
              </div>
              <p className="fine-print">
                AI suggestions can be imperfect. These comments do not change your fixed
                source-question results, working band, or a fluency score.
              </p>
            </div>
          )}
          {availability.remaining === 0 && (
            <p className="fine-print">
              You’ve used this session’s three feedback requests. Keep your notes, or continue to
              another story.
            </p>
          )}
        </>
      )}
    </section>
  );
}
