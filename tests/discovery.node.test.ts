import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus } from '../src/content/corpus';
import {
  eligibleDiscoveryOptions,
  buildDiscoveryResult,
  orderedOptions,
  baselineOptions,
  type DiscoverySnapshot,
} from '../src/domain/discovery';
import { bridges, profile, source } from './helpers/live-fixtures';
const sources = corpus.map((item) => item.source);
const snapshot = (custom = profile): DiscoverySnapshot => ({
  profileVersion: 1,
  profile: custom,
  signals: [],
  options: eligibleDiscoveryOptions(custom, sources, bridges, new Set([source.versionId])),
});
const evidence = { mode: 'live' as const, evidenceAt: '2026-10-27T00:00:00.000Z' };
test('the live eligible pool keeps two unseen same-band choices after one completed story', () => {
  const options = snapshot().options;
  assert.equal(options.length, 6);
  const food = options.find((item) => item.bridge.cluster === 'food')!;
  assert.equal(food.pieces.length, 2);
  assert(food.pieces.every((piece) => piece.band === 'A2' && piece.versionId !== source.versionId));
});
test('time and independent listening/reading bands are hard filters', () => {
  const p = {
    ...profile,
    readingBand: 'B1' as const,
    listeningBand: 'A2' as const,
    minutes: 6 as const,
  };
  for (const option of snapshot(p).options)
    for (const piece of option.pieces) {
      assert.equal(piece.format, 'listen');
      assert.equal(piece.band, 'A2');
      assert(piece.minutes <= 6);
    }
});
test('taste rejection removes that cultural route while preserving working bands', () => {
  const p = {
    ...profile,
    adaptation: {
      route: 'new-interest' as const,
      support: 'guided' as const,
      challenge: 'hold' as const,
      changeProficiencyBand: false as const,
      reason: 'Different culture, same challenge.',
      cluster: 'food' as const,
      fromPiece: source.id,
      at: evidence.evidenceAt,
    },
  };
  assert(snapshot(p).options.every((option) => option.bridge.cluster !== 'food'));
  assert.equal(p.readingBand, 'A2');
});
test('positive taste with poor comprehension protects the thread and adds support independently of provider ranking', () => {
  const p = {
    ...profile,
    adaptation: {
      route: 'same-interest' as const,
      support: 'extra' as const,
      challenge: 'easier-piece' as const,
      changeProficiencyBand: false as const,
      reason: 'Keep the thread and add support.',
      cluster: 'food' as const,
      fromPiece: source.id,
      at: evidence.evidenceAt,
    },
  };
  const s = snapshot(p);
  const ranks = [...bridges].reverse().map((item) => item.entityId);
  assert.equal(orderedOptions(s, ranks)[0].bridge.cluster, 'food');
  const result = buildDiscoveryResult(s, ranks, evidence, null, null);
  assert.equal(result.recommendations[0].piece.cluster, 'food');
  assert.equal(
    result.recommendations[0].evidence.providerRank,
    ranks.indexOf(bridges.find((item) => item.cluster === 'food')!.entityId) + 1,
  );
  assert.equal(s.profile.adaptation?.support, 'extra');
});
test('comparison shares eligibility and source choice; a model-only variation cannot count as changed Qloo order', () => {
  const s = snapshot();
  const ranks = baselineOptions(s).map((option) => option.bridge.entityId);
  const steps = orderedOptions(s, ranks)
    .slice(0, 3)
    .map((option) => ({
      bridgeKey: option.bridge.key,
      versionId: option.pieces.at(-1)!.versionId,
      studyFocus: 'An objective from the original story.',
      warmupQuestion: 'What would you notice in this story?',
      sourceQuote: option.pieces.at(-1)!.segments[0].text.slice(0, 70),
    }));
  const result = buildDiscoveryResult(s, ranks, evidence, steps, 'fixture');
  assert.equal(result.comparison.changedPositions, 0);
  assert.equal(result.comparison.sameFirstChoice, true);
  assert.equal(result.comparison.candidateCount, s.options.length);
  assert(result.notes.some((note) => note.includes('not evidence of greater appeal')));
});
test('partial Qloo coverage never invents a rank or a new source identity', () => {
  const s = snapshot();
  const result = buildDiscoveryResult(
    s,
    [bridges[0].entityId],
    { ...evidence, mode: 'cached' },
    null,
    null,
  );
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.mode, 'cached');
  assert.equal(result.planning.mode, 'deterministic');
  assert(result.notes.some((note) => note.includes('1 of 6')));
  assert.equal(result.recommendations[0].piece.provenance.qlooMapping, null);
});
