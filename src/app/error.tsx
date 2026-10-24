'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="empty-state container">
      <span className="eyebrow">A brief intermission</span>
      <h1>Let’s pick this up again.</h1>
      <p>Your saved progress stays in your learning space. The page could not load right now.</p>
      <div className="button-row">
        <Button onClick={reset}>Try again</Button>
        <Link className="button button-secondary" href="/discover">
          Back to the collection
        </Link>
      </div>
    </section>
  );
}
