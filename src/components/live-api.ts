'use client';
import { useEffect, useRef, useState } from 'react';
import type { RunView } from '@/domain/live';

export async function liveRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  method = 'POST',
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: body ? method : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'The service could not be reached. Your choices are still here; please try again.',
    );
  }
  if (!response.ok)
    throw new Error(
      data.error?.message ?? 'This request could not be completed. Please try again.',
    );
  return data as T;
}
export function isPending(run: RunView | null) {
  return run?.state === 'queued' || run?.state === 'running';
}
export function useLiveRun(initial: RunView | null = null) {
  const [run, setRun] = useState<RunView | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [watch, setWatch] = useState(0);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const lock = useRef(false);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => {
    const controllers = requests.current;
    return () => {
      for (const controller of controllers) controller.abort();
    };
  }, []);
  const runId = run?.id;
  const active = isPending(run);
  useEffect(() => {
    if (!runId || !active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    async function poll() {
      try {
        const next = await liveRequest<RunView>(
          `/api/runs/${runId}`,
          undefined,
          'GET',
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRun(next);
        setError('');
        if (isPending(next) && ++count < 60) timer = setTimeout(poll, 2000);
        else if (isPending(next))
          setError(
            'This is taking longer than usual. Your request is saved; check its status when you’re ready.',
          );
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : 'Connection lost. Your request is saved. Check its status to continue.',
          );
      }
    }
    timer = setTimeout(poll, 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [runId, active, watch]);
  async function submit(path: string, body: Record<string, unknown>) {
    if (lock.current || active) return null;
    lock.current = true;
    setBusy(true);
    setError('');
    const signature = JSON.stringify({ path, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    const controller = new AbortController();
    requests.current.add(controller);
    try {
      const next = await liveRequest<RunView>(
        path,
        { ...body, key: pending.current.key },
        'POST',
        controller.signal,
      );
      pending.current = null;
      setRun(next);
      return next;
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : 'Connection lost. Retry to check the same request.',
        );
      return null;
    } finally {
      requests.current.delete(controller);
      lock.current = false;
      setBusy(false);
    }
  }
  async function cancel() {
    if (!run || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    requests.current.add(controller);
    try {
      setRun(
        await liveRequest<RunView>(
          `/api/runs/${run.id}/cancel`,
          { key: crypto.randomUUID() },
          'POST',
          controller.signal,
        ),
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : 'Cancellation could not be confirmed. Check the request status.',
        );
    } finally {
      requests.current.delete(controller);
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    run,
    setRun,
    busy,
    error,
    submit,
    cancel,
    resume: () => {
      setError('');
      setWatch((v) => v + 1);
    },
  };
}
