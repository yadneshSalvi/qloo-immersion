import { z } from 'zod';
import { culturalTypes } from './live';
const key = z.uuid();
export const resolutionInputSchema = z.strictObject({
  key,
  query: z.string().trim().min(2).max(120),
  entityType: z.enum(culturalTypes),
});
export const confirmationInputSchema = z.strictObject({
  key,
  runId: z.uuid(),
  candidateId: z.uuid(),
});
export const removalInputSchema = z.strictObject({ key, entityId: z.uuid() });
export const discoveryInputSchema = z.strictObject({
  key,
  expectedVersion: z.number().int().positive(),
});
export const coachingInputSchema = z.strictObject({
  key,
  sessionId: z.uuid(),
  answer: z.string().trim().min(5).max(800),
  consent: z.literal(true),
});
export const cancellationInputSchema = z.strictObject({ key });
