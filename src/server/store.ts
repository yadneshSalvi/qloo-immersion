import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { database, transaction } from './db';
import {
  commandSchema,
  onboardingSchema,
  DomainError,
  normalizeAnswer,
  type Command,
  type Onboarding,
} from '../domain/commands';
import {
  canUseSource,
  chooseAdaptation,
  isAssignedAssessment,
  scheduleReview,
  type RightsRecord,
  type SupportMode,
} from '../domain/learning';
import type {
  Learner,
  Source,
  Piece,
  Profile,
  PublicAssessment,
  SessionView,
  ReviewView,
  PathView,
  TraceEvent,
  DiscoveryCard,
} from '../domain/types';

type Queryable = Pick<PoolClient, 'query'>;
type LearnerRow = { id: string; profile: Profile; version: number; created_at: Date };
type ContentRow = {
  id: string;
  source: Source;
  state: 'released' | 'withdrawn';
  revoked_at: Date | null;
  expires_at: Date | null;
  can_host: boolean;
  can_transcript: boolean;
  can_adapt: boolean;
  can_model: boolean;
};
type SessionRow = {
  id: string;
  learner_id: string;
  content_version_id: string;
  state: SessionView['state'];
  position: number;
  support: SupportMode;
  version: number;
  feedback: SessionView['feedback'];
  note: string;
  started_at: Date;
  completed_at: Date | null;
};
type AssessmentRow = {
  id: string;
  content_version_id: string;
  objective_id: string;
  kind: 'comprehension' | 'practice';
  public_item: PublicAssessment;
  answer_key: { answer: string[]; explanation: string };
};
const iso = (value: Date | string) => (typeof value === 'string' ? value : value.toISOString());
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const toLearner = (row: LearnerRow): Learner => ({
  id: row.id,
  profile: row.profile,
  version: row.version,
  createdAt: iso(row.created_at),
});
function pieceOnly(source: Source): Piece {
  const { segments: _segments, glossary: _glossary, ...piece } = source;
  return piece;
}
export function rightsFor(row: ContentRow): RightsRecord {
  return {
    versionId: row.id,
    state: row.state,
    revoked: row.revoked_at !== null,
    expiresAt: row.expires_at?.getTime() ?? null,
    canHost: row.can_host,
    canShowTranscript: row.can_transcript,
    canAdapt: row.can_adapt,
    canProcessWithModel: row.can_model,
  };
}
function eligible(row: ContentRow) {
  const r = rightsFor(row);
  return (
    canUseSource(r, row.id, 'host', Date.now()) && canUseSource(r, row.id, 'transcript', Date.now())
  );
}
export async function getSource(id: string, client: Queryable = database()): Promise<Source> {
  const result = await client.query<ContentRow>(
    'SELECT * FROM content_versions WHERE id=$1 OR slug=$1',
    [id],
  );
  const row = result.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'This piece could not be found.', 404);
  if (!eligible(row))
    throw new DomainError(
      'SOURCE_UNAVAILABLE',
      'This piece is no longer available. Your progress is saved.',
      410,
    );
  return row.source;
}
export async function getCatalog(client: Queryable = database()): Promise<Piece[]> {
  const result = await client.query<ContentRow>(
    "SELECT * FROM content_versions ORDER BY source->>'issue'",
  );
  return result.rows.filter(eligible).map((row) => pieceOnly(row.source));
}
export async function findLearner(
  token?: string,
  client: Queryable = database(),
): Promise<Learner | null> {
  if (!token || !/^[\da-f-]{36}$/i.test(token)) return null;
  const result = await client.query<LearnerRow>(
    'SELECT id,profile,version,created_at FROM learners WHERE token_hash=$1',
    [hash(token)],
  );
  return result.rows[0] ? toLearner(result.rows[0]) : null;
}
export async function createLearner(input: Onboarding): Promise<Learner> {
  const parsed = onboardingSchema.parse(input);
  return transaction(async (client) => {
    const profile: Profile = {
      name: parsed.name,
      readingBand: parsed.readingBand,
      listeningBand: parsed.listeningBand,
      minutes: parsed.minutes,
      interests: parsed.interests,
      references: parsed.references,
      support: parsed.support,
      timezone: parsed.timezone,
      adaptation: null,
    };
    const result = await client.query<LearnerRow>(
      `INSERT INTO learners(id,token_hash,age_confirmed_at,profile) VALUES($1,$2,now(),$3)
      ON CONFLICT(token_hash) DO NOTHING RETURNING id,profile,version,created_at`,
      [randomUUID(), hash(parsed.key), JSON.stringify(profile)],
    );
    if (!result.rows[0]) {
      const existing = await findLearner(parsed.key, client);
      if (!existing)
        throw new DomainError('RETRY', 'Please try creating your path again.', 409, true);
      return existing;
    }
    const learner = toLearner(result.rows[0]);
    await event(client, learner.id, 'path.created', 'Your starting point is saved.', {
      mode: 'authored-sample',
      readingBand: profile.readingBand,
      listeningBand: profile.listeningBand,
      basis: 'Self-selected working bands, not certified CEFR',
      interestCategories: profile.interests,
      qlooCalls: 0,
    });
    return learner;
  });
}
async function event(
  client: Queryable,
  learnerId: string,
  kind: string,
  summary: string,
  detail: Record<string, unknown>,
) {
  await client.query(
    'INSERT INTO events(id,learner_id,kind,summary,detail) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(), learnerId, kind, summary, JSON.stringify(detail)],
  );
}
async function ownSession(
  learnerId: string,
  sessionId: string,
  client: Queryable,
): Promise<SessionRow> {
  const result = await client.query<SessionRow>(
    'SELECT * FROM sessions WHERE id=$1 AND learner_id=$2',
    [sessionId, learnerId],
  );
  if (!result.rows[0])
    throw new DomainError(
      'NOT_FOUND',
      'This session is not available in your learning space.',
      404,
    );
  return result.rows[0];
}
function checkVersion(actual: number, expected: number) {
  if (actual !== expected)
    throw new DomainError(
      'STALE_VERSION',
      'This page has changed in another tab. Reload to continue with your saved progress.',
      409,
      true,
    );
}
async function bumpSession(client: Queryable, id: string) {
  await client.query('UPDATE sessions SET version=version+1 WHERE id=$1', [id]);
}
export async function getSession(
  learnerId: string,
  sessionId: string,
  client: Queryable = database(),
): Promise<SessionView> {
  const row = await ownSession(learnerId, sessionId, client);
  const piece = await getSource(row.content_version_id, client);
  // A transaction owns one PostgreSQL connection; issue its queries sequentially.
  const questions = await client.query<{ public_item: PublicAssessment }>(
    `SELECT a.public_item FROM assessment_items a JOIN session_assessments sa ON sa.assessment_id=a.id WHERE sa.session_id=$1 ORDER BY a.kind,a.id`,
    [sessionId],
  );
  const responses = await client.query<{
    assessment_id: string;
    answer: string;
    correct: boolean;
    feedback: string;
    source_quote: string;
    attempts: number;
  }>('SELECT * FROM responses WHERE session_id=$1', [sessionId]);
  const words = await client.query<{ term_id: string }>(
    'SELECT term_id FROM review_items WHERE learner_id=$1 AND content_version_id=$2',
    [learnerId, row.content_version_id],
  );
  return {
    id: row.id,
    version: row.version,
    state: row.state,
    position: row.position,
    support: row.support,
    piece,
    assessments: questions.rows.map((q) => q.public_item),
    responses: responses.rows.map((r) => ({
      assessmentId: r.assessment_id,
      answer: r.answer,
      correct: r.correct,
      feedback: r.feedback,
      sourceQuote: r.source_quote,
      attempts: r.attempts,
    })),
    savedWordIds: words.rows.map((w) => w.term_id),
    note: row.note,
    startedAt: iso(row.started_at),
    completedAt: row.completed_at ? iso(row.completed_at) : null,
    feedback: row.feedback,
  };
}
export async function getResume(
  learnerId: string,
): Promise<{ id: string; title: string; state: string } | null> {
  const result = await database().query<{ id: string; content_version_id: string; state: string }>(
    "SELECT id,content_version_id,state FROM sessions WHERE learner_id=$1 AND state<>'completed' ORDER BY started_at DESC LIMIT 10",
    [learnerId],
  );
  for (const row of result.rows) {
    try {
      const source = await getSource(row.content_version_id);
      return { id: row.id, title: source.title, state: row.state };
    } catch (e) {
      if (!(e instanceof DomainError && e.status === 410)) throw e;
    }
  }
  return null;
}
export async function getBookmarks(learnerId: string): Promise<string[]> {
  const rows = await database().query<{ content_version_id: string }>(
    'SELECT content_version_id FROM bookmarks WHERE learner_id=$1',
    [learnerId],
  );
  return rows.rows.map((r) => r.content_version_id);
}
export async function getDiscovery(learner: Learner, catalog: Piece[]): Promise<DiscoveryCard[]> {
  const completed = await database().query<{ content_version_id: string }>(
    "SELECT content_version_id FROM sessions WHERE learner_id=$1 AND state='completed'",
    [learner.id],
  );
  const seen = new Set(completed.rows.map((row) => row.content_version_id));
  const p = learner.profile;
  const atBand = catalog.filter(
    (piece) => piece.band === (piece.format === 'read' ? p.readingBand : p.listeningBand),
  );
  const fresh = atBand.filter((piece) => !seen.has(piece.versionId));
  let pool = fresh.length >= 3 ? fresh : atBand;
  const sameThread = p.adaptation?.route === 'same-interest' ? p.adaptation.cluster : null;
  if (sameThread) {
    // With one sample per cluster/band, an honest supported revisit is better than
    // claiming the thread is preserved while silently recommending another topic.
    const related = catalog.filter(
      (piece) =>
        piece.cluster === sameThread &&
        (piece.band === (piece.format === 'read' ? p.readingBand : p.listeningBand) ||
          (p.adaptation?.challenge === 'easier-piece' && piece.band === 'A2')),
    );
    pool = [...related, ...pool.filter((piece) => !related.some((item) => item.id === piece.id))];
  }
  const changed = p.adaptation?.route === 'new-interest' ? p.adaptation.cluster : null;
  const want =
    p.adaptation?.route === 'same-interest'
      ? [p.adaptation.cluster, ...p.interests]
      : p.interests.filter((c) => c !== changed);
  const ordered = [...pool].sort((a, b) => {
    const rank = (piece: Piece) =>
      (piece.cluster === changed ? 40 : 0) +
      (piece.cluster === sameThread ? -20 : 0) +
      (want.includes(piece.cluster) ? want.indexOf(piece.cluster) : 8) +
      (p.adaptation?.challenge === 'easier-piece' &&
      piece.cluster === sameThread &&
      piece.band === 'A2'
        ? -5
        : 0) +
      (seen.has(piece.versionId) ? 3 : 0);
    return rank(a) - rank(b) || a.issue.localeCompare(b.issue);
  });
  const first = ordered[0];
  if (!first) return [];
  const second =
    ordered.find(
      (piece) =>
        piece.id !== first.id && piece.cluster !== first.cluster && piece.cluster !== changed,
    ) ?? ordered[1];
  const third = ordered.find((piece) => piece.id !== first.id && piece.id !== second?.id) ?? null;
  return [
    {
      piece: first,
      route: 'A familiar thread' as const,
      reason:
        p.adaptation?.route === 'new-interest'
          ? 'A different cultural direction, with your working band unchanged.'
          : sameThread && seen.has(first.versionId)
            ? 'Return to this familiar cultural thread with your new support setting. This small collection has no unseen piece at the same band in this category yet.'
            : sameThread && p.adaptation?.challenge === 'easier-piece' && first.band === 'A2'
              ? 'An A2 sample from the same cultural thread, with more support. Your self-selected working bands are unchanged.'
              : want.includes(first.cluster)
                ? 'Selected from a cultural category you chose. This is an editorial sample connection.'
                : 'An available original piece at your chosen working band.',
    },
    ...(second
      ? [
          {
            piece: second,
            route: 'A new connection' as const,
            reason:
              'An editorial invitation to explore another corner of the sample collection. No Qloo affinity is claimed.',
          },
        ]
      : []),
    ...(third
      ? [
          {
            piece: third,
            route: 'Continue your story' as const,
            reason:
              p.adaptation?.support === 'extra'
                ? 'More support will stay available as you continue. Your working band is unchanged.'
                : 'Another short piece at your chosen band, with vocabulary to carry into a future session.',
          },
        ]
      : []),
  ];
}
export async function getReviews(
  learnerId: string,
  client: Queryable = database(),
): Promise<ReviewView[]> {
  const result = await client.query<{
    id: string;
    version: number;
    content_version_id: string;
    term_id: string;
    stage: number;
    due_at: Date;
    last_result: boolean | null;
  }>('SELECT * FROM review_items WHERE learner_id=$1 ORDER BY due_at,created_at', [learnerId]);
  const items: ReviewView[] = [];
  for (const row of result.rows) {
    let source: Source;
    try {
      source = await getSource(row.content_version_id, client);
    } catch (e) {
      if (e instanceof DomainError && e.status === 410) continue;
      throw e;
    }
    const term = source.glossary.find((t) => t.id === row.term_id);
    if (!term) continue;
    const segment = source.segments.find((s) => s.id === term.segmentId);
    items.push({
      id: row.id,
      version: row.version,
      stage: row.stage,
      meaning: term.meaning,
      sourceTitle: source.title,
      sourceId: source.id,
      termId: term.id,
      context: segment?.translation ?? '',
      dueAt: iso(row.due_at),
      due: row.due_at.getTime() <= Date.now(),
      lastResult: row.last_result,
    });
  }
  return items;
}
export async function getEvents(
  learnerId: string,
  client: Queryable = database(),
): Promise<TraceEvent[]> {
  const result = await client.query<{
    id: string;
    kind: string;
    summary: string;
    detail: Record<string, unknown>;
    created_at: Date;
  }>(
    'SELECT id,kind,summary,detail,created_at FROM events WHERE learner_id=$1 ORDER BY created_at DESC,id LIMIT 80',
    [learnerId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    summary: row.summary,
    detail: row.detail,
    createdAt: iso(row.created_at),
  }));
}
export async function getPath(learnerId: string): Promise<PathView> {
  const [sessions, bookmarks, catalog, reviews, attempts, events] = await Promise.all([
    database().query<{
      id: string;
      content_version_id: string;
      state: string;
      source_title: string;
      slug: string;
      cluster: Piece['cluster'];
      completed_at: Date | null;
      started_at: Date;
      feedback: SessionView['feedback'];
      responses: number;
    }>(
      `SELECT s.*, c.source->>'title' AS source_title,c.slug,c.source->>'cluster' AS cluster,(SELECT count(*)::int FROM responses r WHERE r.session_id=s.id) AS responses FROM sessions s JOIN content_versions c ON c.id=s.content_version_id WHERE learner_id=$1 ORDER BY s.started_at DESC`,
      [learnerId],
    ),
    getBookmarks(learnerId),
    getCatalog(),
    getReviews(learnerId),
    database().query<{ total: string; correct: string }>(
      'SELECT count(*) AS total,count(*) FILTER(WHERE ra.correct) AS correct FROM review_attempts ra JOIN review_items ri ON ri.id=ra.review_id WHERE ri.learner_id=$1',
      [learnerId],
    ),
    getEvents(learnerId),
  ]);
  return {
    sessions: sessions.rows.map((s) => ({
      id: s.id,
      title: s.source_title,
      pieceId: s.slug,
      cluster: s.cluster,
      state: s.state,
      completedAt: s.completed_at ? iso(s.completed_at) : null,
      startedAt: iso(s.started_at),
      comprehension: s.feedback?.comprehension ?? null,
      responses: s.responses,
    })),
    saved: catalog.filter((p) => bookmarks.includes(p.versionId)),
    words: reviews.length,
    dueWords: reviews.filter((r) => r.due).length,
    reviews: Number(attempts.rows[0].total),
    correctReviews: Number(attempts.rows[0].correct),
    events,
  };
}
export type CommandResult = {
  sessionId?: string;
  session?: SessionView;
  learner?: Learner;
  saved?: boolean;
  review?: {
    correct: boolean;
    word: string;
    note: string;
    dueAt: string;
    days: number;
    nextStage: number;
  };
  message?: string;
};
/** Owner lock serializes writes; keyed replay happens before version checks. Each write commits once. */
export async function executeCommand(
  learnerId: string,
  key: string,
  input: Command,
): Promise<CommandResult> {
  const command = commandSchema.parse(input);
  if (!/^[\da-f-]{36}$/i.test(key))
    throw new DomainError('INVALID_KEY', 'A valid request key is required.');
  const fingerprint = hash(JSON.stringify(command));
  return transaction(async (client) => {
    const learnerResult = await client.query<LearnerRow>(
      'SELECT * FROM learners WHERE id=$1 FOR UPDATE',
      [learnerId],
    );
    const learnerRow = learnerResult.rows[0];
    if (!learnerRow)
      throw new DomainError('UNAUTHORIZED', 'Start a new learning path to continue.', 401);
    const previous = await client.query<{ request_hash: string; response: CommandResult }>(
      'SELECT request_hash,response FROM idempotency WHERE learner_id=$1 AND key=$2',
      [learnerId, key],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].request_hash !== fingerprint)
        throw new DomainError(
          'IDEMPOTENCY_CONFLICT',
          'This request key belongs to a different action.',
          409,
        );
      // Replays must honor current rights and must not roll the UI back to an old version.
      const cached = previous.rows[0].response;
      if (cached.session)
        return { ...cached, session: await getSession(learnerId, cached.session.id, client) };
      if (command.type === 'review') {
        const source = await client.query<{ content_version_id: string }>(
          'SELECT content_version_id FROM review_items WHERE id=$1 AND learner_id=$2',
          [command.reviewId, learnerId],
        );
        if (!source.rows[0])
          throw new DomainError('NOT_FOUND', 'This review is no longer available.', 404);
        await getSource(source.rows[0].content_version_id, client);
      }
      if (command.type === 'start' || command.type === 'bookmark')
        await getSource(command.versionId, client);
      if (cached.learner) return { ...cached, learner: toLearner(learnerRow) };
      return cached;
    }
    const profile = learnerRow.profile;
    let result: CommandResult = {};
    if (command.type === 'profile') {
      checkVersion(learnerRow.version, command.expectedVersion);
      const { type: _type, expectedVersion: _expected, ...fields } = command;
      const updated = { ...fields, adaptation: null };
      const rows = await client.query<LearnerRow>(
        'UPDATE learners SET profile=$2,version=version+1 WHERE id=$1 RETURNING *',
        [learnerId, JSON.stringify(updated)],
      );
      await event(
        client,
        learnerId,
        'path.updated',
        'Your interests and starting preferences were updated.',
        {
          readingBand: updated.readingBand,
          listeningBand: updated.listeningBand,
          basis: 'User-selected; not certified',
          referenceResolution: 'Unresolved, stored as expressed references',
          qlooCalls: 0,
        },
      );
      result = { learner: toLearner(rows.rows[0]) };
    } else if (command.type === 'start') {
      const source = await getSource(command.versionId, client);
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM sessions WHERE learner_id=$1 AND content_version_id=$2 AND state<>'completed'",
        [learnerId, source.versionId],
      );
      const sessionId = existing.rows[0]?.id ?? randomUUID();
      if (!existing.rows[0]) {
        await client.query(
          'INSERT INTO sessions(id,learner_id,content_version_id,support) VALUES($1,$2,$3,$4)',
          [sessionId, learnerId, source.versionId, command.support],
        );
        await client.query(
          'INSERT INTO session_assessments(session_id,assessment_id,content_version_id,objective_id) SELECT $1,id,content_version_id,objective_id FROM assessment_items WHERE content_version_id=$2',
          [sessionId, source.versionId],
        );
        await event(client, learnerId, 'session.started', `Opened ${source.title}.`, {
          sourceVersion: source.versionId,
          mode: 'authored-sample',
          rightsUse: ['host', 'transcript'],
          educatorReview: 'pending',
          support: command.support,
          objective: source.objective,
          qlooCalls: 0,
        });
      }
      result = { sessionId };
    } else if (command.type === 'bookmark') {
      const source = await getSource(command.versionId, client);
      if (command.saved)
        await client.query(
          'INSERT INTO bookmarks(learner_id,content_version_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [learnerId, source.versionId],
        );
      else
        await client.query('DELETE FROM bookmarks WHERE learner_id=$1 AND content_version_id=$2', [
          learnerId,
          source.versionId,
        ]);
      result = { saved: command.saved };
    } else if (command.type === 'review') {
      const review = await client.query<{
        id: string;
        version: number;
        content_version_id: string;
        term_id: string;
        stage: number;
        due_at: Date;
      }>('SELECT * FROM review_items WHERE id=$1 AND learner_id=$2 FOR UPDATE', [
        command.reviewId,
        learnerId,
      ]);
      const row = review.rows[0];
      if (!row)
        throw new DomainError('NOT_FOUND', 'That review is not in your learning space.', 404);
      checkVersion(row.version, command.expectedVersion);
      const source = await getSource(row.content_version_id, client);
      const term = source.glossary.find((t) => t.id === row.term_id);
      if (!term)
        throw new DomainError('SOURCE_UNAVAILABLE', 'The source word is unavailable.', 410);
      if (row.due_at.getTime() > Date.now())
        throw new DomainError(
          'REVIEW_NOT_DUE',
          'This word is already scheduled for a later review. Your earlier result is saved.',
          409,
        );
      const correct = normalizeAnswer(command.answer) === normalizeAnswer(term.word);
      const schedule = scheduleReview(row.stage, correct, Date.now());
      await client.query(
        'UPDATE review_items SET stage=$2,due_at=$3,last_result=$4,version=version+1 WHERE id=$1',
        [row.id, schedule.nextStage, schedule.dueAt, correct],
      );
      await client.query(
        'INSERT INTO review_attempts(id,review_id,correct,stage_before,stage_after,due_at,policy_version) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          randomUUID(),
          row.id,
          correct,
          row.stage,
          schedule.nextStage,
          schedule.dueAt,
          schedule.policyVersion,
        ],
      );
      await event(
        client,
        learnerId,
        'review.completed',
        correct
          ? 'A word was recalled and scheduled again.'
          : 'A word is scheduled for another try tomorrow.',
        {
          sourceVersion: source.versionId,
          correct,
          stageBefore: row.stage,
          stageAfter: schedule.nextStage,
          nextDueAt: schedule.dueAt,
          policy: schedule.policyVersion,
          meaning: 'A bounded retrieval result, not measured long-term retention',
        },
      );
      result = { review: { correct, word: term.word, note: term.note, ...schedule } };
    } else {
      const session = await ownSession(learnerId, command.sessionId, client);
      const source = await getSource(session.content_version_id, client);
      if (command.type === 'save-word') {
        const term = source.glossary.find((t) => t.id === command.termId);
        if (!term) throw new DomainError('INVALID_SOURCE', 'Choose a word from this exact piece.');
        await client.query(
          'INSERT INTO review_items(id,learner_id,content_version_id,term_id) VALUES($1,$2,$3,$4) ON CONFLICT(learner_id,content_version_id,term_id) DO NOTHING',
          [randomUUID(), learnerId, source.versionId, term.id],
        );
      } else {
        checkVersion(session.version, command.expectedVersion);
        if (session.state === 'completed')
          throw new DomainError(
            'COMPLETED',
            'This session is complete. Start another piece or visit your review notebook.',
            409,
          );
        if (command.type === 'position') {
          if (session.state !== 'active' || command.position >= source.segments.length)
            throw new DomainError(
              'INVALID_POSITION',
              'That passage is not available in the current reading session.',
              409,
            );
          await client.query('UPDATE sessions SET position=$2,version=version+1 WHERE id=$1', [
            session.id,
            command.position,
          ]);
        } else if (command.type === 'begin-practice') {
          if (session.state !== 'active' || session.position < source.segments.length - 1)
            throw new DomainError(
              'SOURCE_INCOMPLETE',
              'Continue through the source passages before beginning practice.',
              409,
            );
          await client.query("UPDATE sessions SET state='practice',version=version+1 WHERE id=$1", [
            session.id,
          ]);
        } else if (command.type === 'answer') {
          if (session.state !== 'practice')
            throw new DomainError(
              'INVALID_STATE',
              'Read the source before answering its questions.',
              409,
            );
          const assigned = await client.query<AssessmentRow>(
            `SELECT a.* FROM assessment_items a JOIN session_assessments sa ON sa.assessment_id=a.id AND sa.content_version_id=a.content_version_id AND sa.objective_id=a.objective_id WHERE sa.session_id=$1 AND a.id=$2`,
            [session.id, command.assessmentId],
          );
          const item = assigned.rows[0];
          if (
            !item ||
            !isAssignedAssessment(
              { id: session.id, learnerId, contentVersionId: session.content_version_id },
              {
                sessionId: session.id,
                contentVersionId: item.content_version_id,
                objectiveId: item.objective_id,
                assessmentId: item.id,
              },
              { learnerId, objectiveId: item.objective_id, assessmentId: command.assessmentId },
            )
          )
            throw new DomainError(
              'UNASSIGNED_ASSESSMENT',
              'That exercise is not assigned to this exact session and source.',
            );
          if (
            item.public_item.options.length &&
            !item.public_item.options.some((option) => option.id === command.answer)
          )
            throw new DomainError('INVALID_ANSWER', 'Choose one of the available answers.');
          const prior = await client.query<{ attempts: number }>(
            'SELECT attempts FROM responses WHERE session_id=$1 AND assessment_id=$2',
            [session.id, item.id],
          );
          if (prior.rows[0] && (item.kind === 'comprehension' || prior.rows[0].attempts >= 3))
            throw new DomainError(
              'ALREADY_ANSWERED',
              'This answer is already saved. It will not be counted twice.',
              409,
            );
          const correct = item.answer_key.answer.some(
            (answer) => normalizeAnswer(answer) === normalizeAnswer(command.answer),
          );
          const quote = source.segments
            .filter((s) => item.public_item.sourceSegmentIds.includes(s.id))
            .map((s) => s.text)
            .join('\n');
          if (
            !quote ||
            item.public_item.sourceSegmentIds.some(
              (id) => !source.segments.some((s) => s.id === id),
            )
          )
            throw new DomainError(
              'INVALID_GROUNDING',
              'This exercise has a source mismatch and cannot be scored.',
              409,
            );
          await client.query(
            `INSERT INTO responses(session_id,assessment_id,answer,correct,feedback,source_quote) VALUES($1,$2,$3,$4,$5,$6)
            ON CONFLICT(session_id,assessment_id) DO UPDATE SET answer=EXCLUDED.answer,correct=EXCLUDED.correct,attempts=responses.attempts+1`,
            [session.id, item.id, command.answer, correct, item.answer_key.explanation, quote],
          );
          await bumpSession(client, session.id);
        } else if (command.type === 'complete') {
          if (session.state !== 'practice')
            throw new DomainError(
              'INVALID_STATE',
              'Complete the practice before reflecting on the piece.',
              409,
            );
          const counts = await client.query<{
            kind: string;
            total: string;
            correct: string;
            answered: string;
          }>(
            `SELECT a.kind,count(*) AS total,count(*) FILTER(WHERE r.correct) AS correct,count(r.assessment_id) AS answered FROM session_assessments sa JOIN assessment_items a ON a.id=sa.assessment_id LEFT JOIN responses r ON r.session_id=sa.session_id AND r.assessment_id=sa.assessment_id WHERE sa.session_id=$1 GROUP BY a.kind`,
            [session.id],
          );
          const comprehensionRows = counts.rows.find((r) => r.kind === 'comprehension');
          if (!comprehensionRows || counts.rows.some((r) => r.answered !== r.total))
            throw new DomainError(
              'PRACTICE_INCOMPLETE',
              'Answer the source questions and try the short language exercise first.',
              409,
            );
          const comprehension = Number(comprehensionRows.correct) / Number(comprehensionRows.total);
          const previousSessions = await client.query<{
            feedback: NonNullable<SessionView['feedback']>;
          }>(
            "SELECT feedback FROM sessions WHERE learner_id=$1 AND state='completed' ORDER BY completed_at DESC LIMIT 3",
            [learnerId],
          );
          let consecutive = comprehension >= 0.8 ? 1 : 0;
          if (consecutive)
            for (const s of previousSessions.rows) {
              if (s.feedback.comprehension >= 0.8) consecutive++;
              else break;
            }
          const adaptation = command.consent
            ? chooseAdaptation({
                taste: command.taste,
                comprehension,
                assessedItems: Number(comprehensionRows.total),
                consecutiveStrongSessions: consecutive,
                support: session.support,
              })
            : null;
          const feedback: SessionView['feedback'] = {
            taste: command.taste,
            difficulty: command.difficulty,
            consent: command.consent,
            comprehension,
            adaptation,
          };
          await client.query(
            "UPDATE sessions SET state='completed',completed_at=now(),feedback=$2,note=$3,version=version+1 WHERE id=$1",
            [session.id, JSON.stringify(feedback), command.note],
          );
          if (adaptation)
            await client.query('UPDATE learners SET profile=$2,version=version+1 WHERE id=$1', [
              learnerId,
              JSON.stringify({
                ...profile,
                support: adaptation.support,
                adaptation: {
                  ...adaptation,
                  fromPiece: source.title,
                  cluster: source.cluster,
                  at: new Date().toISOString(),
                },
              }),
            ]);
          await event(
            client,
            learnerId,
            'session.completed',
            adaptation?.reason ?? 'Session complete. You chose to keep your path unchanged.',
            {
              sourceVersion: source.versionId,
              scorer: 'bounded-answer-1',
              objectivePoints: {
                correct: Number(comprehensionRows.correct),
                total: Number(comprehensionRows.total),
              },
              taste: command.taste,
              selfReportedDifficulty: command.difficulty,
              selfReportUsedAsScore: false,
              adaptationConsent: command.consent,
              adaptation,
              policy: 'separate-taste-comprehension-1',
              readingBand: profile.readingBand,
              listeningBand: profile.listeningBand,
              changeProficiencyBand: false,
              educatorReview: 'pending',
            },
          );
        }
      }
      result = { sessionId: session.id, session: await getSession(learnerId, session.id, client) };
    }
    await client.query(
      'INSERT INTO idempotency(learner_id,key,request_hash,response) VALUES($1,$2,$3,$4)',
      [learnerId, key, fingerprint, JSON.stringify(result)],
    );
    return result;
  });
}
export async function deleteLearner(learnerId: string) {
  await database().query('DELETE FROM learners WHERE id=$1', [learnerId]);
}
export async function exportLearner(learner: Learner) {
  const [path, reviews, sessions, responses] = await Promise.all([
    getPath(learner.id),
    getReviews(learner.id),
    database().query<{
      id: string;
      content_version_id: string;
      note: string;
      feedback: SessionView['feedback'];
    }>(
      'SELECT id,content_version_id,note,feedback FROM sessions WHERE learner_id=$1 ORDER BY started_at',
      [learner.id],
    ),
    database().query<{
      session_id: string;
      assessment_id: string;
      answer: string;
      correct: boolean;
      attempts: number;
      created_at: Date;
    }>(
      'SELECT r.session_id,r.assessment_id,r.answer,r.correct,r.attempts,r.created_at FROM responses r JOIN sessions s ON s.id=r.session_id WHERE s.learner_id=$1 ORDER BY r.created_at',
      [learner.id],
    ),
  ]);
  const available = new Set((await getCatalog()).map((piece) => piece.versionId));
  const sessionDetails = sessions.rows.map((session) => {
    const sourceAvailable = available.has(session.content_version_id);
    return {
      sessionId: session.id,
      sourceVersion: session.content_version_id,
      sourceAvailable,
      reflection: sourceAvailable ? session.note : null,
      feedback: session.feedback,
      responses: responses.rows
        .filter((response) => response.session_id === session.id)
        .map((response) => ({
          assessmentId: response.assessment_id,
          answer: sourceAvailable ? response.answer : null,
          correct: response.correct,
          attempts: response.attempts,
          submittedAt: iso(response.created_at),
        })),
    };
  });
  // Do not export source passages, future answer keys, bearer credentials, or withdrawn-source details.
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    learner: { profile: learner.profile, createdAt: learner.createdAt },
    path,
    reviews,
    sessionDetails,
    notice:
      'Original sample learning activity. Working bands are self-selected. No certified level or measured learning gain is claimed. Source-related reflections and answer text are omitted when the source is unavailable.',
  };
}
