import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '../scripts/migrate';
import { database, closeDatabase } from '../src/server/db';
import {
  createLearner,
  executeCommand,
  getSession,
  getSource,
  deleteLearner,
} from '../src/server/store';
import {
  createResolutionRun,
  createDiscoveryRun,
  createCoachingRun,
  getRun,
  confirmInterest,
  removeInterest,
  getLiveOverview,
  claimRun,
  finishRun,
  failRun,
  reserveProviderCall,
  cancelRun,
  getCoachingHistory,
  exportLiveLearner,
} from '../src/server/live-store';
import {
  processNextRun,
  executeLearningRun,
  type WorkerRuntime,
} from '../src/server/learning-worker';
import { getMediaManifest, mediaResponse, narrationSourceHash } from '../src/server/media';
import { corpus } from '../src/content/corpus';
import {
  orderedOptions,
  eligibleDiscoveryOptions,
  type DiscoverySnapshot,
} from '../src/domain/discovery';
import type { Learner, SessionView } from '../src/domain/types';
import {
  bridges,
  profile,
  source,
  fakeId,
  coachingDraft,
  learnerAnswer,
  teachingMock,
} from './helpers/live-fixtures';

const connection = new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/immersion_test');
connection.pathname = '/immersion_test';
process.env.DATABASE_URL = connection.toString();
process.env.LIVE_QLOO_ENABLED = '1';
process.env.LIVE_COACHING_ENABLED = '1';
const env = {
  NODE_ENV: 'test' as const,
  QLOO_API_KEY: 'test-only-never-sent-qloo',
  QLOO_GUEST_DAILY_CALL_LIMIT: '100',
  OPENAI_API_KEY: 'test-only-never-sent-model',
  MODEL_GUEST_DAILY_CALL_LIMIT: '100',
};
const qlooEnv = { ...env, OPENAI_API_KEY: undefined };
const code = (expected: string) => (error: unknown) =>
  !!error && typeof error === 'object' && 'code' in error && error.code === expected;
