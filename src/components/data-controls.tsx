'use client';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
export function DataControls() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  async function remove() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY PATH' }),
      });
      if (!response.ok)
        throw new Error('Your learning space could not be deleted. Please try again.');
      sessionStorage.removeItem('immersion-pending');
      setOpen(false);
      router.push('/');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="data-controls">
      <div className="settings-row">
        <div>
          <h3>Take your path with you</h3>
          <p>Download your preferences, activity, review schedule, and decision records as JSON.</p>
        </div>
        <a href="/api/profile/export" className="button button-secondary" download>
          <Download size={16} />
          Export my data
        </a>
      </div>
      <div className="settings-row">
        <div>
          <h3>A fresh beginning</h3>
          <p>
            Delete this guest path, including its sessions, responses, notes, words, and saved
            pieces. This affects only your current browser’s learning space.
          </p>
        </div>
        <AlertDialog.Root open={open} onOpenChange={setOpen}>
          <AlertDialog.Trigger asChild>
            <Button variant="ghost">
              <Trash2 size={16} />
              Delete my path
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="dialog-overlay" />
            <AlertDialog.Content className="dialog-content">
              <AlertDialog.Title>Begin with a blank page?</AlertDialog.Title>
              <AlertDialog.Description>
                This permanently deletes your current guest learning path from PostgreSQL. Other
                guest spaces and the original collection stay available. Export your data first if
                you would like a copy.
              </AlertDialog.Description>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
              <div className="button-row">
                <AlertDialog.Cancel asChild>
                  <Button variant="secondary" disabled={busy}>
                    Keep my path
                  </Button>
                </AlertDialog.Cancel>
                <Button variant="danger" onClick={remove} disabled={busy}>
                  {busy ? 'Deleting…' : 'Delete my learning path'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </section>
  );
}
