import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { database, transaction } from './db';
import { getCatalog, getSession, getSource, rightsFor } from './store';
import { applicationCapabilities, boundedSetting } from './live-config';
import { canUseSource } from '../domain/learning';
import { DomainError } from '../domain/commands';
import {
  confirmationInputSchema,
  coachingInputSchema,
  discoveryInputSchema,
  removalInputSchema,
  resolutionInputSchema,
} from '../domain/live-commands';
import type { ConfirmedInterest, LiveOverview, RunResult, RunView } from '../domain/live';
import type { Profile, Source } from '../domain/types';
import type { DiscoverySnapshot } from '../domain/discovery';
import { assertPublicCulturalQuery, ProviderError } from '../integrations/qloo-live';

type Queryable = Pick<PoolClient, 'query'>;
type LearnerRow = { id: string; profile: Profile; version: number };
export interface RunRow {
  id: string;
  learner_id: string;
  kind: RunView['kind'];
  state: RunView['state'];
  stage: string;
  profile_version: number;
  session_id: string | null;
  content_version_id: string | null;
  payload: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  checkpoints: Record<string, unknown>;
  result: RunResult | null;
  error: RunView['error'];
  trace: RunView['trace'];
  attempts: number;
  lease_token: string | null;
  lease_until: Date | null;
  request_hash: string;
  created_at: Date;
  updated_at: Date;
}
export type ClaimedRun = RunRow & { state: 'running'; lease_token: string; lease_until: Date };
export interface InitialDiscoverySnapshot {
  profileVersion: number;
  profile: DiscoverySnapshot['profile'];
  signals: ConfirmedInterest[];
  versionIds: string[];
  completedVersionIds: string[];
}
export const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const iso = (value: Date | string) => (typeof value === 'string' ? value : value.toISOString());
const publicRun = (row: RunRow): RunView => ({
  id: row.id,
  kind: row.kind,
  state: row.state,
  stage: row.stage,
  attempts: row.attempts,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
  result: row.result,
  error: row.error,
  trace: row.trace,
});
const unauthorized = () =>
  new DomainError('UNAUTHORIZED', 'Start a learning path to continue.', 401);
