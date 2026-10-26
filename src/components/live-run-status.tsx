'use client';
import { LoaderCircle, CheckCircle2, CircleHelp, X } from 'lucide-react';
import type { RunView } from '@/domain/live';
import { isPending } from './live-api';
export function LiveRunStatus({
  run,
  error,
  busy,
  onCancel,
  onCheck,
}: {
  run: RunView | null;
  error: string;
  busy: boolean;
  onCancel: () => void;
  onCheck: () => void;
}) {
  if (!run && !error && !busy) return null;
  const pending = isPending(run);
  return (
    <div className={`live-run ${run?.state === 'failed' || error ? 'has-error' : ''}`}>
      <div className="live-run-line" role="status" aria-live="polite">
        {pending || busy ? (
          <LoaderCircle size={17} className="live-spinner" />
        ) : run?.state === 'succeeded' ? (
          <CheckCircle2 size={17} />
        ) : (
          <CircleHelp size={17} />
        )}
        <span>
          {busy
            ? 'Saving your request…'
            : run?.state === 'cancelled'
              ? 'Request cancelled.'
              : run?.state === 'failed'
                ? (run.error?.message ?? 'This request could not finish. Please try again.')
                : pending
                  ? run?.state === 'queued'
                    ? 'Your request is queued.'
                    : run?.kind === 'resolution'
                      ? 'Looking for cultural matches…'
                      : run?.kind === 'discovery'
                        ? 'Checking cultural connections and available stories…'
                        : 'Preparing feedback from your story…'
                  : 'Your result is ready.'}
        </span>
        {pending && (
          <button type="button" onClick={onCancel} disabled={busy} className="quiet-link">
            <X size={14} /> Cancel
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {pending && error && (
        <button className="quiet-link" type="button" onClick={onCheck}>
          Check request status
        </button>
      )}
      {run && (
        <details className="live-trace">
          <summary>Request details</summary>
          <p>
            Request {run.id.slice(0, 8)} · {run.state}
          </p>
          <ol>
            {run.trace.map((item, index) => (
              <li key={`${item.at}-${index}`}>{item.summary}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
