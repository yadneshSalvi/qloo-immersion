'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Music2,
  Clapperboard,
  BookOpen,
  Utensils,
  Armchair,
  MapPin,
  Plus,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Artwork } from './artwork';
import { useCommand } from './client-api';
import { clusters, clusterLabels, type Cluster, type Band, type Learner } from '@/domain/types';
import type { SupportMode } from '@/domain/learning';
const icons = {
  music: Music2,
  cinema: Clapperboard,
  literature: BookOpen,
  food: Utensils,
  design: Armchair,
  places: MapPin,
};
export function Onboarding({ learner }: { learner?: Learner }) {
  const router = useRouter();
  const command = useCommand();
  const key = useRef<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(learner?.profile.name ?? '');
  const [adult, setAdult] = useState(!!learner);
  const [reading, setReading] = useState<Band>(learner?.profile.readingBand ?? 'A2');
  const [listening, setListening] = useState<Band>(learner?.profile.listeningBand ?? 'A2');
  const [minutes, setMinutes] = useState<6 | 10 | 15>(learner?.profile.minutes ?? 10);
  const [support, setSupport] = useState<SupportMode>(learner?.profile.support ?? 'guided');
  const [interests, setInterests] = useState<Cluster[]>(learner?.profile.interests ?? []);
  const [references, setReferences] = useState<string[]>(learner?.profile.references ?? []);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titles = ['A little about you.', 'Find a comfortable beginning.', 'What pulls you in?'];
  const subtitles = [
    'Your own quiet corner for exploring Spanish.',
    'Choose a starting point. You can change it whenever you like.',
    'Follow a familiar interest, or leave room for a surprise.',
  ];
  function addReference() {
    const value = reference.trim();
    if (value && references.length < 3 && !references.includes(value)) {
      setReferences([...references, value]);
      setReference('');
    }
  }
  async function submit() {
    setError('');
    if (!adult) {
      setStep(0);
      setError('Please confirm you are 18 or older.');
      return;
    }
    if (!interests.length) {
      setError('Choose at least one cultural thread to begin.');
      return;
    }
    setBusy(true);
    const profile = {
      name,
      readingBand: reading,
      listeningBand: listening,
      minutes,
      support,
      interests,
      references:
        reference.trim() && references.length < 3 ? [...references, reference.trim()] : references,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    try {
      if (learner) {
        const result = await command.run({
          type: 'profile',
          expectedVersion: learner.version,
          ...profile,
        });
        if (!result) return;
      } else {
        key.current ??= crypto.randomUUID();
        const response = await fetch('/api/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profile, adult, key: key.current }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? 'Your path could not be saved.');
      }
      sessionStorage.removeItem('immersion-pending');
      router.push('/discover');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again. Your choices are still here.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="onboarding container">
      <aside className="onboarding-aside">
        <div className="eyebrow">Your Spanish, your way</div>
        <h2>
          A small habit.
          <br />
          <em>A wider world.</em>
        </h2>
        <Artwork
          cluster={step === 2 ? 'music' : step === 1 ? 'literature' : 'places'}
          palette={step === 2 ? 'record' : step === 1 ? 'books' : 'plaza'}
        />
        <p>No account to create. Your progress stays in this browser’s private learning space.</p>
        <div className="onboarding-safe">
          <ShieldCheck size={17} />
          <span>Saved in PostgreSQL · isolated guest session</span>
        </div>
      </aside>
      <div className="onboarding-form">
        <div className="step-nav" aria-label="Setup progress">
          {['You', 'Starting point', 'Your interests'].map((label, i) => (
            <button
              key={label}
              type="button"
              className={i === step ? 'current' : i < step ? 'done' : ''}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              <span>{i < step ? <Check size={13} /> : i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <span className="eyebrow">{learner ? 'Adjust your path' : `Step ${step + 1} of 3`}</span>
        <h1>{titles[step]}</h1>
        <p className="lead">{subtitles[step]}</p>
        {step === 0 && (
          <div className="form-stack">
            <label className="field-label" htmlFor="first-name">
              What should we call you? <span>Optional</span>
            </label>
            <input
              id="first-name"
              autoComplete="given-name"
              placeholder="Your first name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
            <fieldset>
              <legend>A little time for yourself</legend>
              <div className="segmented">
                {([6, 10, 15] as const).map((time) => (
                  <button
                    type="button"
                    key={time}
                    aria-pressed={minutes === time}
                    onClick={() => setMinutes(time)}
                  >
                    {time} minutes
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="scope-note">
              <span className="pill">English → Spanish</span>
              <p>
                This first collection is for adults around A2–B1. These are self-selected working
                bands, not a certified assessment.
              </p>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span>I’m 18 or older.</span>
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="form-stack">
            {[
              { label: 'Reading', value: reading, set: setReading },
              { label: 'Listening', value: listening, set: setListening },
            ].map(({ label, value, set }) => (
              <fieldset key={label}>
                <legend>{label}</legend>
                <div className="band-options">
                  {(['A2', 'B1'] as const).map((band) => (
                    <button
                      type="button"
                      key={band}
                      aria-pressed={value === band}
                      onClick={() => set(band)}
                    >
                      <strong>
                        {band} <span>{band === 'A2' ? 'Start gently' : 'A little more depth'}</span>
                      </strong>
                      <span>
                        {band === 'A2'
                          ? 'I can follow short, familiar everyday stories.'
                          : 'I can follow connected ideas and some nuance.'}
                      </span>
                      {value === band && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset>
              <legend>How much support feels right?</legend>
              <div className="segmented three">
                <button
                  type="button"
                  aria-pressed={support === 'guided'}
                  onClick={() => setSupport('guided')}
                >
                  A little guidance
                </button>
                <button
                  type="button"
                  aria-pressed={support === 'extra'}
                  onClick={() => setSupport('extra')}
                >
                  Extra support
                </button>
                <button
                  type="button"
                  aria-pressed={support === 'independent'}
                  onClick={() => setSupport('independent')}
                >
                  Try independently
                </button>
              </div>
            </fieldset>
            <p className="fine-print">
              Translation and word meanings remain available in every mode. Your first session won’t
              change these bands automatically.
            </p>
          </div>
        )}
        {step === 2 && (
          <div className="form-stack">
            <div className="interest-grid">
              {clusters.map((cluster) => {
                const Icon = icons[cluster];
                return (
                  <button
                    key={cluster}
                    type="button"
                    aria-pressed={interests.includes(cluster)}
                    onClick={() =>
                      setInterests(
                        interests.includes(cluster)
                          ? interests.filter((c) => c !== cluster)
                          : [...interests, cluster],
                      )
                    }
                  >
                    <Icon size={22} strokeWidth={1.5} />
                    <span>{clusterLabels[cluster]}</span>
                    <span className="selection-dot">
                      {interests.includes(cluster) && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="favorites-field">
              <label className="field-label" htmlFor="reference">
                A few favorites? <span>Optional · up to 3</span>
              </label>
              <p className="fine-print">
                An artist, a film, a book. Saved as your own references; live Qloo matching isn’t
                enabled in this edition.
              </p>
              <div className="input-action">
                <input
                  id="reference"
                  placeholder="e.g. Khruangbin, Studio Ghibli…"
                  maxLength={100}
                  value={reference}
                  disabled={references.length >= 3}
                  onChange={(e) => setReference(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addReference();
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={addReference}
                  aria-label="Add favorite"
                  disabled={!reference.trim() || references.length >= 3}
                >
                  <Plus size={18} />
                </Button>
              </div>
              <div className="chip-row">
                {references.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip"
                    onClick={() => setReferences(references.filter((r) => r !== item))}
                    aria-label={`Remove ${item}`}
                  >
                    {item}
                    <X size={13} />
                  </button>
                ))}
              </div>
            </div>
            <div className="sample-note">
              <span className="status-dot" />
              <p>
                Your first recommendations use your chosen categories and this original sample
                collection. No live affinity is implied.
              </p>
            </div>
          </div>
        )}
        {(error || command.error) && (
          <div className="error-message" role="alert">
            {error || command.error}
          </div>
        )}
        <div className="onboarding-actions">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
              <ArrowLeft size={16} /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button
              onClick={() => {
                if (step === 0 && !adult) {
                  setError('Please confirm you are 18 or older to continue.');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
            >
              Continue <ArrowRight size={17} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy || !interests.length}>
              {busy ? 'Saving your path…' : learner ? 'Save my preferences' : 'Find my first story'}
              <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
