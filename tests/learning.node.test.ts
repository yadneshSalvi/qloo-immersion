import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseAdaptation,
  canUseSource,
  scheduleReview,
  isAssignedAssessment,
  type RightsRecord,
} from '../src/domain/learning.ts';

test('liking a hard piece retains interest and adds support', () => {
  const result = chooseAdaptation({
    taste: 'more',
    comprehension: 0.3,
    assessedItems: 3,
    consecutiveStrongSessions: 0,
    support: 'guided',
  });
  assert.equal(result.route, 'same-interest');
  assert.equal(result.support, 'extra');
  assert.equal(result.changeProficiencyBand, false);
});
test('disliking a comprehensible piece changes interest without lowering the challenge', () => {
  const result = chooseAdaptation({
    taste: 'different',
    comprehension: 0.9,
    assessedItems: 3,
    consecutiveStrongSessions: 5,
    support: 'guided',
  });
  assert.equal(result.route, 'new-interest');
  assert.equal(result.challenge, 'hold');
  assert.equal(result.support, 'guided');
});
test('poor comprehension and dislike produce separate adjustments', () => {
  const result = chooseAdaptation({
    taste: 'different',
    comprehension: 0.2,
    assessedItems: 3,
    consecutiveStrongSessions: 0,
    support: 'independent',
  });
  assert.equal(result.route, 'new-interest');
  assert.equal(result.challenge, 'easier-piece');
  assert.equal(result.changeProficiencyBand, false);
});
test('a stretch requires multiple strong observations and positive interest', () => {
  const base = {
    taste: 'more' as const,
    comprehension: 0.9,
    assessedItems: 3,
    consecutiveStrongSessions: 1,
    support: 'guided' as const,
  };
  assert.equal(chooseAdaptation(base).challenge, 'hold');
  assert.equal(
    chooseAdaptation({ ...base, consecutiveStrongSessions: 3 }).challenge,
    'try-stretch',
  );
});
test('unscored and sparse observations do not invent comprehension', () => {
  for (const comprehension of [null, 0.1, 0.9]) {
    assert.equal(
      chooseAdaptation({
        taste: 'more',
        comprehension,
        assessedItems: 1,
        consecutiveStrongSessions: 5,
        support: 'guided',
      }).challenge,
      'hold',
    );
  }
});
test('nonfinite or out-of-range assessments fail validation', () => {
  for (const comprehension of [Number.NaN, -0.1, 1.1])
    assert.throws(() =>
      chooseAdaptation({
        taste: 'more',
        comprehension,
        assessedItems: 3,
        consecutiveStrongSessions: 1,
        support: 'guided',
      }),
    );
});
const rights: RightsRecord = {
  versionId: 'v1',
  state: 'released',
  revoked: false,
  expiresAt: 3000,
  canHost: true,
  canShowTranscript: true,
  canAdapt: false,
  canProcessWithModel: false,
};
test('a license permits only its stated uses', () => {
  assert.equal(canUseSource(rights, 'v1', 'host', 1000), true);
  assert.equal(canUseSource(rights, 'v1', 'model', 1000), false);
  assert.equal(canUseSource(rights, 'v1', 'adapt', 1000), false);
});
test('withdrawal, expiry and another content version prevent source delivery', () => {
  assert.equal(canUseSource({ ...rights, revoked: true }, 'v1', 'host', 1000), false);
  assert.equal(canUseSource({ ...rights, state: 'withdrawn' }, 'v1', 'host', 1000), false);
  assert.equal(canUseSource(rights, 'v1', 'host', 3000), false);
  assert.equal(canUseSource(rights, 'v2', 'host', 1000), false);
});
test('review intervals advance and reset deterministically', () => {
  const at = Date.UTC(2026, 9, 24, 12);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((stage) => scheduleReview(stage, true, at).days),
    [1, 3, 7, 14, 14],
  );
  assert.equal(scheduleReview(3, false, at).nextStage, 0);
  assert.equal(scheduleReview(3, false, at).dueAt, '2026-10-25T12:00:00.000Z');
});
test('a foreign or incorrectly assigned assessment cannot affect learning state', () => {
  const session = { id: 'session', learnerId: 'learner', contentVersionId: 'v1' };
  const assignment = {
    sessionId: 'session',
    contentVersionId: 'v1',
    objectiveId: 'objective',
    assessmentId: 'question',
  };
  const answer = { learnerId: 'learner', objectiveId: 'objective', assessmentId: 'question' };
  assert.equal(isAssignedAssessment(session, assignment, answer), true);
  assert.equal(isAssignedAssessment(session, assignment, { ...answer, learnerId: 'other' }), false);
  assert.equal(
    isAssignedAssessment(session, { ...assignment, contentVersionId: 'v2' }, answer),
    false,
  );
  assert.equal(
    isAssignedAssessment(session, assignment, { ...answer, assessmentId: 'other' }),
    false,
  );
});
