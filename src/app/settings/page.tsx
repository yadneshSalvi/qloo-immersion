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
          Listening uses a saved synthetic Spanish narration where one is available. Playback begins
          only when you choose to play. You can pause, change speed, and seek to a passage. If saved
          narration is unavailable, an optional browser-generated voice reads the selected passage;
          voices depend on your browser and operating system and may use an online service.
        </p>
        <p>
          No microphone is used and no audio recording is collected. There is no pronunciation
          score. Optional AI feedback is available for a typed opinion after the fixed source
          exercise.
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
          Only your own guest session can read or change your notes and responses. Cultural search
          and discovery use Qloo when you explicitly request them. Your writing is not sent to Qloo.
        </p>
        <p>
          Discovery may use an AI provider to prepare study suggestions from eligible stories.
          Writing feedback is a separate action: only after you agree to processing and submit does
          the app send your typed answer and story context to the AI provider. You can request up to
          three writing feedback responses per session. These suggestions do not change your fixed
          comprehension results or certify a language level.
        </p>
        <Link href="/evidence" className="quiet-link">
          See processing modes & saved evidence <ArrowUpRight size={16} />
        </Link>
        <DataControls />
      </section>
    </div>
  );
}