async function learner() {
  return createLearner({
    key: randomUUID(),
    adult: true,
    name: 'Provider-free integration learner',
    readingBand: 'A2',
    listeningBand: 'A2',
    minutes: 10,
    interests: ['food', 'cinema'],
    references: [],
    support: 'guided',
    timezone: 'UTC',
  });
}
const searchRow = (id = fakeId(1)) => ({
  entity_id: id,
  name: 'Fixture artist',
  types: ['urn:entity:artist'],
  disambiguation: 'Provider-free test only',
});
async function resolved(l: Learner, id = fakeId(1)) {
  const run = await createResolutionRun(l.id, {
    key: randomUUID(),
    query: 'Fixture artist',
    entityType: 'artist',
  });
  await processNextRun({ env: qlooEnv, transport: async () => [searchRow(id)] }, run.id);
  return getRun(l.id, run.id);
}
async function confirmed(l: Learner) {
  const run = await resolved(l);
  return confirmInterest(l.id, { key: randomUUID(), runId: run.id, candidateId: fakeId(1) });
}
async function practiced(l: Learner) {
  const start = await executeCommand(l.id, randomUUID(), {
    type: 'start',
    versionId: source.versionId,
    support: 'guided',
  });
  let s = await getSession(l.id, start.sessionId!);
  s = (
    await executeCommand(l.id, randomUUID(), {
      type: 'position',
      sessionId: s.id,
      expectedVersion: s.version,
      position: 2,
    })
  ).session!;
  s = (
    await executeCommand(l.id, randomUUID(), {
      type: 'begin-practice',
      sessionId: s.id,
      expectedVersion: s.version,
    })
  ).session!;
  for (const item of corpus[0].assessments)
    s = (
      await executeCommand(l.id, randomUUID(), {
        type: 'answer',
        sessionId: s.id,
        expectedVersion: s.version,
        assessmentId: item.id,
        answer: item.answer[0],
      })
    ).session!;
  return s;
}
async function coached(l: Learner, s: SessionView) {
  const run = await createCoachingRun(l.id, {
    key: randomUUID(),
    sessionId: s.id,
    answer: learnerAnswer,
    consent: true,
  });
  await processNextRun(
    { env, model: teachingMock('inspectAssignedSource', coachingDraft) },
    run.id,
  );
  return getRun(l.id, run.id);
}
before(async () => {
  await migrate();
});
beforeEach(async () => {
  await database().query('TRUNCATE learners CASCADE');
  await database().query('DELETE FROM provider_call_reservations');
  await database().query('DELETE FROM provider_result_cache');
  await database().query(
    "UPDATE content_versions SET state='released',revoked_at=NULL,expires_at=NULL,can_host=true,can_transcript=true,can_adapt=true,can_model=true",
  );
});
after(async () => {
  await database().query('TRUNCATE learners CASCADE');
  await database().query('DELETE FROM provider_call_reservations');
  await database().query('DELETE FROM provider_result_cache');
  await closeDatabase();
});
test('real durable enqueue is idempotent under concurrency and never silently accepts a changed payload', async () => {
  const l = await learner();
  const input = { key: randomUUID(), query: 'Fixture artist', entityType: 'artist' as const };
  const [a, b] = await Promise.all([
    createResolutionRun(l.id, input),
    createResolutionRun(l.id, input),
  ]);
  assert.equal(a.id, b.id);
  await assert.rejects(
    createResolutionRun(l.id, { ...input, query: 'Different artist' }),
    code('IDEMPOTENCY_CONFLICT'),
  );
  await assert.rejects(
    createResolutionRun(l.id, { ...input, key: randomUUID() }),
    code('RUN_ACTIVE'),
  );
  assert.equal(
    (await database().query('SELECT count(*)::int AS n FROM learning_runs')).rows[0].n,
    1,
  );
  const restored = (await getLiveOverview(l.id)).latestResolution;
  assert.equal(restored?.id, a.id);
  assert.equal(restored?.state, 'queued');
});
test('catalog identities require explicit confirmation of an owned actual result; forged and foreign identities fail', async () => {
  const a = await learner(),
    b = await learner();
  const run = await resolved(a);
  assert.equal((await getLiveOverview(a.id)).interests.length, 0);
  await assert.rejects(
    confirmInterest(a.id, { key: randomUUID(), runId: run.id, candidateId: fakeId(999) }),
    code('UNVERIFIED_IDENTITY'),
  );
  await assert.rejects(
    confirmInterest(b.id, { key: randomUUID(), runId: run.id, candidateId: fakeId(1) }),
    code('NOT_FOUND'),
  );
  await assert.rejects(getRun(b.id, run.id), code('NOT_FOUND'));
  const input = { key: randomUUID(), runId: run.id, candidateId: fakeId(1) };
  const current = await confirmInterest(a.id, input);
  const replay = await confirmInterest(a.id, input);
  assert.equal(current.interests.length, 1);
  assert.equal(current.profileVersion, 2);
  assert.equal(replay.profileVersion, 2);
});
test('identical catalog requests use cached evidence with the original timestamp and no second provider debit', async () => {
  const a = await learner(),
    b = await learner();
  let calls = 0;
  const runtime: WorkerRuntime = {
    env: qlooEnv,
    transport: async () => {
      calls++;
      return [searchRow()];
    },
  };
  const first = await createResolutionRun(a.id, {
    key: randomUUID(),
    query: 'Fixture artist',
    entityType: 'artist',
  });
  await processNextRun(runtime, first.id);
  const second = await createResolutionRun(b.id, {
    key: randomUUID(),
    query: 'Fixture artist',
    entityType: 'artist',
  });
  await processNextRun(runtime, second.id);
  const one = (await getRun(a.id, first.id)).result,
    two = (await getRun(b.id, second.id)).result;
  assert.equal(one?.mode, 'live');
  assert.equal(two?.mode, 'cached');
  assert.equal(one?.evidenceAt, two?.evidenceAt);
  assert.equal(calls, 1);
  assert.equal(
    (await database().query('SELECT count(*)::int AS n FROM provider_call_reservations')).rows[0].n,
    1,
  );
});
test('one worker claims a run; a saved provider checkpoint survives lease recovery without another call', async () => {
  const l = await learner();
  const run = await createResolutionRun(l.id, {
    key: randomUUID(),
    query: 'Fixture artist',
    entityType: 'artist',
  });
  const claims = await Promise.all([claimRun(run.id), claimRun(run.id)]);
  assert.equal(claims.filter(Boolean).length, 1);
  const original = claims.find((item) => item !== null)!;
  let calls = 0;
  const runtime: WorkerRuntime = {
    env: qlooEnv,
    transport: async () => {
      calls++;
      return [searchRow()];
    },
  };
  const firstResult = await executeLearningRun(original, runtime);
  await database().query(
    "UPDATE learning_runs SET lease_until=now()-interval '1 second' WHERE id=$1",
    [run.id],
  );
  const recovered = (await claimRun(run.id))!;
  assert.notEqual(recovered.lease_token, original.lease_token);
  await finishRun(recovered, await executeLearningRun(recovered, runtime));
  await assert.rejects(finishRun(original, firstResult), code('CANCELLED'));
  assert.equal(calls, 1);
  assert.equal((await getRun(l.id, run.id)).state, 'succeeded');
  assert.equal((await getRun(l.id, run.id)).attempts, 2);
});
test('an uncertain in-flight provider call is not automatically charged twice after a crash', async () => {
  const l = await learner();
  const run = await createResolutionRun(l.id, {
    key: randomUUID(),
    query: 'Fixture artist',
    entityType: 'artist',
  });
  const original = (await claimRun(run.id))!;
  await reserveProviderCall(original, 'qloo', 'search', qlooEnv);
  await database().query(
    "UPDATE learning_runs SET lease_until=now()-interval '1 second' WHERE id=$1",
    [run.id],
  );
  const recovered = (await claimRun(run.id))!;
  let calls = 0;
  await assert.rejects(
    executeLearningRun(recovered, {
      env: qlooEnv,
      transport: async () => {
        calls++;
        return [searchRow()];
      },
    }),
    code('INTERRUPTED'),
  );
  assert.equal(calls, 0);
  assert.equal(
    (await database().query('SELECT count(*)::int AS n FROM provider_call_reservations')).rows[0].n,
    1,
  );
  await failRun(recovered, new Error('No upstream diagnostics should escape.'));
  assert(!JSON.stringify(await getRun(l.id, run.id)).includes('upstream diagnostics'));
});
test('cancellation before claim costs nothing; cancellation during a call prevents late publication', async () => {
  const l = await learner();
  const first = await createResolutionRun(l.id, {
    key: randomUUID(),
    query: 'Fixture first',
    entityType: 'artist',
  });
  await cancelRun(l.id, first.id, randomUUID());
  let calls = 0;
  assert.equal(
    await processNextRun(
      {
        env: qlooEnv,
        transport: async () => {
          calls++;
          return [];
        },
      },
      first.id,
    ),
    false,
  );
  const second = await createResolutionRun(l.id, {
    key: randomUUID(),
    query: 'Fixture second',
    entityType: 'artist',
  });
  await processNextRun(
    {
      env: qlooEnv,
      transport: async () => {
        calls++;
        await cancelRun(l.id, second.id, randomUUID());
        return [searchRow()];
      },
    },
    second.id,
  );
  assert.equal(calls, 1);
  assert.equal((await getRun(l.id, second.id)).state, 'cancelled');
  assert.equal((await getRun(l.id, second.id)).result, null);
});
test('daily credential budget is atomic across learners and cannot be bypassed with another step name', async () => {
  const a = await learner(),
    b = await learner();
  const runs = await Promise.all(
    [a, b].map((l) =>
      createResolutionRun(l.id, {
        key: randomUUID(),
        query: 'Fixture artist',
        entityType: 'artist',
      }),
    ),
  );
  const jobs = await Promise.all(runs.map((run) => claimRun(run.id)));
  const limits = { ...qlooEnv, QLOO_DAILY_CALL_LIMIT: '1' };
  const reservations = await Promise.allSettled(
    jobs.map((job) => reserveProviderCall(job!, 'qloo', 'search', limits)),
  );
  assert.equal(reservations.filter((result) => result.status === 'fulfilled').length, 1);
  const successful = jobs[reservations.findIndex((result) => result.status === 'fulfilled')]!;
  await assert.rejects(
    reserveProviderCall(successful, 'qloo', 'another-step', {
      ...limits,
      QLOO_DAILY_CALL_LIMIT: '100',
    }),
    code('BUDGET'),
  );
  assert.equal(
    (await database().query('SELECT count(*)::int AS n FROM provider_call_reservations')).rows[0].n,
    1,
  );
});
test('durable discovery joins an exact shortlist to bounded AI study steps with a controlled baseline', async () => {
  const l = await learner(),
    current = await confirmed(l);
  const snapshot: DiscoverySnapshot = {
    profileVersion: current.profileVersion,
    profile,
    signals: current.interests,
    options: eligibleDiscoveryOptions(
      profile,
      corpus.map((item) => item.source),
      bridges,
      new Set(),
    ),
  };
  const ranks = [...bridges].reverse().map((item) => item.entityId);
  const steps = orderedOptions(snapshot, ranks)
    .slice(0, 3)
    .map((option) => ({
      bridgeKey: option.bridge.key,
      versionId: option.pieces[0].versionId,
      studyFocus: 'Notice a reason expressed in the opening passage.',
      warmupQuestion: 'What detail would catch your attention in this scene?',
      sourceQuote: option.pieces[0].segments[0].text.slice(0, 70),
    }));
  const run = await createDiscoveryRun(l.id, {
    key: randomUUID(),
    expectedVersion: current.profileVersion,
  });
  await processNextRun(
    {
      env,
      bridges,
      model: teachingMock('inspectEligibleCorpus', { steps }),
      transport: async (request) => {
        assert.equal(request.operation, 'insights');
        assert.deepEqual(
          (request as Extract<typeof request, { operation: 'insights' }>).candidates,
          bridges.map((item) => item.entityId),
        );
        return ranks.map((id) => ({ entity_id: id, types: ['urn:entity:movie'] }));
      },
    },
    run.id,
  );
  const result = (await getRun(l.id, run.id)).result;
  assert(result?.kind === 'discovery');
  assert.equal(result.planning.mode, 'ai');
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.recommendations[0].evidence.providerRank, 1);
  assert.equal(result.comparison.candidateCount, 6);
  assert(result.comparison.changedPositions > 0);
  assert.equal(
    (
      await database().query(
        'SELECT count(*)::int AS n FROM provider_call_reservations WHERE run_id=$1',
        [run.id],
      )
    ).rows[0].n,
    3,
  );
});
test('changing confirmed interests invalidates an in-flight or completed discovery before it can be served', async () => {
  const l = await learner(),
    current = await confirmed(l);
  const run = await createDiscoveryRun(l.id, {
    key: randomUUID(),
    expectedVersion: current.profileVersion,
  });
  let calls = 0;
  await processNextRun(
    {
      env: qlooEnv,
      bridges,
      transport: async (request) => {
        calls++;
        await removeInterest(l.id, { key: randomUUID(), entityId: fakeId(1) });
        return request.operation === 'insights'
          ? request.candidates.map((id) => ({ entity_id: id, types: ['urn:entity:movie'] }))
          : [];
      },
    },
    run.id,
  );
  assert.equal(calls, 1);
  const view = await getRun(l.id, run.id);
  assert.equal(view.result, null);
  assert.equal(view.error?.code, 'STALE_PROFILE');
  await assert.rejects(
    createDiscoveryRun(l.id, { key: randomUUID(), expectedVersion: current.profileVersion }),
    code('STALE_VERSION'),
  );
});
test('an unsupported AI study proposal falls back visibly while preserving actual Qloo evidence', async () => {
  const l = await learner(),
    current = await confirmed(l);
  const run = await createDiscoveryRun(l.id, {
    key: randomUUID(),
    expectedVersion: current.profileVersion,
  });
  await processNextRun(
    {
      env,
      bridges,
      model: teachingMock('inspectEligibleCorpus', { steps: [] }),
      transport: async (request) =>
        request.operation === 'insights'
          ? request.candidates.map((id) => ({ entity_id: id, types: ['urn:entity:movie'] }))
          : [],
    },
    run.id,
  );
  const view = await getRun(l.id, run.id);
  assert.equal(view.state, 'succeeded');
  assert(view.result?.kind === 'discovery');
  assert.equal(view.result.mode, 'live');
  assert.equal(view.result.planning.mode, 'deterministic');
  assert(view.trace.some((item) => item.stage === 'study-fallback'));
  assert(view.result.recommendations.every((card) => !card.evidence.studyFocus));
});
test('coaching needs explicit consent, owner-bound completed fixed practice, and never changes objective scores', async () => {
  const a = await learner(),
    b = await learner();
  const start = await executeCommand(a.id, randomUUID(), {
    type: 'start',
    versionId: source.versionId,
    support: 'guided',
  });
  await assert.rejects(
    createCoachingRun(a.id, {
      key: randomUUID(),
      sessionId: start.sessionId!,
      answer: learnerAnswer,
      consent: true,
    }),
    code('PRACTICE_NOT_READY'),
  );
  const s = await practiced(a);
  await assert.rejects(
    createCoachingRun(a.id, {
      key: randomUUID(),
      sessionId: s.id,
      answer: learnerAnswer,
      consent: false,
    } as never),
  );
  await assert.rejects(
    createCoachingRun(b.id, {
      key: randomUUID(),
      sessionId: s.id,
      answer: learnerAnswer,
      consent: true,
    }),
    code('NOT_FOUND'),
  );
  const view = await coached(a, s);
  assert.equal(view.state, 'succeeded');
  assert(view.result?.kind === 'coaching');
  assert.equal(view.result.corrections.length, 1);
  assert.equal(view.submittedAnswer, learnerAnswer);
  const after = await getSession(a.id, s.id);
  assert.deepEqual(after.responses, s.responses);
  assert.equal(after.version, s.version);
  assert.equal((await getLiveOverview(a.id)).profileVersion, a.version);
  assert.equal((await getCoachingHistory(a.id, s.id)).remaining, 2);
});
test('model permissions are checked again after generation; revocation never releases late feedback', async () => {
  const l = await learner(),
    s = await practiced(l);
  const run = await createCoachingRun(l.id, {
    key: randomUUID(),
    sessionId: s.id,
    answer: learnerAnswer,
    consent: true,
  });
  try {
    await processNextRun(
      {
        env,
        model: teachingMock('inspectAssignedSource', coachingDraft, async (step) => {
          if (step === 1)
            await database().query('UPDATE content_versions SET can_model=false WHERE id=$1', [
              source.versionId,
            ]);
        }),
      },
      run.id,
    );
    const view = await getRun(l.id, run.id);
    assert.equal(view.result, null);
    assert.equal(view.error?.code, 'SOURCE_PERMISSION');
    assert.equal(view.submittedAnswer, undefined);
    assert.equal(
      (await database().query('SELECT result FROM learning_runs WHERE id=$1', [run.id])).rows[0]
        .result,
      null,
    );
    const exported = JSON.stringify(await exportLiveLearner(l.id));
    assert(!exported.includes(coachingDraft.sourceEvidence[0].quote));
    assert(!exported.includes(learnerAnswer));
  } finally {
    await database().query('UPDATE content_versions SET can_model=true WHERE id=$1', [
      source.versionId,
    ]);
  }
});
test('a saved coaching result is hidden on rights withdrawal, including history, export and keyed replay', async () => {
  const l = await learner(),
    s = await practiced(l);
  const input = {
    key: randomUUID(),
    sessionId: s.id,
    answer: learnerAnswer,
    consent: true as const,
  };
  const run = await createCoachingRun(l.id, input);
  await processNextRun(
    { env, model: teachingMock('inspectAssignedSource', coachingDraft) },
    run.id,
  );
  assert.equal((await getRun(l.id, run.id)).state, 'succeeded');
  try {
    await database().query("UPDATE content_versions SET state='withdrawn' WHERE id=$1", [
      source.versionId,
    ]);
    assert.equal((await getRun(l.id, run.id)).result, null);
    assert.equal((await createCoachingRun(l.id, input)).result, null);
    await assert.rejects(getCoachingHistory(l.id, s.id), code('SOURCE_UNAVAILABLE'));
    assert(!JSON.stringify(await exportLiveLearner(l.id)).includes(coachingDraft.modelAnswer));
  } finally {
    await database().query("UPDATE content_versions SET state='released' WHERE id=$1", [
      source.versionId,
    ]);
  }
});
test('three coaching attempts are a server limit, and deletion removes only the current guest live data', async () => {
  const a = await learner(),
    b = await learner(),
    s = await practiced(a);
  await confirmed(b);
  const attempts = [];
  for (let index = 0; index < 3; index++) {
    const run = await coached(a, s);
    assert.equal(run.state, 'succeeded');
    attempts.push(run);
  }
  await assert.rejects(
    createCoachingRun(a.id, {
      key: randomUUID(),
      sessionId: s.id,
      answer: learnerAnswer,
      consent: true,
    }),
    code('COACHING_LIMIT'),
  );
  const history = await getCoachingHistory(a.id, s.id);
  assert.equal(history.remaining, 0);
  assert.equal(history.runs[0].id, attempts[2].id);
  assert.equal(history.runs[0].submittedAnswer, learnerAnswer);
  await deleteLearner(a.id);
  for (const table of ['learning_runs', 'taste_signals', 'live_idempotency'])
    assert.equal(
      (
        await database().query(`SELECT count(*)::int AS n FROM ${table} WHERE learner_id=$1`, [
          a.id,
        ])
      ).rows[0].n,
      0,
    );
  assert.equal((await getLiveOverview(b.id)).interests.length, 1);
  assert.equal(
    (
      await database().query(
        'SELECT count(*)::int AS n FROM provider_call_reservations WHERE run_id IS NULL',
      )
    ).rows[0].n,
    6,
  );
});
test('source corruption fails closed and migration never rewrites a published assessment or restores revoked permissions', async () => {
  const original = (
    await database().query('SELECT source FROM content_versions WHERE id=$1', [source.versionId])
  ).rows[0].source;
  try {
    await database().query(
      "UPDATE content_versions SET source=jsonb_set(source,'{title}','\"Changed without a new version\"') WHERE id=$1",
      [source.versionId],
    );
    await assert.rejects(getSource(source.versionId), code('SOURCE_UNAVAILABLE'));
    await assert.rejects(migrate(), /immutable/);
  } finally {
    await database().query('UPDATE content_versions SET source=$2 WHERE id=$1', [
      source.versionId,
      JSON.stringify(original),
    ]);
  }
  const itemId = corpus[0].assessments[0].id;
  const publicItem = (
    await database().query('SELECT public_item FROM assessment_items WHERE id=$1', [itemId])
  ).rows[0].public_item;
  try {
    await database().query(
      "UPDATE assessment_items SET public_item=jsonb_set(public_item,'{prompt}','\"Changed after release\"') WHERE id=$1",
      [itemId],
    );
    await assert.rejects(migrate(), /Published assessment.*immutable/);
  } finally {
    await database().query('UPDATE assessment_items SET public_item=$2 WHERE id=$1', [
      itemId,
      JSON.stringify(publicItem),
    ]);
  }
  try {
    await database().query('UPDATE content_versions SET can_model=false WHERE id=$1', [
      source.versionId,
    ]);
    await migrate();
    assert.equal(
      (
        await database().query('SELECT can_model FROM content_versions WHERE id=$1', [
          source.versionId,
        ])
      ).rows[0].can_model,
      false,
    );
  } finally {
    await database().query('UPDATE content_versions SET can_model=true WHERE id=$1', [
      source.versionId,
    ]);
  }
});
test('media manifests and byte-range delivery are owner-bound and recheck rights on every request', async () => {
  const a = await learner(),
    b = await learner();
  const listening = corpus.find((item) => item.source.format === 'listen')!.source;
  const s = (
    await executeCommand(a.id, randomUUID(), {
      type: 'start',
      versionId: listening.versionId,
      support: 'guided',
    })
  ).sessionId!;
  const directory = await mkdtemp(join(tmpdir(), 'immersion-media-test-'));
  const previous = process.env.IMMERSION_AUDIO_DIRECTORY;
  process.env.IMMERSION_AUDIO_DIRECTORY = directory;
  const asset = {
    pieceId: listening.id,
    versionId: listening.versionId,
    sourceHash: narrationSourceHash(listening),
    audioFile: 'fixture.mp3',
    durationSeconds: 30,
    segments: listening.segments.map((segment, index) => ({
      id: segment.id,
      startSeconds: index * 10,
      endSeconds: (index + 1) * 10,
    })),
    voice: 'Fixture voice',
    model: 'fixture-model',
  };
  try {
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ assets: [asset] }));
    await writeFile(join(directory, 'fixture.mp3'), Buffer.from([1, 2, 3, 4, 5, 6]));
    const manifest = await getMediaManifest(a.id, s);
    assert.equal(manifest.available, true);
    await assert.rejects(getMediaManifest(b.id, s), code('NOT_FOUND'));
    const range = await mediaResponse(
      a.id,
      s,
      new Request(`http://localhost/api/media/${s}`, { headers: { Range: 'bytes=1-3' } }),
    );
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), 'bytes 1-3/6');
    assert.match(range.headers.get('cache-control')!, /no-store/);
    assert.deepEqual([...new Uint8Array(await range.arrayBuffer())], [2, 3, 4]);
    const head = await mediaResponse(
      a.id,
      s,
      new Request(`http://localhost/api/media/${s}`, { method: 'HEAD' }),
    );
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), '6');
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    await database().query('UPDATE content_versions SET can_model=false WHERE id=$1', [
      listening.versionId,
    ]);
    assert.equal((await getMediaManifest(a.id, s)).available, true);
    await database().query('UPDATE content_versions SET can_host=false WHERE id=$1', [
      listening.versionId,
    ]);
    await assert.rejects(
      mediaResponse(
        a.id,
        s,
        new Request(`http://localhost/api/media/${s}`, { headers: { Range: 'bytes=0-1' } }),
      ),
      code('SOURCE_UNAVAILABLE'),
    );
    await assert.rejects(getMediaManifest(a.id, s), code('SOURCE_UNAVAILABLE'));
  } finally {
    await database().query('UPDATE content_versions SET can_host=true,can_model=true WHERE id=$1', [
      listening.versionId,
    ]);
    if (previous === undefined) delete process.env.IMMERSION_AUDIO_DIRECTORY;
    else process.env.IMMERSION_AUDIO_DIRECTORY = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
