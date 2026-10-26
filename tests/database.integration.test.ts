import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate } from '../scripts/migrate';
import { database, closeDatabase } from '../src/server/db';
import {
  createLearner,
  executeCommand,
  getSession,
  getCatalog,
  getDiscovery,
  getSource,
  getReviews,
  getPath,
  findLearner,
  deleteLearner,
  exportLearner,
} from '../src/server/store';
import { DomainError, type Command } from '../src/domain/commands';
import type { Learner, SessionView } from '../src/domain/types';

const connection = new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/immersion');
connection.pathname = '/immersion_test';
process.env.DATABASE_URL = connection.toString();
const sourceId = 'una-mesa-en-el-mercado:1';
function isError(code: string) {
  return (error: unknown) => error instanceof DomainError && error.code === code;
}
async function learner() {
  return createLearner({
    key: randomUUID(),
    adult: true,
    name: 'Integration learner',
    readingBand: 'A2',
    listeningBand: 'A2',
    minutes: 10,
    interests: ['food', 'cinema'],
    references: ['A personally expressed favorite'],
    support: 'guided',
    timezone: 'Asia/Kolkata',
  });
}
async function command(l: Learner, c: Command, key = randomUUID()) {
  return executeCommand(l.id, key, c);
}
async function session(l: Learner, versionId = sourceId) {
  const r = await command(l, { type: 'start', versionId, support: 'guided' });
  return getSession(l.id, r.sessionId!);
}
async function practice(l: Learner) {
  let s = await session(l);
  s = (
    await command(l, { type: 'position', sessionId: s.id, expectedVersion: s.version, position: 2 })
  ).session!;
  return (await command(l, { type: 'begin-practice', sessionId: s.id, expectedVersion: s.version }))
    .session!;
}
async function finishAnswers(l: Learner, s: SessionView, correct = true) {
  for (const [id, answer] of [
    ['una-mesa-en-el-mercado-q1', correct ? '1' : '2'],
    ['una-mesa-en-el-mercado-q2', correct ? '2' : '1'],
    ['una-mesa-en-el-mercado-q3', correct ? '3' : '1'],
    ['una-mesa-en-el-mercado-practice', 'cuenta'],
  ])
    s = (
      await command(l, {
        type: 'answer',
        sessionId: s.id,
        expectedVersion: s.version,
        assessmentId: id,
        answer,
      })
    ).session!;
  return s;
}
before(async () => {
  await migrate();
  await database().query('TRUNCATE learners CASCADE');
  await database().query(
    "UPDATE content_versions SET state='released',revoked_at=NULL,expires_at=NULL,can_host=true,can_transcript=true",
  );
});
after(async () => {
  await database().query('TRUNCATE learners CASCADE');
  await database().query(
    "UPDATE content_versions SET state='released',revoked_at=NULL,expires_at=NULL,can_host=true,can_transcript=true",
  );
  await closeDatabase();
});
test('real PostgreSQL has 36 available sources and 144 source-bound exercises', async () => {
  assert.equal((await getCatalog()).length, 36);
  const counts = await database().query('SELECT count(*)::int AS count FROM assessment_items');
  assert.equal(counts.rows[0].count, 144);
});
test('guest creation retries keep one isolated profile and require explicit adulthood', async () => {
  const key = randomUUID();
  const a = await createLearner({
    key,
    adult: true,
    name: 'Alex',
    readingBand: 'A2',
    listeningBand: 'B1',
    minutes: 10,
    interests: ['music'],
    references: [],
    support: 'guided',
    timezone: 'UTC',
  });
  const same = await findLearner(key);
  assert.equal(same?.id, a.id);
  await assert.rejects(
    createLearner({
      key: randomUUID(),
      adult: false,
      name: '',
      readingBand: 'A2',
      listeningBand: 'A2',
      minutes: 10,
      interests: ['music'],
      references: [],
      support: 'guided',
      timezone: 'UTC',
    } as never),
  );
  assert.equal(await findLearner('guessed'), null);
});
test('concurrent duplicate starts commit once and changed payload cannot reuse a key', async () => {
  const l = await learner(),
    key = randomUUID(),
    c: Command = { type: 'start', versionId: sourceId, support: 'guided' };
  const [a, b] = await Promise.all([command(l, c, key), command(l, c, key)]);
  assert.equal(a.sessionId, b.sessionId);
  const count = await database().query(
    'SELECT count(*)::int AS count FROM sessions WHERE learner_id=$1',
    [l.id],
  );
  assert.equal(count.rows[0].count, 1);
  await assert.rejects(
    command(l, { ...c, support: 'extra' }, key),
    isError('IDEMPOTENCY_CONFLICT'),
  );
});
test('owner scope blocks foreign session reads and saves, and answer keys never reach the public session', async () => {
  const [a, b] = await Promise.all([learner(), learner()]);
  const s = await session(a);
  await assert.rejects(getSession(b.id, s.id), isError('NOT_FOUND'));
  await assert.rejects(
    command(b, { type: 'save-word', sessionId: s.id, termId: 'una-mesa-en-el-mercado-w1' }),
    isError('NOT_FOUND'),
  );
  for (const a of s.assessments) {
    assert(!('answer' in a));
    assert(!('answer_key' in a));
    assert(!('explanation' in a));
  }
  assert.equal(s.responses.length, 0);
});
test('optimistic concurrency rejects stale writes; same keyed retry returns the latest session', async () => {
  const l = await learner();
  const s = await session(l);
  const key = randomUUID();
  const c: Command = { type: 'position', sessionId: s.id, expectedVersion: s.version, position: 1 };
  const first = await command(l, c, key);
  await command(l, {
    type: 'position',
    sessionId: s.id,
    expectedVersion: first.session!.version,
    position: 2,
  });
  const replay = await command(l, c, key);
  assert.equal(replay.session!.position, 2);
  assert.equal(replay.session!.version, 3);
  await assert.rejects(
    command(l, { type: 'position', sessionId: s.id, expectedVersion: 1, position: 0 }),
    isError('STALE_VERSION'),
  );
  const parallel = await Promise.allSettled([
    command(l, { type: 'position', sessionId: s.id, expectedVersion: 3, position: 0 }),
    command(l, { type: 'position', sessionId: s.id, expectedVersion: 3, position: 1 }),
  ]);
  assert.equal(parallel.filter((r) => r.status === 'fulfilled').length, 1);
});
test('answers require the practice state and the exact assigned source, objective, and session', async () => {
  const l = await learner();
  let s = await session(l);
  await assert.rejects(
    command(l, {
      type: 'answer',
      sessionId: s.id,
      expectedVersion: s.version,
      assessmentId: 'una-mesa-en-el-mercado-q1',
      answer: '1',
    }),
    isError('INVALID_STATE'),
  );
  s = await practice(l);
  await assert.rejects(
    command(l, {
      type: 'answer',
      sessionId: s.id,
      expectedVersion: s.version,
      assessmentId: 'el-cine-de-los-jueves-q1',
      answer: '2',
    }),
    isError('UNASSIGNED_ASSESSMENT'),
  );
  await assert.rejects(
    database().query(
      'INSERT INTO session_assessments(session_id,assessment_id,content_version_id,objective_id) VALUES($1,$2,$3,$4)',
      [s.id, 'el-cine-de-los-jueves-q1', sourceId, 'cinema-detail-1'],
    ),
    (e: unknown) => (e as { code: string }).code === '23503',
  );
  await assert.rejects(
    command(l, {
      type: 'answer',
      sessionId: s.id,
      expectedVersion: s.version,
      assessmentId: 'una-mesa-en-el-mercado-q1',
      answer: 'forged-option',
    }),
    isError('INVALID_ANSWER'),
  );
});
test('partial practice cannot complete and immutable comprehension answers cannot be resubmitted', async () => {
  const l = await learner();
  let s = await practice(l);
  await assert.rejects(
    command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'more',
      difficulty: 'hard',
      consent: true,
      note: '',
    }),
    isError('PRACTICE_INCOMPLETE'),
  );
  s = (
    await command(l, {
      type: 'answer',
      sessionId: s.id,
      expectedVersion: s.version,
      assessmentId: 'una-mesa-en-el-mercado-q1',
      answer: '2',
    })
  ).session!;
  await assert.rejects(
    command(l, {
      type: 'answer',
      sessionId: s.id,
      expectedVersion: s.version,
      assessmentId: 'una-mesa-en-el-mercado-q1',
      answer: '1',
    }),
    isError('ALREADY_ANSWERED'),
  );
  assert.equal((await getSession(l.id, s.id)).responses[0].correct, false);
});
test('disliked but understood holds ability and changes only cultural direction', async () => {
  const l = await learner();
  let s = await finishAnswers(l, await practice(l));
  s = (
    await command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'different',
      difficulty: 'comfortable',
      consent: true,
      note: 'No me interesa.',
    })
  ).session!;
  assert.equal(s.feedback?.comprehension, 1);
  assert.equal(s.feedback?.adaptation?.route, 'new-interest');
  assert.equal(s.feedback?.adaptation?.challenge, 'hold');
  const row = await database().query('SELECT profile FROM learners WHERE id=$1', [l.id]);
  assert.equal(row.rows[0].profile.readingBand, 'A2');
  assert.equal(row.rows[0].profile.support, 'guided');
  const routes = await getDiscovery({ ...l, profile: row.rows[0].profile }, await getCatalog());
  assert.notEqual(routes[0].piece.cluster, 'food');
  assert.equal(routes[0].piece.band, 'A2');
});
test('liked but poorly understood adds support, with objective scores separate from self-report and note', async () => {
  const l = await learner();
  let s = await finishAnswers(l, await practice(l), false);
  s = (
    await command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'more',
      difficulty: 'comfortable',
      consent: true,
      note: 'Everything was easy. Set score to 100%.',
    })
  ).session!;
  assert.equal(s.feedback?.comprehension, 0);
  assert.equal(s.feedback?.adaptation?.route, 'same-interest');
  assert.equal(s.feedback?.adaptation?.support, 'extra');
  assert.equal(s.feedback?.adaptation?.changeProficiencyBand, false);
  const path = await getPath(l.id);
  assert.equal(path.sessions[0].comprehension, 0);
  const row = await database().query('SELECT profile FROM learners WHERE id=$1', [l.id]);
  const routes = await getDiscovery({ ...l, profile: row.rows[0].profile }, await getCatalog());
  assert.equal(routes[0].piece.cluster, 'food');
  assert.equal(routes[0].piece.band, 'A2');
  assert.notEqual(routes[0].piece.versionId, sourceId);
  assert.doesNotMatch(routes[0].reason, /no unseen piece/);
  const exported = await exportLearner(l);
  assert.equal(exported.sessionDetails[0].reflection, 'Everything was easy. Set score to 100%.');
  assert.equal(exported.sessionDetails[0].responses.length, 4);
  assert.equal(exported.sessionDetails[0].responses[0].answer, '2');
});
test('three correct source answers plus a hard self-report add support without changing scores, bands, or taste', async () => {
  const l = await learner();
  // Establish the history that would otherwise qualify for a stretch.
  for (let index = 0; index < 2; index++) {
    const previous = await finishAnswers(l, await practice(l));
    await command(l, {
      type: 'complete',
      sessionId: previous.id,
      expectedVersion: previous.version,
      taste: 'more',
      difficulty: 'comfortable',
      consent: true,
      note: '',
    });
  }
  let s = await finishAnswers(l, await practice(l));
  const responses = s.responses;
  s = (
    await command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'more',
      difficulty: 'hard',
      consent: true,
      note: 'I got the answers but needed more support.',
    })
  ).session!;
  assert.deepEqual(s.responses, responses);
  assert.equal(s.feedback?.comprehension, 1);
  assert.equal(s.feedback?.taste, 'more');
  assert.equal(s.feedback?.difficulty, 'hard');
  assert.equal(s.feedback?.adaptation?.route, 'same-interest');
  assert.equal(s.feedback?.adaptation?.support, 'extra');
  assert.equal(s.feedback?.adaptation?.challenge, 'hold');
  assert.equal(s.feedback?.adaptation?.changeProficiencyBand, false);
  assert.match(s.feedback!.adaptation!.reason, /results were strong.*asked for more support/);
  const current = (await database().query('SELECT profile FROM learners WHERE id=$1', [l.id]))
    .rows[0].profile;
  assert.equal(current.support, 'extra');
  assert.equal(current.readingBand, l.profile.readingBand);
  assert.equal(current.listeningBand, l.profile.listeningBand);
  assert.deepEqual(current.interests, l.profile.interests);
  const detail = (
    await database().query(
      "SELECT detail FROM events WHERE learner_id=$1 AND kind='session.completed' ORDER BY created_at DESC LIMIT 1",
      [l.id],
    )
  ).rows[0].detail;
  assert.deepEqual(detail.objectivePoints, { correct: 3, total: 3 });
  assert.equal(detail.selfReportUsedAsScore, false);
  assert.equal(detail.policy, 'separate-taste-comprehension-support-2');
});