async function ownLearner(learnerId: string, client: Queryable, lock = false): Promise<LearnerRow> {
  const result = await client.query<LearnerRow>(
    `SELECT id,profile,version FROM learners WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
    [learnerId],
  );
  if (!result.rows[0]) throw unauthorized();
  return result.rows[0];
}
async function ownRun(learnerId: string, runId: string, client: Queryable): Promise<RunRow> {
  if (!z.uuid().safeParse(runId).success)
    throw new DomainError('NOT_FOUND', 'This request is not in your learning space.', 404);
  const result = await client.query<RunRow>(
    'SELECT * FROM learning_runs WHERE id=$1 AND learner_id=$2',
    [runId, learnerId],
  );
  if (!result.rows[0])
    throw new DomainError('NOT_FOUND', 'This request is not in your learning space.', 404);
  return result.rows[0];
}
export async function getTeachingSource(
  versionId: string,
  client: Queryable = database(),
): Promise<Source> {
  const source = await getSource(versionId, client);
  const row = await client.query('SELECT * FROM content_versions WHERE id=$1', [source.versionId]);
  const rights = rightsFor(row.rows[0]);
  if (
    !canUseSource(rights, source.versionId, 'adapt', Date.now()) ||
    !canUseSource(rights, source.versionId, 'model', Date.now())
  )
    throw new DomainError(
      'SOURCE_PERMISSION',
      'AI support is unavailable for this source. Its original reading and fixed practice remain available.',
      410,
    );
  return source;
}
export async function getInterests(
  learnerId: string,
  client: Queryable = database(),
): Promise<ConfirmedInterest[]> {
  const result = await client.query<{
    candidate: Omit<ConfirmedInterest, 'confirmedAt' | 'evidenceAt'>;
    confirmed_at: Date;
    evidence_at: Date;
  }>(
    'SELECT candidate,confirmed_at,evidence_at FROM taste_signals WHERE learner_id=$1 ORDER BY confirmed_at,entity_id',
    [learnerId],
  );
  return result.rows.map((row) => ({
    ...row.candidate,
    confirmedAt: iso(row.confirmed_at),
    evidenceAt: iso(row.evidence_at),
  }));
}
export async function getRun(
  learnerId: string,
  runId: string,
  client: Queryable = database(),
): Promise<RunView> {
  const row = await ownRun(learnerId, runId, client);
  const learner = await ownLearner(learnerId, client);
  const view = publicRun(row);
  if (row.kind === 'discovery' && row.profile_version !== learner.version)
    return {
      ...view,
      state: 'failed',
      result: null,
      stage: 'Your preferences changed',
      error: {
        code: 'STALE_PROFILE',
        message:
          'Your preferences changed after this request. Build a new path using your current choices.',
        retryable: true,
      },
    };
  try {
    if (row.kind === 'coaching' && row.content_version_id)
      await getTeachingSource(row.content_version_id, client);
    if (row.result?.kind === 'discovery') {
      for (const card of row.result.recommendations) {
        if (row.result.planning.mode === 'ai')
          await getTeachingSource(card.piece.versionId, client);
        else await getSource(card.piece.versionId, client);
      }
      for (const entry of row.result.comparison.baseline) await getSource(entry.pieceId, client);
    }
  } catch (error) {
    if (
      !(error instanceof DomainError) ||
      !['SOURCE_UNAVAILABLE', 'SOURCE_PERMISSION', 'NOT_FOUND'].includes(error.code)
    )
      throw error;
    return {
      ...view,
      state: 'failed',
      result: null,
      stage: 'A source is unavailable',
      error: {
        code: error.code,
        message:
          'A source or its permission changed. Your activity is saved; choose another available story.',
        retryable: false,
      },
    };
  }
  return row.kind === 'coaching' && typeof row.payload.answer === 'string'
    ? { ...view, submittedAnswer: row.payload.answer }
    : view;
}
export async function getLiveOverview(learnerId: string): Promise<LiveOverview> {
  const learner = await ownLearner(learnerId, database());
  const [interests, latest] = await Promise.all([
    getInterests(learnerId),
    database().query<{ id: string; kind: 'discovery' | 'resolution' }>(
      "SELECT DISTINCT ON (kind) id,kind FROM learning_runs WHERE learner_id=$1 AND kind IN ('discovery','resolution') ORDER BY kind,created_at DESC,id DESC",
      [learnerId],
    ),
  ]);
  const latestRuns = await Promise.all(latest.rows.map((row) => getRun(learnerId, row.id)));
  const available = applicationCapabilities();
  return {
    profileVersion: learner.version,
    interests,
    latestDiscovery: latestRuns.find((run) => run.kind === 'discovery') ?? null,
    latestResolution: latestRuns.find((run) => run.kind === 'resolution') ?? null,
    qlooAvailable: available.qloo,
    coachingAvailable: available.model,
  };
}
async function createRun(
  learnerId: string,
  key: string,
  kind: RunView['kind'],
  payload: Record<string, unknown>,
  prepare: (
    client: PoolClient,
    learner: LearnerRow,
  ) => Promise<{ snapshot: Record<string, unknown>; sessionId?: string; versionId?: string }>,
): Promise<RunView> {
  const requestHash = fingerprint({ kind, payload });
  const runId = await transaction(async (client) => {
    const learner = await ownLearner(learnerId, client, true);
    const previous = await client.query<RunRow>(
      'SELECT * FROM learning_runs WHERE learner_id=$1 AND idempotency_key=$2',
      [learnerId, key],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].request_hash !== requestHash)
        throw new DomainError(
          'IDEMPOTENCY_CONFLICT',
          'This request key belongs to a different action.',
          409,
        );
      return previous.rows[0].id;
    }
    const busy = await client.query(
      "SELECT id FROM learning_runs WHERE learner_id=$1 AND state IN ('queued','running') LIMIT 1",
      [learnerId],
    );
    if (busy.rowCount)
      throw new DomainError(
        'RUN_ACTIVE',
        'One request is already in progress. Finish or cancel it before starting another.',
        409,
        true,
      );
    const count = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM learning_runs WHERE learner_id=$1 AND created_at > now()-interval '1 day'",
      [learnerId],
    );
    if (count.rows[0].count >= 40)
      throw new DomainError(
        'GUEST_LIMIT',
        'This learning space has reached today’s live request allowance. Original stories and saved practice remain available.',
        429,
      );
    const data = await prepare(client, learner);
    const id = randomUUID();
    const trace = [
      {
        stage: 'queued',
        summary: 'Your request and current learning context were saved.',
        at: new Date().toISOString(),
      },
    ];
    await client.query(
      `INSERT INTO learning_runs(id,learner_id,kind,idempotency_key,request_hash,profile_version,session_id,content_version_id,payload,snapshot,trace) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        learnerId,
        kind,
        key,
        requestHash,
        learner.version,
        data.sessionId ?? null,
        data.versionId ?? null,
        JSON.stringify(payload),
        JSON.stringify(data.snapshot),
        JSON.stringify(trace),
      ],
    );
    return id;
  });
  return getRun(learnerId, runId);
}
export async function createResolutionRun(
  learnerId: string,
  input: z.infer<typeof resolutionInputSchema>,
) {
  const { key, ...payload } = resolutionInputSchema.parse(input);
  assertPublicCulturalQuery(payload.query);
  if (!applicationCapabilities().qloo)
    throw new DomainError(
      'PROVIDER_UNAVAILABLE',
      'Live cultural matching is unavailable. Browse the original collection while it returns.',
      503,
      true,
    );
  return createRun(learnerId, key, 'resolution', payload, async () => ({ snapshot: {} }));
}
export async function createDiscoveryRun(
  learnerId: string,
  input: z.infer<typeof discoveryInputSchema>,
) {
  const { key, ...payload } = discoveryInputSchema.parse(input);
  if (!applicationCapabilities().qloo)
    throw new DomainError(
      'PROVIDER_UNAVAILABLE',
      'Live cultural discovery is unavailable. Original stories are still ready to explore.',
      503,
      true,
    );
  return createRun(learnerId, key, 'discovery', payload, async (client, learner) => {
    if (learner.version !== payload.expectedVersion)
      throw new DomainError(
        'STALE_VERSION',
        'Your preferences changed. Reload to build a path from your latest choices.',
        409,
        true,
      );
    const signals = await getInterests(learnerId, client);
    if (!signals.length)
      throw new DomainError(
        'NO_CONFIRMED_INTEREST',
        'Confirm at least one catalog match before building your cultural path.',
      );
    const catalog = await getCatalog(client);
    const completed = await client.query<{ content_version_id: string }>(
      "SELECT content_version_id FROM sessions WHERE learner_id=$1 AND state='completed'",
      [learnerId],
    );
    const { readingBand, listeningBand, minutes, interests, support, adaptation } = learner.profile;
    const snapshot: InitialDiscoverySnapshot = {
      profileVersion: learner.version,
      profile: { readingBand, listeningBand, minutes, interests, support, adaptation },
      signals,
      versionIds: catalog.map((piece) => piece.versionId),
      completedVersionIds: completed.rows.map((row) => row.content_version_id),
    };
    return { snapshot: snapshot as unknown as Record<string, unknown> };
  });
}
export async function createCoachingRun(
  learnerId: string,
  input: z.infer<typeof coachingInputSchema>,
) {
  const { key, ...payload } = coachingInputSchema.parse(input);
  if (!applicationCapabilities().model)
    throw new DomainError(
      'PROVIDER_UNAVAILABLE',
      'AI writing support is unavailable. Your source questions and expression practice still work.',
      503,
      true,
    );
  if (
    /(?:\b(?:api[_ -]?key|bearer|password|secret)\s*[:=]|sk-[A-Za-z0-9_-]{15,})/i.test(
      payload.answer,
    )
  )
    throw new DomainError(
      'PRIVATE_INPUT',
      'Keep passwords and credentials out of writing practice.',
    );
  return createRun(learnerId, key, 'coaching', payload, async (client) => {
    const session = await getSession(learnerId, payload.sessionId, client);
    if (session.state === 'active' || session.responses.length < session.assessments.length)
      throw new DomainError(
        'PRACTICE_NOT_READY',
        'Complete the source questions and short expression exercise before asking for writing feedback.',
        409,
      );
    await getTeachingSource(session.piece.versionId, client);
    const attempts = await client.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM learning_runs WHERE learner_id=$1 AND session_id=$2 AND kind='coaching'",
      [learnerId, session.id],
    );
    if (attempts.rows[0].count >= 3)
      throw new DomainError(
        'COACHING_LIMIT',
        'This session has used its three writing-feedback attempts. Keep the corrections for your next story.',
        429,
      );
    return {
      snapshot: { objective: session.piece.objective, band: session.piece.band },
      sessionId: session.id,
      versionId: session.piece.versionId,
    };
  });
}
async function once(client: PoolClient, learnerId: string, key: string, payload: unknown) {
  const requestHash = fingerprint(payload);
  const result = await client.query<{ request_hash: string }>(
    'SELECT request_hash FROM live_idempotency WHERE learner_id=$1 AND key=$2',
    [learnerId, key],
  );
  if (result.rows[0]) {
    if (result.rows[0].request_hash !== requestHash)
      throw new DomainError(
        'IDEMPOTENCY_CONFLICT',
        'This request key belongs to a different action.',
        409,
      );
    return false;
  }
  await client.query('INSERT INTO live_idempotency(learner_id,key,request_hash) VALUES($1,$2,$3)', [
    learnerId,
    key,
    requestHash,
  ]);
  return true;
}
async function changedInterests(client: PoolClient, learnerId: string) {
  await client.query('UPDATE learners SET version=version+1 WHERE id=$1', [learnerId]);
  await client.query(
    "UPDATE learning_runs SET state='cancelled',stage='Your interests changed',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE learner_id=$1 AND kind='discovery' AND state IN ('queued','running')",
    [learnerId],
  );
}
export async function confirmInterest(
  learnerId: string,
  input: z.infer<typeof confirmationInputSchema>,
) {
  const { key, runId, candidateId } = confirmationInputSchema.parse(input);
  await transaction(async (client) => {
    await ownLearner(learnerId, client, true);
    if (!(await once(client, learnerId, key, { action: 'confirm', runId, candidateId }))) return;
    const run = await ownRun(learnerId, runId, client);
    const result = run.result;
    if (run.state !== 'succeeded' || result?.kind !== 'resolution')
      throw new DomainError(
        'MATCH_NOT_READY',
        'Wait for catalog matches before confirming an identity.',
        409,
      );
    const candidate = result.candidates.find((item) => item.entityId === candidateId.toLowerCase());
    if (!candidate)
      throw new DomainError(
        'UNVERIFIED_IDENTITY',
        'Choose an actual match returned for this search.',
      );
    if (Date.now() - Date.parse(result.evidenceAt) > 7 * 86400000)
      throw new DomainError(
        'MATCH_EXPIRED',
        'Search again to confirm this identity from current catalog evidence.',
        409,
        true,
      );
    const current = await getInterests(learnerId, client);
    if (current.some((item) => item.entityId === candidate.entityId)) return;
    if (current.length >= 3)
      throw new DomainError(
        'INTEREST_LIMIT',
        'Keep up to three confirmed favorites. Remove one to explore another.',
      );
    await client.query(
      'INSERT INTO taste_signals(learner_id,entity_id,candidate,resolution_run_id,evidence_at) VALUES($1,$2,$3,$4,$5)',
      [learnerId, candidate.entityId, JSON.stringify(candidate), runId, result.evidenceAt],
    );
    await changedInterests(client, learnerId);
  });
  return getLiveOverview(learnerId);
}
export async function removeInterest(learnerId: string, input: z.infer<typeof removalInputSchema>) {
  const { key, entityId } = removalInputSchema.parse(input);
  await transaction(async (client) => {
    await ownLearner(learnerId, client, true);
    if (!(await once(client, learnerId, key, { action: 'remove', entityId }))) return;
    const removed = await client.query(
      'DELETE FROM taste_signals WHERE learner_id=$1 AND entity_id=$2',
      [learnerId, entityId],
    );
    if (removed.rowCount) await changedInterests(client, learnerId);
  });
  return getLiveOverview(learnerId);
}
export async function cancelRun(learnerId: string, runId: string, key: string) {
  z.uuid().parse(key);
  await transaction(async (client) => {
    await ownLearner(learnerId, client, true);
    await ownRun(learnerId, runId, client);
    if (!(await once(client, learnerId, key, { action: 'cancel', runId }))) return;
    await client.query(
      "UPDATE learning_runs SET state='cancelled',stage='Cancelled',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND learner_id=$2 AND state IN ('queued','running')",
      [runId, learnerId],
    );
  });
  return getRun(learnerId, runId);
}
export async function getCoachingHistory(learnerId: string, sessionId: string) {
  z.uuid().parse(sessionId);
  await getSession(learnerId, sessionId);
  const rows = await database().query<{ id: string }>(
    "SELECT id FROM learning_runs WHERE learner_id=$1 AND session_id=$2 AND kind='coaching' ORDER BY created_at DESC,id DESC",
    [learnerId, sessionId],
  );
  return {
    runs: await Promise.all(rows.rows.map((row) => getRun(learnerId, row.id))),
    remaining: Math.max(0, 3 - rows.rows.length),
    available: applicationCapabilities().model,
  };
}

