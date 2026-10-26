import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { clusters } from '../domain/types';
import type { CulturalBridge } from '../domain/live';
import { ProviderError } from '../integrations/qloo-live';

export const LIVE_MODEL = 'gpt-6.1-sol';
export const DISCOVERY_POLICY = 'one-film-shortlist-theme-bridge-v1';
export const COACHING_POLICY = 'source-bound-span-correction-v1';
export const bridgeSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9-]{1,60}$/),
  entityId: z.uuid().transform((value) => value.toLowerCase()),
  entityType: z.literal('movie'),
  name: z.string().min(1).max(200),
  cluster: z.enum(clusters),
  theme: z.string().min(4).max(120),
  explanation: z.string().min(20).max(500),
  sourceUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search;
  }),
  verifiedAt: z.iso.datetime(),
});
export function validateBridges(input: unknown): CulturalBridge[] {
  const parsed = z.array(bridgeSchema).min(3).max(10).safeParse(input);
  if (
    !parsed.success ||
    new Set(parsed.data.map((item) => item.entityId)).size !== parsed.data.length ||
    new Set(parsed.data.map((item) => item.key)).size !== parsed.data.length
  )
    throw new ProviderError(
      'CONFIGURATION',
      'The cultural reference catalog needs a valid reviewed mapping.',
    );
  return parsed.data;
}
/** Canonical Qloo identities are deployment data, never invented or bundled as sample identity claims. */
export async function getCulturalBridges(
  env: NodeJS.ProcessEnv = process.env,
): Promise<CulturalBridge[]> {
  try {
    const raw =
      env.IMMERSION_CULTURAL_BRIDGES_JSON ??
      (env.IMMERSION_CULTURAL_BRIDGES_FILE
        ? await readFile(env.IMMERSION_CULTURAL_BRIDGES_FILE, 'utf8')
        : null);
    return raw ? validateBridges(JSON.parse(raw)) : [];
  } catch {
    throw new ProviderError(
      'CONFIGURATION',
      'The cultural reference catalog is unavailable. You can still browse original stories.',
    );
  }
}
export function providerConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return {
    qloo:
      !!env.QLOO_API_KEY?.trim() &&
      (!env.QLOO_BASE_URL || env.QLOO_BASE_URL === 'https://hackathon.api.qloo.com'),
    model: !!env.OPENAI_API_KEY?.trim() && (!env.OPENAI_MODEL || env.OPENAI_MODEL === LIVE_MODEL),
  };
}
export function applicationCapabilities(env: NodeJS.ProcessEnv = process.env) {
  const providers = providerConfiguration(env);
  return {
    qloo: env.LIVE_QLOO_ENABLED === '1' || providers.qloo,
    model: env.LIVE_COACHING_ENABLED === '1' || providers.model,
  };
}
export function boundedSetting(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  max: number,
) {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isSafeInteger(value) || value < 0 || value > max)
    throw new ProviderError('CONFIGURATION', 'Usage limits need valid configuration.');
  return value;
}