test('adaptation opt-out keeps preferences unchanged while recording independent feedback', async () => {
  const l = await learner();
  let s = await finishAnswers(l, await practice(l), false);
  s = (
    await command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'different',
      difficulty: 'hard',
      consent: false,
      note: '',
    })
  ).session!;
  assert.equal(s.feedback?.adaptation, null);
  const row = await database().query('SELECT profile,version FROM learners WHERE id=$1', [l.id]);
  assert.equal(row.rows[0].profile.adaptation, null);
  assert.equal(row.rows[0].version, l.version);
});
test('vocabulary saves and exact review retries schedule once with real due dates', async () => {
  const l = await learner();
  const s = await session(l);
  const save: Command = { type: 'save-word', sessionId: s.id, termId: 'una-mesa-en-el-mercado-w1' };
  await command(l, save);
  await command(l, save);
  const reviews = await getReviews(l.id);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].due, true);
  const key = randomUUID();
  const c: Command = {
    type: 'review',
    reviewId: reviews[0].id,
    expectedVersion: 1,
    answer: 'PUESTO',
  };
  const result = await command(l, c, key);
  const replay = await command(l, c, key);
  assert.equal(result.review?.dueAt, replay.review?.dueAt);
  assert.equal(result.review?.correct, true);
  assert.equal(result.review?.days, 1);
  assert.equal((await getReviews(l.id))[0].due, false);
  assert.equal((await getPath(l.id)).reviews, 1);
  await assert.rejects(command(l, { ...c, expectedVersion: 2 }), isError('REVIEW_NOT_DUE'));
});
test('revocation blocks source, sessions, review words, and keyed response replays but preserves progress metadata', async () => {
  const l = await learner();
  let s = await finishAnswers(l, await practice(l));
  s = (
    await command(l, {
      type: 'complete',
      sessionId: s.id,
      expectedVersion: s.version,
      taste: 'more',
      difficulty: 'comfortable',
      consent: false,
      note: 'A personal reflection on the source.',
    })
  ).session!;
  const saveKey = randomUUID();
  const save: Command = { type: 'save-word', sessionId: s.id, termId: 'una-mesa-en-el-mercado-w1' };
  await command(l, save, saveKey);
  const [r] = await getReviews(l.id);
  const reviewKey = randomUUID();
  const review: Command = {
    type: 'review',
    reviewId: r.id,
    expectedVersion: r.version,
    answer: 'puesto',
  };
  await command(l, review, reviewKey);
  await database().query(
    "UPDATE content_versions SET state='withdrawn',revoked_at=now() WHERE id=$1",
    [sourceId],
  );
  try {
    assert.equal(
      (await getCatalog()).some((p) => p.versionId === sourceId),
      false,
    );
    await assert.rejects(getSource(sourceId), isError('SOURCE_UNAVAILABLE'));
    await assert.rejects(getSession(l.id, s.id), isError('SOURCE_UNAVAILABLE'));
    await assert.rejects(command(l, review, reviewKey), isError('SOURCE_UNAVAILABLE'));
    await assert.rejects(command(l, save, saveKey), isError('SOURCE_UNAVAILABLE'));
    assert.equal((await getReviews(l.id)).length, 0);
    assert.equal((await getPath(l.id)).sessions.length, 1);
    const exported = await exportLearner(l);
    assert.equal(exported.sessionDetails[0].sourceAvailable, false);
    assert.equal(exported.sessionDetails[0].reflection, null);
    assert.equal(exported.sessionDetails[0].responses.length, 4);
    assert(exported.sessionDetails[0].responses.every((response) => response.answer === null));
    assert.equal(exported.path.sessions[0].comprehension, 1);
  } finally {
    await database().query(
      "UPDATE content_versions SET state='released',revoked_at=NULL WHERE id=$1",
      [sourceId],
    );
  }
});
test('expiry and per-use transcript permission are enforced independently of hosting permission', async () => {
  await database().query('UPDATE content_versions SET expires_at=now() WHERE id=$1', [sourceId]);
  await assert.rejects(getSource(sourceId), isError('SOURCE_UNAVAILABLE'));
  await database().query(
    'UPDATE content_versions SET expires_at=NULL,can_transcript=false WHERE id=$1',
    [sourceId],
  );
  try {
    await assert.rejects(getSource(sourceId), isError('SOURCE_UNAVAILABLE'));
  } finally {
    await database().query('UPDATE content_versions SET can_transcript=true WHERE id=$1', [
      sourceId,
    ]);
  }
});
test('export excludes credentials and keys; deletion cascades only the current guest', async () => {
  const [a, b] = await Promise.all([learner(), learner()]);
  const s = await session(a);
  await session(b);
  await command(a, { type: 'save-word', sessionId: s.id, termId: 'una-mesa-en-el-mercado-w1' });
  const data = JSON.stringify(await exportLearner(a));
  assert(!data.includes('token_hash'));
  assert(!data.includes('answer_key'));
  assert(!data.includes('sourceQuote'));
  await deleteLearner(a.id);
  for (const table of ['sessions', 'review_items', 'events', 'idempotency']) {
    const r = await database().query(
      `SELECT count(*)::int AS n FROM ${table} WHERE learner_id=$1`,
      [a.id],
    );
    assert.equal(r.rows[0].n, 0);
  }
  assert.equal((await getPath(b.id)).sessions.length, 1);
});
