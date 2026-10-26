import { MockLanguageModelV4 } from 'ai/test';
import { corpus } from '../../src/content/corpus';
import type { CulturalBridge } from '../../src/domain/live';
import type { Profile } from '../../src/domain/types';
import type { CoachingDraft } from '../../src/domain/teaching';
import { clusters } from '../../src/domain/types';

export const fakeId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const bridges: CulturalBridge[] = clusters.map((cluster, index) => ({
  key: `fixture-${cluster}`,
  entityId: fakeId(index + 10),
  entityType: 'movie',
  name: `Fixture ${cluster} film`,
  cluster,
  theme: `An editorial ${cluster} theme`,
  explanation: 'A fictional test-only catalog bridge with no claim of live provider evidence.',
  sourceUrl: 'https://www.imdb.com/title/tt0000000/',
  verifiedAt: '2026-10-27T00:00:00.000Z',
}));
export const profile: Profile = {
  name: 'Private learner name',
  readingBand: 'A2',
  listeningBand: 'A2',
  minutes: 10,
  interests: ['food', 'cinema'],
  references: ['Private unconfirmed reference'],
  support: 'guided',
  timezone: 'UTC',
  adaptation: null,
};
export const source = corpus[0].source;
export const learnerAnswer = 'Me gusta los mercados porque puedo hablar con otras personas.';
export const coachingDraft: CoachingDraft = {
  status: 'feedback',
  success: 'You give a clear reason for wanting to visit the market.',
  corrections: [
    {
      before: 'Me gusta los mercados',
      after: 'Me gustan los mercados',
      explanation: 'Use gustan because the thing you like, los mercados, is plural.',
    },
  ],
  modelAnswer:
    'Me gustan los mercados porque puedo hablar con otras personas. Después de comer, pido la cuenta.',
  nextPrompt: 'Try again with me gustan and add one detail from the conversation.',
  sourceEvidence: [
    { segmentId: source.segments[2].id, quote: 'Después de comer, Clara pide la cuenta.' },
  ],
};
const usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 100, text: 100, reasoning: 0 },
};
export function teachingMock(
  toolName: 'inspectAssignedSource' | 'inspectEligibleCorpus',
  output: unknown,
  observe?: (step: number) => Promise<void> | void,
) {
  let step = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const current = step++;
      await observe?.(current);
      return current === 0
        ? {
            content: [{ type: 'tool-call', toolCallId: 'fixture-inspect', toolName, input: '{}' }],
            finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
            usage,
            warnings: [],
          }
        : {
            content: [{ type: 'text', text: JSON.stringify(output) }],
            finishReason: { unified: 'stop', raw: 'stop' },
            usage,
            warnings: [],
          };
    },
  });
}
