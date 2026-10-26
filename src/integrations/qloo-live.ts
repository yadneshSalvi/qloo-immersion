import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import { culturalTypes, type CulturalCandidate, type CulturalType } from '../domain/live';

export const QLOO_ADAPTER_VERSION = 'immersion-harness-api-0.1.26-v1';
export class ProviderError extends Error {
  constructor(
    public readonly code:
      | 'CONFIGURATION'
      | 'INPUT'
      | 'TIMEOUT'
      | 'UPSTREAM'
      | 'MALFORMED'
      | 'BUDGET'
      | 'CANCELLED'
      | 'STALE'
      | 'GROUNDING'
      | 'INTERRUPTED',
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
export type QlooRequest =
  | { operation: 'search'; entityType: CulturalType; query: string }
  | {
      operation: 'insights';
      entityType: 'movie';
      signals: string[];
      candidates: string[];
      take: number;
    };
export type QlooTransport = (request: QlooRequest, signal?: AbortSignal) => Promise<unknown>;
const uuid = z.uuid().transform((value) => value.toLowerCase());
const types = z.enum(culturalTypes);
const safeText = (value: string, max = 300) =>
  value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
const privateText =
  /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:api[_ -]?key|bearer|password|secret)\s*[:=])/i;
export function assertPublicCulturalQuery(query: string) {
  if (
    typeof query !== 'string' ||
    !query.trim() ||
    query.length > 120 ||
    /[\u0000-\u001f]/.test(query) ||
    privateText.test(query)
  ) {
    throw new ProviderError(
      'INPUT',
      'Enter an artist, film, book, or other cultural name. Keep contact details, links, and credentials out of this search.',
    );
  }
}
export function validateQlooRequest(request: QlooRequest): QlooRequest {
  if (!types.safeParse(request.entityType).success)
    throw new ProviderError('INPUT', 'Choose a supported cultural category.');
  if (request.operation === 'search') {
    assertPublicCulturalQuery(request.query);
    return { ...request, query: request.query.trim() };
  }
  if (
    request.operation !== 'insights' ||
    request.entityType !== 'movie' ||
    !Number.isInteger(request.take) ||
    request.take < 1 ||
    request.take > 10
  )
    throw new ProviderError('INPUT', 'Rank one to ten eligible film references in one query.');
  const ids = (values: string[], max: number) => {
    const result = z.array(uuid).min(1).max(max).safeParse(values);
    if (!result.success || new Set(result.data).size !== result.data.length)
      throw new ProviderError('INPUT', 'Use distinct confirmed catalog identities.');
    return result.data;
  };
  const candidates = ids(request.candidates, 10);
  if (request.take !== candidates.length)
    throw new ProviderError('INPUT', 'The requested ranking must cover its exact shortlist.');
  return { ...request, signals: ids(request.signals, 3), candidates };
}
const rowSchema = z.object({
  entity_id: uuid,
  name: z.string().min(1).max(500).optional(),
  types: z.array(z.string()).max(10).optional(),
  type: z.string().optional(),
  subtype: z.string().optional(),
  disambiguation: z.string().max(2000).optional(),
  query: z.object({ affinity: z.number().finite().optional() }).optional(),
});
function parseRows(raw: unknown, entityType: CulturalType, limit: number) {
  const parsed = z.array(rowSchema).max(limit).safeParse(raw);
  if (!parsed.success)
    throw new ProviderError(
      'MALFORMED',
      'Qloo returned an unsupported result. No identity or recommendation was substituted.',
    );
  const seen = new Set<string>();
  const expected = `urn:entity:${entityType}`;
  for (const row of parsed.data) {
    const declared = [
      ...(row.types ?? []),
      ...(row.type ? [row.type] : []),
      ...(row.subtype ? [row.subtype] : []),
    ];
    if (
      !declared.includes(expected) ||
      declared.some((type) => type !== expected && type !== 'urn:entity') ||
      seen.has(row.entity_id)
    )
      throw new ProviderError('MALFORMED', 'Qloo returned a duplicate or wrong-category identity.');
    seen.add(row.entity_id);
  }
  return parsed.data;
}
export function parseSearchResults(raw: unknown, entityType: CulturalType): CulturalCandidate[] {
  return parseRows(raw, entityType, 5).map((row) => {
    if (!row.name)
      throw new ProviderError('MALFORMED', 'A catalog match needs an explicit canonical name.');
    return {
      entityId: row.entity_id,
      entityType,
      name: safeText(row.name),
      disambiguation: safeText(row.disambiguation ?? ''),
    };
  });
}
/** Only ordinal positions within this exact query are used. Raw affinity scores never cross query boundaries. */
export function parseRankedResults(
  raw: unknown,
  request: Extract<QlooRequest, { operation: 'insights' }>,
): string[] {
  const validated = validateQlooRequest(request) as typeof request;
  return parseRows(raw, 'movie', validated.take).map((row) => {
    if (!validated.candidates.includes(row.entity_id))
      throw new ProviderError(
        'MALFORMED',
        'Qloo returned a reference outside the eligible shortlist.',
      );
    return row.entity_id;
  });
}
export function officialQlooArguments(input: QlooRequest): string[] {
  const request = validateQlooRequest(input);
  if (request.operation === 'search')
    return [
      'api',
      'search',
      '--query',
      request.query,
      '--type',
      request.entityType,
      '--take',
      '5',
      '--json',
    ];
  return [
    'api',
    'insights',
    '--type',
    'movie',
    '--signal-entities',
    request.signals.join(','),
    '--params',
    JSON.stringify({ 'filter.results.entities': request.candidates }),
    '--take',
    String(request.take),
    '--json',
  ];
}
const runFile = promisify(execFile);
/** Official installed CLI; a preload restricts it to one GET, no redirects or implicit retries. */
export function officialQlooTransport(env: NodeJS.ProcessEnv = process.env): QlooTransport {
  return async (request, signal) => {
    const args = officialQlooArguments(request);
    signal?.throwIfAborted();
    if (
      !env.QLOO_API_KEY?.trim() ||
      (env.QLOO_BASE_URL && env.QLOO_BASE_URL !== 'https://hackathon.api.qloo.com')
    )
      throw new ProviderError(
        'CONFIGURATION',
        'Live cultural discovery is not configured. The original collection remains available.',
      );
    const bin = fileURLToPath(new URL('./bin.js', import.meta.resolve('@qloo/qloo-harness')));
    const guard = fileURLToPath(new URL('../../scripts/qloo-fetch-guard.mjs', import.meta.url));
    try {
      const { stdout } = await runFile(process.execPath, ['--import', guard, bin, ...args], {
        timeout: 15000,
        killSignal: 'SIGKILL',
        maxBuffer: 512000,
        encoding: 'utf8',
        signal,
        env: {
          NODE_ENV: 'production',
          PATH: env.PATH,
          QLOO_HOME: resolve('.data/qloo-worker'),
          QLOO_API_KEY: env.QLOO_API_KEY.trim(),
          QLOO_BASE_URL: 'https://hackathon.api.qloo.com',
          QLOO_TRUSTED_BASE_URL: 'https://hackathon.api.qloo.com',
          IMMERSION_QLOO_FETCH_GUARD: '1',
          IMMERSION_QLOO_OPERATION: request.operation,
        },
      });
      try {
        return JSON.parse(stdout) as unknown;
      } catch {
        throw new ProviderError('MALFORMED', 'Qloo returned an unreadable result.');
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (signal?.aborted) throw new ProviderError('CANCELLED', 'This request was cancelled.');
      const timedOut = !!error && typeof error === 'object' && 'killed' in error && error.killed;
      throw new ProviderError(
        timedOut ? 'TIMEOUT' : 'UPSTREAM',
        timedOut
          ? 'Cultural discovery exceeded its time limit. Your saved stories are still available.'
          : 'Cultural discovery is temporarily unavailable. Your saved stories are still available.',
      );
    }
  };
}
