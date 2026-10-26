import { z } from 'zod';
import type { Source } from './types';
import type { DiscoverySnapshot, StudyStep } from './discovery';
import { orderedOptions } from './discovery';
import { ProviderError } from '../integrations/qloo-live';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const coachingDraftSchema = z.strictObject({
  status: z.enum(['feedback', 'try-again']),
  success: text(10, 220),
  corrections: z
    .array(
      z.strictObject({ before: text(1, 140), after: text(1, 180), explanation: text(10, 220) }),
    )
    .max(2),
  modelAnswer: text(10, 400),
  nextPrompt: text(10, 200),
  sourceEvidence: z
    .array(z.strictObject({ segmentId: text(1, 120), quote: text(12, 240) }))
    .min(1)
    .max(2),
});
export type CoachingDraft = z.infer<typeof coachingDraftSchema>;
export const studyDraftSchema = z.strictObject({
  steps: z
    .array(
      z.strictObject({
        bridgeKey: text(1, 60),
        versionId: text(1, 120),
        studyFocus: text(10, 180),
        warmupQuestion: text(10, 200),
        sourceQuote: text(12, 240),
      }),
    )
    .min(1)
    .max(3),
});
const forbidden =
  /(?:https?:\/\/|www\.|<\/?(?:script|iframe|img)|\b(?:api[_ -]?key|bearer|password|secret)\s*[:=]|\b(?:certified|fluency score|proficiency score|retention gain)\b)/i;
function safeOutput(value: unknown) {
  if (forbidden.test(JSON.stringify(value)))
    throw new ProviderError(
      'GROUNDING',
      'Generated study feedback did not pass its content boundaries. Your source practice remains available.',
    );
}
export function validateCoachingDraft(raw: unknown, source: Source, answer: string): CoachingDraft {
  const parsed = coachingDraftSchema.safeParse(raw);
  if (!parsed.success)
    throw new ProviderError(
      'GROUNDING',
      'Writing feedback did not match the bounded teaching format. Try again with a short Spanish answer.',
    );
  const value = parsed.data;
  safeOutput(value);
  if (value.status === 'try-again' && value.corrections.length)
    throw new ProviderError(
      'GROUNDING',
      'Unassessable writing cannot receive confident corrections.',
    );
  const spans: { start: number; end: number }[] = [];
  for (const correction of value.corrections) {
    const start = answer.indexOf(correction.before);
    const end = start + correction.before.length;
    if (
      start < 0 ||
      correction.before === correction.after ||
      spans.some((span) => start < span.end && end > span.start)
    )
      throw new ProviderError(
        'GROUNDING',
        'A proposed correction did not match the learner’s actual words.',
      );
    spans.push({ start, end });
  }
  const evidenceKeys = new Set<string>();
  for (const evidence of value.sourceEvidence) {
    const segment = source.segments.find((item) => item.id === evidence.segmentId);
    const key = `${evidence.segmentId}:${evidence.quote}`;
    if (!segment?.text.includes(evidence.quote) || evidenceKeys.has(key))
      throw new ProviderError(
        'GROUNDING',
        'A proposed source quotation could not be verified against this exact story.',
      );
    evidenceKeys.add(key);
  }
  return value;
}
export function validateStudyDraft(
  raw: unknown,
  snapshot: DiscoverySnapshot,
  rankedIds: string[],
): StudyStep[] {
  const parsed = studyDraftSchema.safeParse(raw);
  if (!parsed.success)
    throw new ProviderError(
      'GROUNDING',
      'The generated study path did not match its bounded format.',
    );
  safeOutput(parsed.data);
  const expected = orderedOptions(snapshot, rankedIds).slice(0, 3);
  if (parsed.data.steps.length !== expected.length)
    throw new ProviderError(
      'GROUNDING',
      'The generated study path did not cover the eligible cultural routes.',
    );
  const seen = new Set<string>();
  parsed.data.steps.forEach((step, index) => {
    const option = expected[index];
    const source = option.pieces.find((piece) => piece.versionId === step.versionId);
    if (
      step.bridgeKey !== option.bridge.key ||
      !source ||
      seen.has(step.versionId) ||
      !source.segments.some((segment) => segment.text.includes(step.sourceQuote))
    )
      throw new ProviderError(
        'GROUNDING',
        'The generated study path changed a protected cultural order, source, or quotation.',
      );
    seen.add(step.versionId);
  });
  return parsed.data.steps;
}
