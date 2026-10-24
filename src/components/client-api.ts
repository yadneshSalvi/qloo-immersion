'use client';
import { useState, useRef } from 'react';
import type { Command } from '@/domain/commands';
import type { CommandResult } from '@/server/store';
export type PendingCommand = { key: string; command: Command };
class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
function storePending(body: PendingCommand | null) {
  try {
    if (body) sessionStorage.setItem('immersion-pending', JSON.stringify(body));
    else sessionStorage.removeItem('immersion-pending');
  } catch {
    /* The in-memory key still prevents duplicate retries in storage-restricted browsers. */
  }
}
export async function postCommand(body: PendingCommand): Promise<CommandResult> {
  const response = await fetch('/api/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      data.error?.message ?? 'Your change could not be saved. Try again.',
      response.status,
    );
  return data;
}
export function useCommand() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<PendingCommand | null>(null);
  async function run(command: Command): Promise<CommandResult | null> {
    if (busy) return null;
    if (pending.current && JSON.stringify(pending.current.command) !== JSON.stringify(command)) {
      setError(
        'An earlier change still needs saving. Retry that action, or reload to retry or discard the pending change.',
      );
      return null;
    }
    setBusy(true);
    setError('');
    const body =
      pending.current && JSON.stringify(pending.current.command) === JSON.stringify(command)
        ? pending.current
        : { key: crypto.randomUUID(), command };
    pending.current = body;
    storePending(body);
    try {
      const result = await postCommand(body);
      pending.current = null;
      storePending(null);
      return result;
    } catch (e) {
      if (e instanceof RequestError && e.status < 500) {
        pending.current = null;
        storePending(null);
      }
      setError(
        e instanceof RequestError
          ? e.message
          : 'Connection lost. Your change is kept in this browser. Retry this action, or reload to retry the saved request.',
      );
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error, clearError: () => setError('') };
}
