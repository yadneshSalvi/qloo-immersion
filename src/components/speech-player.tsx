'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2, LoaderCircle } from 'lucide-react';
import { Button } from './ui/button';

type Timing = { id: string; startSeconds: number; endSeconds: number };
type NarrationManifest = {
  available: boolean;
  audioUrl?: string;
  durationSeconds?: number;
  segments?: Timing[];
  voice?: string;
  model?: string;
  label?: string;
};
function timeLabel(value: number) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function SpeechPlayer({
  text,
  sessionId,
  segmentId,
  seekToken = 0,
  onSegmentChange,
  defaultRate = '1',
}: {
  text: string;
  sessionId?: string;
  segmentId?: string;
  seekToken?: number;
  onSegmentChange?: (id: string | null) => void;
  defaultRate?: '0.75' | '1';
}) {
  const [manifest, setManifest] = useState<NarrationManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(!!sessionId);
  const [manifestError, setManifestError] = useState('');
  const [fallback, setFallback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState<string>(defaultRate);
  const chosenRate = useRef<string | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const lastSeekToken = useRef(0);
  const currentSegment = useRef<string | null>(null);
  const callback = useRef(onSegmentChange);
  const storageKey = sessionId ? `immersion-audio-position:${sessionId}` : null;
  useEffect(() => {
    callback.current = onSegmentChange;
  }, [onSegmentChange]);
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let mounted = true;
    fetch(`/api/media/${encodeURIComponent(sessionId)}/manifest`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Narration unavailable');
        const data = (await response.json()) as NarrationManifest;
        if (mounted) {
          // Audio stays on the authenticated session route supplied by the server.
          const expected = `/api/media/${sessionId}`;
          setManifest(data.available && data.audioUrl === expected ? data : { available: false });
        }
      })
      .catch(() => {
        if (mounted)
          setManifestError(
            'Saved narration could not be loaded. You can use the browser voice or keep reading.',
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (mounted) setLoadingManifest(false);
      });
    return () => {
      mounted = false;
      clearTimeout(timeout);
      controller.abort();
      callback.current?.(null);
    };
  }, [sessionId]);
  useEffect(() => {
    if (!manifest?.available || seekToken === lastSeekToken.current) return;
    const timing = manifest.segments?.find((item) => item.id === segmentId);
    if (!timing) return;
    lastSeekToken.current = seekToken;
    pendingSeek.current = timing.startSeconds;
    if (audio.current?.readyState) {
      audio.current.currentTime = timing.startSeconds;
      pendingSeek.current = null;
      setElapsed(timing.startSeconds);
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, String(timing.startSeconds));
        } catch {
          /* Storage is optional. */
        }
      }
      if (currentSegment.current !== timing.id) {
        currentSegment.current = timing.id;
        callback.current?.(timing.id);
      }
    }
  }, [manifest, segmentId, seekToken, storageKey]);
  useEffect(() => {
    const element = audio.current;
    return () => {
      if (element && storageKey && Number.isFinite(element.currentTime)) {
        try {
          sessionStorage.setItem(storageKey, String(element.ended ? 0 : element.currentTime));
        } catch {
          /* Playback also works when browser storage is disabled. */
        }
      }
      element?.pause();
    };
  }, [storageKey, fallback, manifest?.available]);
  function storePosition(value: number) {
    if (!storageKey || !Number.isFinite(value)) return;
    try {
      sessionStorage.setItem(storageKey, String(value));
    } catch {
      /* Storage is optional. */
    }
  }
  function trackSegment(value: number) {
    const timing = manifest?.segments?.find(
      (item) => value >= item.startSeconds && value < item.endSeconds,
    );
    const id = timing?.id ?? null;
    if (id !== currentSegment.current) {
      currentSegment.current = id;
      callback.current?.(id);
    }
  }
  function metadata() {
    const element = audio.current;
    if (!element) return;
    const length = Number.isFinite(element.duration)
      ? element.duration
      : (manifest?.durationSeconds ?? 0);
    setDuration(length);
    let saved = 0;
    if (storageKey) {
      try {
        saved = Number(sessionStorage.getItem(storageKey));
      } catch {
        /* Storage is optional. */
      }
    }
    const initial =
      pendingSeek.current ??
      (Number.isFinite(saved) && saved > 0
        ? saved
        : (manifest?.segments?.find((item) => item.id === segmentId)?.startSeconds ?? 0));
    const next = Math.min(Math.max(0, initial), Math.max(0, length - 0.05));
    element.currentTime = next;
    let savedRate: string | null = null;
    try {
      savedRate = sessionStorage.getItem('immersion-narration-rate');
    } catch {
      /* Storage is optional. */
    }
    const nextRate =
      chosenRate.current ??
      (savedRate && ['0.75', '1', '1.25'].includes(savedRate) ? savedRate : rate);
    element.playbackRate = Number(nextRate);
    setRate(nextRate);
    pendingSeek.current = null;
    setElapsed(next);
    trackSegment(next);
  }
  async function toggle() {
    const element = audio.current;
    if (!element) return;
    setError('');
    if (!element.paused) {
      element.pause();
      storePosition(element.currentTime);
      return;
    }
    setBuffering(true);
    if (element.error) {
      pendingSeek.current = elapsed;
      element.load();
    }
    try {
      await element.play();
    } catch {
      setBuffering(false);
      setPlaying(false);
      setError(
        'Narration could not play. Try again, use the browser voice, or continue with the text.',
      );
    }
  }
  function seek(value: number) {
    if (!Number.isFinite(value)) return;
    const next = Math.max(0, Math.min(value, duration || manifest?.durationSeconds || 0));
    if (audio.current?.readyState) audio.current.currentTime = next;
    else pendingSeek.current = next;
    setElapsed(next);
    storePosition(next);
    trackSegment(next);
  }
  if (loadingManifest)
    return (
      <div className="speech-player narration-loading" role="status">
        <LoaderCircle size={17} className="live-spinner" /> Checking saved narration…
      </div>
    );
  if (!manifest?.available || fallback)
    return (
      <>
        <BrowserVoice key={text} text={text} />
        {manifestError && <p className="narration-fallback-note">{manifestError}</p>}
      </>
    );
  const total = duration || manifest.durationSeconds || 0;
  return (
    <div className="speech-player recorded-narration">
      <audio
        ref={audio}
        src={manifest.audioUrl}
        preload="metadata"
        onLoadedMetadata={metadata}
        onTimeUpdate={() => {
          const value = audio.current?.currentTime ?? 0;
          setElapsed(value);
          storePosition(value);
          trackSegment(value);
        }}
        onPlay={() => setPlaying(true)}
        onPlaying={() => setBuffering(false)}
        onPause={() => {
          setPlaying(false);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onEnded={() => {
          setPlaying(false);
          setBuffering(false);
          storePosition(0);
        }}
        onError={() => {
          setPlaying(false);
          setBuffering(false);
          setError(
            'Saved narration is unavailable. Try the browser voice or keep reading the original text.',
          );
        }}
      />
      <div className="speech-controls">
        <Button
          variant="secondary"
          size="icon"
          onClick={toggle}
          aria-label={playing ? 'Pause narration' : 'Play narration'}
        >
          {buffering ? (
            <LoaderCircle size={17} className="live-spinner" />
          ) : playing ? (
            <Pause size={17} />
          ) : (
            <Play size={18} />
          )}
        </Button>
        <div>
          <strong>
            {buffering
              ? 'Loading narration…'
              : playing
                ? 'Listening to the story'
                : 'Listen to the story'}
          </strong>
          <span>
            <Volume2 size={12} />
            Synthetic Spanish narration
          </span>
        </div>
        <label>
          <span className="sr-only">Narration playback speed</span>
          <select
            aria-label="Narration playback speed"
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
              chosenRate.current = event.target.value;
              try {
                sessionStorage.setItem('immersion-narration-rate', event.target.value);
              } catch {
                /* Storage is optional. */
              }
              if (audio.current) audio.current.playbackRate = Number(event.target.value);
            }}
          >
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
          </select>
        </label>
      </div>
      <div className="narration-timeline">
        <span aria-hidden="true">{timeLabel(elapsed)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(total, 0.1)}
          step="0.1"
          value={Math.min(elapsed, total)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Narration position"
          aria-valuetext={`${timeLabel(elapsed)} of ${timeLabel(total)}`}
          disabled={!total}
        />
        <span aria-hidden="true">{timeLabel(total)}</span>
      </div>
      <div className="narration-caption">
        <span>
          {manifest.label ||
            'AI-generated narration of the original story. No creator voice is imitated.'}
        </span>
        <span>Passage buttons seek the audio. Your place is kept in this browser.</span>
      </div>
      {error && (
        <div className="narration-recovery">
          <p className="speech-error" role="status">
            {error}
          </p>
          <button
            type="button"
            className="quiet-link"
            onClick={() => {
              audio.current?.pause();
              callback.current?.(null);
              setFallback(true);
            }}
          >
            Use browser voice instead
          </button>
        </div>
      )}
    </div>
  );
}
function BrowserVoice({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState('0.85');
  const [error, setError] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(
    () => () => {
      if (utterance.current) {
        utterance.current.onend = null;
        utterance.current.onerror = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );
  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }
  function play() {
    setError('');
    if (!('speechSynthesis' in window)) {
      setError('This browser cannot read aloud. The complete text is available below.');
      return;
    }
    window.speechSynthesis.cancel();
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith('es'));
    if (!voice) {
      setError(
        'No Spanish voice is available in this browser. You can keep reading the full text below.',
      );
      return;
    }
    const line = new SpeechSynthesisUtterance(text);
    line.lang = voice.lang;
    line.voice = voice;
    line.rate = Number(rate);
    line.onend = () => setPlaying(false);
    line.onerror = () => {
      setPlaying(false);
      setError('Playback stopped. Try again or continue with the text.');
    };
    utterance.current = line;
    setPlaying(true);
    window.speechSynthesis.speak(line);
  }
  return (
    <div className="speech-player">
      <div className="speech-controls">
        <Button
          variant="secondary"
          size="icon"
          onClick={playing ? stop : play}
          aria-label={playing ? 'Stop reading aloud' : 'Listen to this passage'}
        >
          {playing ? <Square size={16} /> : <Play size={18} />}
        </Button>
        <div>
          <strong>{playing ? 'Reading this passage…' : 'Listen along'}</strong>
          <span>
            <Volume2 size={12} />
            Browser voice fallback · synthetic Spanish
          </span>
        </div>
        <label>
          <span className="sr-only">Playback speed</span>
          <select
            aria-label="Playback speed"
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
              if (playing) stop();
            }}
          >
            <option value="0.7">0.7×</option>
            <option value="0.85">0.85×</option>
            <option value="1">1×</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="speech-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