/** Claims are serialized by row locks; a stale process cannot publish under a newer lease. */
export async function claimRun(runId?: string): Promise<ClaimedRun | null> {
  if (runId !== undefined) z.uuid().parse(runId);
  return transaction(async (client) => {
    await client.query(
      "UPDATE learning_runs SET state='failed',stage='Interrupted',lease_token=NULL,lease_until=NULL,error=$1,updated_at=now() WHERE state='running' AND lease_until < now() AND attempts>=3",
      [
        JSON.stringify({
          code: 'INTERRUPTED',
          message:
            'This request was interrupted repeatedly. Saved activity is safe; start a new request.',
          retryable: true,
        }),
      ],
    );
    const rows = await client.query<RunRow>(
      `SELECT * FROM learning_runs WHERE (state='queued' OR (state='running' AND lease_until < now())) AND attempts<3 ${runId ? 'AND id=$1' : ''} ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      runId ? [runId] : [],
    );
    if (!rows.rows[0]) return null;
    const token = randomUUID();
    const claimed = await client.query<ClaimedRun>(
      "UPDATE learning_runs SET state='running',stage='Checking your saved context',lease_token=$2,lease_until=now()+interval '120 seconds',attempts=attempts+1,updated_at=now() WHERE id=$1 RETURNING *",
      [rows.rows[0].id, token],
    );
    return claimed.rows[0];
  });
}
export async function assertActiveRun(
  job: ClaimedRun,
  client: Queryable = database(),
): Promise<void> {
  const rows = await client.query<{ learner_version: number }>(
    "SELECT l.version AS learner_version FROM learning_runs r JOIN learners l ON l.id=r.learner_id WHERE r.id=$1 AND r.learner_id=$2 AND r.state='running' AND r.lease_token=$3 AND r.lease_until > now()",
    [job.id, job.learner_id, job.lease_token],
  );
  if (!rows.rows[0])
    throw new ProviderError('CANCELLED', 'The request was cancelled or its worker lease changed.');
  if (job.kind === 'discovery' && rows.rows[0].learner_version !== job.profile_version)
    throw new ProviderError(
      'STALE',
      'Your preferences changed. Build a new path using your current choices.',
    );
  if (job.kind === 'coaching' && job.content_version_id)
    await getTeachingSource(job.content_version_id, client);
}
export async function checkpointRun(job: ClaimedRun, name: string, data: unknown, summary: string) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(name) || summary.length > 240)
    throw new Error('Invalid internal checkpoint');
  await assertActiveRun(job);
  const trace = { stage: name, summary, at: new Date().toISOString() };
  const result = await database().query(
    "UPDATE learning_runs SET checkpoints=checkpoints || jsonb_build_object($3::text,$4::jsonb),stage=$5,trace=trace || $6::jsonb,lease_until=now()+interval '120 seconds',updated_at=now() WHERE id=$1 AND state='running' AND lease_token=$2 AND lease_until > now() RETURNING id",
    [job.id, job.lease_token, name, JSON.stringify(data), summary, JSON.stringify([trace])],
  );
  if (!result.rowCount)
    throw new ProviderError('CANCELLED', 'The request was cancelled or its worker lease changed.');
  job.checkpoints[name] = data;
}
export async function reserveProviderCall(
  job: ClaimedRun,
  provider: 'qloo' | 'model',
  step: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!/^[a-z0-9-]{1,50}$/.test(step)) throw new Error('Invalid internal provider step');
  const credential = env[provider === 'qloo' ? 'QLOO_API_KEY' : 'OPENAI_API_KEY'];
  if (!credential?.trim())
    throw new ProviderError('CONFIGURATION', 'This live provider is not configured.');
  const scope = fingerprint({ provider, credential: credential.trim() });
  const principal = fingerprint({ learner: job.learner_id });
  const dailyLimit = boundedSetting(
    env,
    provider === 'qloo' ? 'QLOO_DAILY_CALL_LIMIT' : 'MODEL_DAILY_CALL_LIMIT',
    provider === 'qloo' ? 100 : 120,
    10000,
  );
  const guestLimit = boundedSetting(
    env,
    provider === 'qloo' ? 'QLOO_GUEST_DAILY_CALL_LIMIT' : 'MODEL_GUEST_DAILY_CALL_LIMIT',
    provider === 'qloo' ? 15 : 12,
    1000,
  );
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      `immersion-provider:${scope}`,
    ]);
    await assertActiveRun(job, client);
    const existing = await client.query(
      'SELECT id FROM provider_call_reservations WHERE run_id=$1 AND provider=$2 AND step=$3',
      [job.id, provider, step],
    );
    if (existing.rowCount)
      throw new ProviderError(
        'INTERRUPTED',
        'A provider request was interrupted before its result was saved. It will not be repeated automatically; start a new request if needed.',
      );
    const jobCount = await client.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM provider_call_reservations WHERE run_id=$1 AND provider=$2',
      [job.id, provider],
    );
    if (jobCount.rows[0].count >= (provider === 'qloo' ? 1 : 2))
      throw new ProviderError(
        'BUDGET',
        'This request reached its bounded provider allowance. Saved study activity is safe.',
      );
    const totals = await client.query<{ daily: number; guest: number; recent: number }>(
      `SELECT count(*)::int AS daily, count(*) FILTER(WHERE principal_hash=$3)::int AS guest, count(*) FILTER(WHERE reserved_at > now()-interval '1 minute')::int AS recent FROM provider_call_reservations WHERE credential_scope=$1 AND provider=$2 AND reserved_at > now()-interval '1 day'`,
      [scope, provider, principal],
    );
    const total = totals.rows[0];
    if (total.daily >= dailyLimit || total.guest >= guestLimit || total.recent >= 20)
      throw new ProviderError(
        'BUDGET',
        'The live request allowance is currently reached. Original stories, saved practice, and word reviews remain available.',
      );
    await client.query(
      'INSERT INTO provider_call_reservations(id,run_id,principal_hash,credential_scope,provider,step) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), job.id, principal, scope, provider, step],
    );
  });
}
export async function finishRun(job: ClaimedRun, result: RunResult) {
  return transaction(async (client) => {
    await ownLearner(job.learner_id, client, true);
    await assertActiveRun(job, client);
    if (result.kind !== job.kind)
      throw new ProviderError('GROUNDING', 'The worker returned a result for the wrong activity.');
    if (result.kind === 'discovery') {
      for (const card of result.recommendations) {
        if (result.planning.mode === 'ai') await getTeachingSource(card.piece.versionId, client);
        else await getSource(card.piece.versionId, client);
      }
    }
    const summary =
      result.kind === 'resolution'
        ? 'Catalog matches are ready for your confirmation.'
        : result.kind === 'discovery'
          ? 'Your cultural path is ready.'
          : 'Your source-based writing feedback is ready.';
    const trace = [{ stage: 'complete', summary, at: new Date().toISOString() }];
    const saved = await client.query(
      "UPDATE learning_runs SET state='succeeded',result=$3,error=NULL,stage=$4,trace=trace || $5::jsonb,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND state='running' AND lease_token=$2 AND lease_until > now() RETURNING id",
      [job.id, job.lease_token, JSON.stringify(result), summary, JSON.stringify(trace)],
    );
    if (!saved.rowCount)
      throw new ProviderError(
        'CANCELLED',
        'The request was cancelled or its worker lease changed.',
      );
    await client.query(
      'INSERT INTO events(id,learner_id,kind,summary,detail) VALUES($1,$2,$3,$4,$5)',
      [
        randomUUID(),
        job.learner_id,
        `live.${result.kind}`,
        summary,
        JSON.stringify({
          mode: result.mode,
          runId: job.id,
          policy:
            result.kind === 'coaching'
              ? result.policyVersion
              : result.kind === 'discovery'
                ? result.comparison.policy
                : 'explicit-catalog-confirmation-v1',
        }),
      ],
    );
  });
}
export async function failRun(job: ClaimedRun, error: unknown) {
  const known = error instanceof DomainError || error instanceof ProviderError;
  const code = known ? error.code : 'UPSTREAM';
  const message = known
    ? error.message
    : 'The live request could not finish. Your saved learning activity is safe. Try again or continue with the original collection.';
  const retryable = ![
    'INPUT',
    'GROUNDING',
    'SOURCE_PERMISSION',
    'SOURCE_UNAVAILABLE',
    'CANCELLED',
  ].includes(code);
  const result = await database().query(
    "UPDATE learning_runs SET state='failed',stage='Request stopped safely',error=$3,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1 AND state='running' AND lease_token=$2 RETURNING id",
    [job.id, job.lease_token, JSON.stringify({ code, message, retryable })],
  );
  return !!result.rowCount;
}
export async function getProviderCache(key: string) {
  const result = await database().query<{ data: unknown }>(
    'SELECT data FROM provider_result_cache WHERE key=$1 AND expires_at > now()',
    [key],
  );
  return result.rows[0]?.data ?? null;
}
export async function putProviderCache(key: string, data: unknown) {
  await database().query(
    "INSERT INTO provider_result_cache(key,data,expires_at) VALUES($1,$2,now()+interval '24 hours') ON CONFLICT(key) DO UPDATE SET data=excluded.data,created_at=now(),expires_at=excluded.expires_at",
    [key, JSON.stringify(data)],
  );
}
export async function recordHeartbeat(failed = false) {
  await database().query(
    'INSERT INTO worker_heartbeat(id,last_seen_at,last_failure_at) VALUES(1,now(),CASE WHEN $1 THEN now() ELSE NULL END) ON CONFLICT(id) DO UPDATE SET last_seen_at=now(),last_failure_at=excluded.last_failure_at',
    [failed],
  );
}
export async function purgeProviderMetadata() {
  await database().query('DELETE FROM provider_result_cache WHERE expires_at < now()');
  await database().query(
    "DELETE FROM provider_call_reservations WHERE reserved_at < now()-interval '2 days'",
  );
}
export async function exportLiveLearner(learnerId: string) {
  const interests = await getInterests(learnerId);
  const rows = await database().query<{ id: string; payload: { answer?: string } }>(
    'SELECT id,payload FROM learning_runs WHERE learner_id=$1 ORDER BY created_at,id',
    [learnerId],
  );
  const runs = [];
  for (const row of rows.rows) {
    const run = await getRun(learnerId, row.id);
    const safe = structuredClone(run);
    if (safe.result?.kind === 'coaching') safe.result.sourceEvidence = [];
    if (safe.result?.kind === 'discovery') {
      for (const card of safe.result.recommendations) {
        delete card.evidence.sourceQuote;
        card.piece.preview = '';
      }
    }
    runs.push({
      ...safe,
      submittedAnswer: run.kind === 'coaching' && run.result ? (row.payload.answer ?? null) : null,
    });
  }
  return { interests, runs };
}
