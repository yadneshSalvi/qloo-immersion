import { z } from 'zod';
import type { LanguageModel } from 'ai';
import {
  culturalTypes,
  type CulturalBridge,
  type ResolutionResult,
  type RunResult,
} from '../domain/live';
import {
  buildDiscoveryResult,
  eligibleDiscoveryOptions,
  type DiscoverySnapshot,
  type StudyStep,
} from '../domain/discovery';
import { validateCoachingDraft, validateStudyDraft } from '../domain/teaching';
import {
  officialQlooTransport,
  parseRankedResults,
  parseSearchResults,
  ProviderError,
  QLOO_ADAPTER_VERSION,
  type QlooRequest,
  type QlooTransport,
} from '../integrations/qloo-live';
import {
  generateCoaching,
  generateStudyPlan,
  type TeachingRuntime,
} from '../integrations/teaching';
import {
  COACHING_POLICY,
  getCulturalBridges,
  LIVE_MODEL,
  providerConfiguration,
} from './live-config';
import { getSource } from './store';
import {
  assertActiveRun,
  checkpointRun,
  claimRun,
  failRun,
  fingerprint,
  finishRun,
  getProviderCache,
  getTeachingSource,
  putProviderCache,
  recordHeartbeat,
  reserveProviderCall,
  type ClaimedRun,
  type InitialDiscoverySnapshot,
} from './live-store';

