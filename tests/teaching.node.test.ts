import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCoachingDraft, validateStudyDraft } from '../src/domain/teaching';
import {
  eligibleDiscoveryOptions,
  orderedOptions,
  type DiscoverySnapshot,
} from '../src/domain/discovery';
import {
  generateCoaching,
  generateStudyPlan,
  boundedModelFetch,
  type TeachingRuntime,
} from '../src/integrations/teaching';
import { corpus } from '../src/content/corpus';
import {
  bridges,
  profile,
  source,
  learnerAnswer,
  coachingDraft,
  teachingMock,
} from './helpers/live-fixtures';

const snapshot: DiscoverySnapshot = {
  profileVersion: 1,
  profile,
  signals: [],
  options: eligibleDiscoveryOptions(
    profile,
    corpus.map((item) => item.source),
    bridges,
    new Set(),
  ),
};
const ranked = [...bridges].reverse().map((item) => item.entityId);
const steps = orderedOptions(snapshot, ranked)
  .slice(0, 3)
  .map((option) => ({
    bridgeKey: option.bridge.key,
    versionId: option.pieces[0].versionId,
    studyFocus: 'Notice a useful expression in the opening scene.',
    warmupQuestion: 'What small detail would you notice in this scene?',
    sourceQuote: option.pieces[0].segments[0].text.slice(0, 60),
  }));
test('coaching requires exact learner spans and exact quotations from the assigned source', () => {
  assert.deepEqual(validateCoachingDraft(coachingDraft, source, learnerAnswer), coachingDraft);
  for (const bad of [
    {
      ...coachingDraft,
      corrections: [{ ...coachingDraft.corrections[0], before: 'words the learner never wrote' }],
    },
    { ...coachingDraft, corrections: [...coachingDraft.corrections, ...coachingDraft.corrections] },
    {
      ...coachingDraft,
      sourceEvidence: [
        { segmentId: source.segments[0].id, quote: coachingDraft.sourceEvidence[0].quote },
      ],
    },
    {
      ...coachingDraft,
      sourceEvidence: [{ segmentId: 'other-source-s1', quote: source.segments[0].text }],
    },
    { ...coachingDraft, status: 'try-again' },
    { ...coachingDraft, score: 100 },
  ])
    assert.throws(() => validateCoachingDraft(bad, source, learnerAnswer));
});
test('study planning cannot reorder cultural routes, swap in an ineligible source, or invent a quotation', () => {
  assert.equal(validateStudyDraft({ steps }, snapshot, ranked).length, 3);
  for (const bad of [
    { steps: [...steps].reverse() },
    { steps: [{ ...steps[0], versionId: source.versionId }, ...steps.slice(1)] },
    {
      steps: [{ ...steps[0], sourceQuote: 'This never appears in the story.' }, ...steps.slice(1)],
    },
    { steps: steps.slice(0, 2) },
  ])
    assert.throws(() => validateStudyDraft(bad, snapshot, ranked));
});
function runtime(model: TeachingRuntime['model']) {
  const reservations: string[] = [],
    checkpoints: string[] = [];
  const value: TeachingRuntime = {
    model,
    assertActive: async () => undefined,
    reserve: async (step) => {
      reservations.push(step);
    },
    inspectSource: async (versionId) => {
      const found = corpus.find((item) => item.source.versionId === versionId);
      if (!found) throw new Error('No source');
      return found.source;
    },
    checkpoint: async (stage) => {
      checkpoints.push(stage);
    },
  };
  return { value, reservations, checkpoints };
}
test('real SDK coaching performs a forced source inspection then one bounded structured response', async () => {
  const model = teachingMock('inspectAssignedSource', coachingDraft);
  const r = runtime(model);
  assert.deepEqual(await generateCoaching(source, learnerAnswer, r.value), coachingDraft);
  assert.equal(model.doGenerateCalls.length, 2);
  assert.deepEqual(r.reservations, ['model-0', 'model-1']);
  assert.deepEqual(r.checkpoints, ['source-inspected']);
  assert.equal(model.doGenerateCalls[0].toolChoice?.type, 'tool');
  assert.equal(model.doGenerateCalls[1].toolChoice?.type, 'none');
  const context = JSON.stringify(model.doGenerateCalls[1].prompt);
  assert(context.includes(source.segments[0].text));
  assert(!context.includes('answer_key'));
  assert(!context.includes(profile.name));
  assert(!context.includes(profile.references[0]));
});
test('real SDK planner uses the approved corpus tool and preserves the exact route contract', async () => {
  const model = teachingMock('inspectEligibleCorpus', { steps });
  const r = runtime(model);
  assert.deepEqual(await generateStudyPlan(snapshot, ranked, r.value), steps);
  assert.equal(model.doGenerateCalls.length, 2);
  assert.deepEqual(r.checkpoints, ['corpus-inspected']);
  const context = JSON.stringify(model.doGenerateCalls[1].prompt);
  assert(!context.includes(profile.name));
  assert(!context.includes(bridges[0].entityId));
});
test('provider model boundary forbids other hosts, redirects and a third request before network access', async () => {
  let calls = 0;
  const reserved: string[] = [];
  const guarded = boundedModelFetch(
    async (_url, options) => {
      calls++;
      assert.equal(options?.redirect, 'error');
      return Response.json({ ok: true });
    },
    async (step) => {
      reserved.push(step);
    },
  );
  await assert.rejects(guarded('https://untrusted.invalid/v1/responses', { method: 'POST' }));
  await assert.rejects(guarded('https://api.openai.com/v1/files', { method: 'POST' }));
  assert.equal(calls, 0);
  await guarded('https://api.openai.com/v1/responses', { method: 'POST' });
  await guarded('https://api.openai.com/v1/responses', { method: 'POST' });
  await assert.rejects(guarded('https://api.openai.com/v1/responses', { method: 'POST' }));
  assert.equal(calls, 2);
  assert.deepEqual(reserved, ['model-0', 'model-1']);
});
test('the model response body has a byte limit before the SDK parses it', async () => {
  let reservations = 0;
  const guarded = boundedModelFetch(
    async () => new Response('x'.repeat(1_048_577)),
    async () => {
      reservations++;
    },
  );
  const response = await guarded('https://api.openai.com/v1/responses', { method: 'POST' });
  await assert.rejects(
    response.text(),
    (error: unknown) =>
      !!error && typeof error === 'object' && 'code' in error && error.code === 'MALFORMED',
  );
  assert.equal(reservations, 1);
});
