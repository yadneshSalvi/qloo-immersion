'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { postCommand, type PendingCommand } from './client-api';
export function PendingBanner() {
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('immersion-pending');
      if (raw) {
        const timer = setTimeout(() => setPending(JSON.parse(raw)), 0);
        return () => clearTimeout(timer);
      }
    } catch {
      sessionStorage.removeItem('immersion-pending');
    }
  }, []);
  if (!pending) return null;
  async function retry() {
    setBusy(true);
    try {
      await postCommand(pending!);
      sessionStorage.removeItem('immersion-pending');
      setPending(null);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not reconnect.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pending-banner" role="status">
      <CloudOff size={18} />
      <span>
        {message || 'An earlier change has not been confirmed. It is kept in this browser.'}
      </span>
      <Button variant="secondary" size="small" onClick={retry} disabled={busy}>
        <RefreshCw size={15} /> {busy ? 'Retrying…' : 'Retry save'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Discard pending change"
        onClick={() => {
          sessionStorage.removeItem('immersion-pending');
          setPending(null);
        }}
      >
        <X size={16} />
      </Button>
    </div>
  );
}
