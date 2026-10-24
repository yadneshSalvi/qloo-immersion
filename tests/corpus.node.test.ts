import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpus } from '../src/content/corpus';
import { clusters } from '../src/domain/types';
import { normalizeAnswer, commandSchema, onboardingSchema } from '../src/domain/commands';

test('the sample corpus covers six clusters and two intended bands with unique source-version identities', () => {
  assert.equal(corpus.length, 12);
  assert.equal(new Set(corpus.map((p) => p.source.versionId)).size, 12);
  for (const cluster of clusters)
    assert.deepEqual(
      corpus
        .filter((p) => p.source.cluster === cluster)
        .map((p) => p.source.band)
        .sort(),
      ['A2', 'B1'],
    );
});
test('each exercise points to its own source and keeps a bounded key', () => {
  const ids = new Set<string>();
  for (const { source, assessments } of corpus) {
    assert.equal(source.provenance.educatorReview, 'pending');
    assert.equal(source.provenance.qlooMapping, null);
    assert.equal(source.segments.length, 3);
    assert.equal(assessments.filter((a) => a.kind === 'comprehension').length, 3);
    assert.equal(assessments.filter((a) => a.kind === 'practice').length, 1);
    for (const item of assessments) {
      assert(!ids.has(item.id));
      ids.add(item.id);
      assert(item.sourceSegmentIds.length > 0);
      assert(item.sourceSegmentIds.every((id) => source.segments.some((s) => s.id === id)));
      assert(item.answer.length > 0);
      assert(item.explanation.length > 30);
      if (item.kind === 'comprehension')
        assert(item.answer.every((key) => item.options.some((o) => o.id === key)));
    }
    for (const word of source.glossary)
      assert(source.segments.some((s) => s.id === word.segmentId));
  }
});
test('bounded matching normalizes case and accents without accepting unrelated prose', () => {
  assert.equal(normalizeAnswer('  MÁS! '), 'mas');
  assert.equal(normalizeAnswer('mañana'), 'manana');
  assert.notEqual(normalizeAnswer('por si acaso, no sé'), 'acaso');
});
test('age, owned source identifiers, state versions, and finite inputs are required at the command boundary', () => {
  assert.equal(onboardingSchema.safeParse({ adult: false }).success, false);
  assert.equal(
    commandSchema.safeParse({
      type: 'position',
      sessionId: 'not-a-session',
      expectedVersion: -1,
      position: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: 'complete',
      sessionId: '123',
      expectedVersion: 1,
      taste: 'more',
      difficulty: 'hard',
      consent: true,
      note: '',
    }).success,
    false,
  );
});