export interface WorkerRuntime {
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  transport?: QlooTransport;
  model?: LanguageModel;
  bridges?: CulturalBridge[];
}
const candidate = z.strictObject({
  entityId: z.uuid(),
  entityType: z.enum(culturalTypes),
  name: z.string().min(1).max(300),
  disambiguation: z.string().max(300),
});
const searchEvidenceSchema = z.strictObject({
  candidates: z.array(candidate).max(5),
  evidenceAt: z.iso.datetime(),
  mode: z.enum(['live', 'cached']),
});
const rankEvidenceSchema = z.strictObject({
  rankedIds: z.array(z.uuid()).max(10),
  evidenceAt: z.iso.datetime(),
  mode: z.enum(['live', 'cached']),
});
function cacheKey(request: QlooRequest, env: NodeJS.ProcessEnv) {
  return fingerprint({
    adapter: QLOO_ADAPTER_VERSION,
    scope: fingerprint(env.QLOO_API_KEY?.trim() ?? ''),
    request,
  });
}
function teachingRuntime(job: ClaimedRun, runtime: WorkerRuntime): TeachingRuntime {
  return {
    env: runtime.env,
    signal: runtime.signal,
    model: runtime.model,
    assertActive: () => assertActiveRun(job),
    reserve: (step) => reserveProviderCall(job, 'model', step, runtime.env),
    inspectSource: getTeachingSource,
    checkpoint: (name, data, summary) => checkpointRun(job, name, data, summary),
  };
}
async function resolution(job: ClaimedRun, runtime: WorkerRuntime): Promise<ResolutionResult> {
  const payload = z
    .strictObject({ query: z.string().min(2).max(120), entityType: z.enum(culturalTypes) })
    .parse(job.payload);
  const env = runtime.env ?? process.env;
  const request: QlooRequest = { operation: 'search', ...payload };
  let evidence = searchEvidenceSchema.safeParse(job.checkpoints.search);
  if (!evidence.success) {
    const key = cacheKey(request, env);
    const cached = searchEvidenceSchema.safeParse(await getProviderCache(key));
    if (cached.success) evidence = { success: true, data: { ...cached.data, mode: 'cached' } };
    else {
      await reserveProviderCall(job, 'qloo', 'search', env);
      const raw = await (runtime.transport ?? officialQlooTransport(env))(request, runtime.signal);
      evidence = {
        success: true,
        data: {
          candidates: parseSearchResults(raw, payload.entityType),
          evidenceAt: new Date().toISOString(),
          mode: 'live',
        },
      };
      await assertActiveRun(job);
      await putProviderCache(key, evidence.data);
    }
    await checkpointRun(
      job,
      'search',
      evidence.data,
      evidence.data.mode === 'cached'
        ? 'Previously recorded catalog matches were loaded with their original timestamp.'
        : 'One bounded Qloo search returned catalog matches.',
    );
  }
  return { kind: 'resolution', ...payload, ...evidence.data };
}
async function discoverySnapshot(
  job: ClaimedRun,
  runtime: WorkerRuntime,
): Promise<DiscoverySnapshot> {
  if (job.checkpoints.catalog) {
    const snapshot = job.checkpoints.catalog as DiscoverySnapshot;
    for (const option of snapshot.options)
      for (const piece of option.pieces) await getSource(piece.versionId);
    return snapshot;
  }
  const initial = job.snapshot as unknown as InitialDiscoverySnapshot;
  const sources = [];
  for (const versionId of initial.versionIds) {
    try {
      sources.push(await getSource(versionId));
    } catch (error) {
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        !['SOURCE_UNAVAILABLE', 'NOT_FOUND'].includes(String(error.code))
      )
        throw error;
    }
  }
  const bridges = runtime.bridges ?? (await getCulturalBridges(runtime.env));
  if (!bridges.length)
    throw new ProviderError(
      'CONFIGURATION',
      'The reviewed cultural reference catalog is unavailable. Browse original stories while it returns.',
    );
  const options = eligibleDiscoveryOptions(
    initial.profile,
    sources,
    bridges,
    new Set(initial.completedVersionIds),
  );
  if (!options.length)
    throw new ProviderError(
      'INPUT',
      'No mapped stories fit your current time and working bands. Adjust your preferences or browse the full collection.',
    );
  const snapshot: DiscoverySnapshot = {
    profileVersion: initial.profileVersion,
    profile: initial.profile,
    signals: initial.signals,
    options,
  };
  await checkpointRun(
    job,
    'catalog',
    snapshot,
    'Current source permissions, working bands, time, and unseen alternatives were checked.',
  );
  return snapshot;
}
async function discovery(job: ClaimedRun, runtime: WorkerRuntime): Promise<RunResult> {
  const env = runtime.env ?? process.env;
  const snapshot = await discoverySnapshot(job, runtime);
  const request: Extract<QlooRequest, { operation: 'insights' }> = {
    operation: 'insights',
    entityType: 'movie',
    signals: snapshot.signals.map((item) => item.entityId),
    candidates: snapshot.options.map((item) => item.bridge.entityId),
    take: snapshot.options.length,
  };
  let evidence = rankEvidenceSchema.safeParse(job.checkpoints.ranking);
  if (!evidence.success) {
    const key = cacheKey(request, env);
    const cached = rankEvidenceSchema.safeParse(await getProviderCache(key));
    if (cached.success) evidence = { success: true, data: { ...cached.data, mode: 'cached' } };
    else {
      await reserveProviderCall(job, 'qloo', 'rank', env);
      const raw = await (runtime.transport ?? officialQlooTransport(env))(request, runtime.signal);
      evidence = {
        success: true,
        data: {
          rankedIds: parseRankedResults(raw, request),
          evidenceAt: new Date().toISOString(),
          mode: 'live',
        },
      };
      await assertActiveRun(job);
      await putProviderCache(key, evidence.data);
    }
    await checkpointRun(
      job,
      'ranking',
      evidence.data,
      evidence.data.mode === 'cached'
        ? 'A recorded ranking of the identical film shortlist was reused with its timestamp.'
        : 'One Qloo query ranked the exact eligible film-reference shortlist.',
    );
  }
  if (
    new Set(evidence.data.rankedIds).size !== evidence.data.rankedIds.length ||
    evidence.data.rankedIds.some((id) => !request.candidates.includes(id))
  )
    throw new ProviderError(
      'MALFORMED',
      'Recorded cultural evidence no longer matches this exact shortlist.',
    );
  if (!evidence.data.rankedIds.length)
    throw new ProviderError(
      'UPSTREAM',
      'Qloo returned no eligible cultural connections for these favorites. Try another favorite or browse original stories.',
    );
  let steps: StudyStep[] | null = null;
  if (job.checkpoints['study-plan']) {
    steps = validateStudyDraft(job.checkpoints['study-plan'], snapshot, evidence.data.rankedIds);
  } else if (
    !job.checkpoints['study-fallback'] &&
    (runtime.model || providerConfiguration(env).model)
  ) {
    try {
      steps = await generateStudyPlan(
        snapshot,
        evidence.data.rankedIds,
        teachingRuntime(job, runtime),
      );
      await checkpointRun(
        job,
        'study-plan',
        { steps },
        'The study plan passed exact-source, quotation, order, and eligibility checks.',
      );
    } catch (error) {
      await assertActiveRun(job);
      if (error instanceof ProviderError && ['CANCELLED', 'STALE'].includes(error.code))
        throw error;
      await checkpointRun(
        job,
        'study-fallback',
        { code: error instanceof ProviderError ? error.code : 'UPSTREAM' },
        'AI study notes were unavailable; the recorded cultural order and deterministic support policy were preserved.',
      );
    }
  }
  return buildDiscoveryResult(
    snapshot,
    evidence.data.rankedIds,
    evidence.data,
    steps,
    steps ? LIVE_MODEL : null,
  );
}
async function coaching(job: ClaimedRun, runtime: WorkerRuntime): Promise<RunResult> {
  if (
    !job.content_version_id ||
    typeof job.payload.answer !== 'string' ||
    job.payload.consent !== true
  )
    throw new ProviderError(
      'INPUT',
      'Writing feedback needs an assigned source and explicit processing consent.',
    );
  const source = await getTeachingSource(job.content_version_id);
  const saved = job.checkpoints.coaching;
  const draft = saved
    ? validateCoachingDraft(saved, source, job.payload.answer)
    : await generateCoaching(source, job.payload.answer, teachingRuntime(job, runtime));
  if (!saved)
    await checkpointRun(
      job,
      'coaching',
      draft,
      'Corrections matched the submitted words and quotations matched the exact assigned source.',
    );
  return {
    kind: 'coaching',
    ...draft,
    mode: 'live',
    evidenceAt: new Date().toISOString(),
    model: LIVE_MODEL,
    policyVersion: COACHING_POLICY,
  };
}
export async function executeLearningRun(
  job: ClaimedRun,
  runtime: WorkerRuntime = {},
): Promise<RunResult> {
  await assertActiveRun(job);
  runtime.signal?.throwIfAborted();
  if (job.kind === 'resolution') return resolution(job, runtime);
  if (job.kind === 'discovery') return discovery(job, runtime);
  return coaching(job, runtime);
}
export async function processNextRun(runtime: WorkerRuntime = {}, runId?: string) {
  const job = await claimRun(runId);
  if (!job) {
    await recordHeartbeat();
    return false;
  }
  try {
    await finishRun(job, await executeLearningRun(job, runtime));
  } catch (error) {
    await failRun(job, error);
  }
  await recordHeartbeat();
  return true;
}
