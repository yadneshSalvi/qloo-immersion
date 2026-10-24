'use client';
import { useEffect, useState, useRef } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
export function SpeechPlayer({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState('0.85');
  const [error, setError] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window)
        window.speechSynthesis.cancel();
    };
  }, [text]);
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
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
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
            Optional browser-generated Spanish voice
          </span>
        </div>
        <label>
          <span className="sr-only">Playback speed</span>
          <select
            aria-label="Playback speed"
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
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
