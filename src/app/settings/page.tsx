import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Headphones, SlidersHorizontal } from 'lucide-react';
import { requireLearner } from '@/server/auth';
import { DataControls } from '@/components/data-controls';
export const metadata = { title: 'Your preferences' };
export default async function Settings() {
  const learner = await requireLearner();
  return (
    <div className="container settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your space, your choices</span>
          <h1>Make it feel like yours.</h1>
          <p>A few preferences, and a clear view of where your data lives.</p>
        </div>
      </div>
      <section className="settings-section">
        <div className="settings-section-label">
          <SlidersHorizontal size={20} />
          <h2>Your starting preferences</h2>
        </div>
        <div className="preference-grid">
          <div>
            <span>Reading</span>
            <strong>{learner.profile.readingBand} working band</strong>
          </div>
          <div>
            <span>Listening</span>
            <strong>{learner.profile.listeningBand} working band</strong>
          </div>
          <div>
            <span>A little time</span>
            <strong>{learner.profile.minutes} minutes</strong>
          </div>
          <div>
            <span>Support</span>
            <strong>
              {learner.profile.support === 'independent'
                ? 'Begin independently'
                : learner.profile.support === 'extra'
                  ? 'Extra support'
                  : 'A little guidance'}
            </strong>
          </div>
          <div>
            <span>Your time zone</span>
            <strong>{learner.profile.timezone.replaceAll('_', ' ')}</strong>
          </div>
        </div>
        <Link href="/taste" className="button button-secondary">
          Edit preferences & interests <ArrowUpRight size={16} />
        </Link>
        <p className="fine-print">
          Working bands are self-selected, not a certified CEFR assessment.
        </p>
      </section>
      <section className="settings-section">
        <div className="settings-section-label">
          <Headphones size={20} />
          <h2>Listening & voice</h2>
        </div>
        <p>
          Listening is an optional browser-generated reading of the original text. Available voices
          depend on your browser and operating system. Your browser or operating system may use an
          online voice service.
        </p>
        <p>
          No microphone is used and no audio recording is collected. Pronunciation scoring and AI
          free-writing feedback are unavailable in this sample edition.
        </p>
      </section>
      <section className="settings-section">
        <div className="settings-section-label">
          <ShieldCheck size={20} />
          <h2>Your learning data</h2>
        </div>
        <p>
          Your path is stored in PostgreSQL and linked to this browser through a private session
          cookie that expires after 30 days. This is a guest learning space, with no cross-device
          sign-in. Clearing the cookie loses access; export or delete your path first.
        </p>
        <p>
          Only your own session can read or change your notes and responses. Your personal practice
          is not sent to Qloo or a model provider in this edition.
        </p>
        <DataControls />
      </section>
    </div>
  );
}
