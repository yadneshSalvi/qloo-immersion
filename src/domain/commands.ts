import { z } from 'zod';
import { clusters } from './types';
const uuid = z.uuid();
const version = z.number().int().positive();
const profileFields = {
  name: z.string().trim().max(40),
  readingBand: z.enum(['A2', 'B1']),
  listeningBand: z.enum(['A2', 'B1']),
  minutes: z.union([z.literal(6), z.literal(10), z.literal(15)]),
  interests: z
    .array(z.enum(clusters))
    .min(1)
    .max(6)
    .refine((v) => new Set(v).size === v.length),
  references: z.array(z.string().trim().min(1).max(100)).max(3),
  support: z.enum(['independent', 'guided', 'extra']),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Choose a valid time zone.'),
};
export const onboardingSchema = z
  .object({ ...profileFields, adult: z.literal(true), key: uuid })
  .strict();
const sessionFields = { sessionId: uuid, expectedVersion: version };
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), expectedVersion: version, ...profileFields }).strict(),
  z
    .object({
      type: z.literal('start'),
      versionId: z.string().min(1).max(100),
      support: z.enum(['independent', 'guided', 'extra']),
    })
    .strict(),
  z
    .object({
      type: z.literal('position'),
      ...sessionFields,
      position: z.number().int().min(0).max(99),
    })
    .strict(),
  z.object({ type: z.literal('begin-practice'), ...sessionFields }).strict(),
  z
    .object({
      type: z.literal('answer'),
      ...sessionFields,
      assessmentId: z.string().min(1).max(100),
      answer: z.string().trim().min(1).max(250),
    })
    .strict(),
  z
    .object({
      type: z.literal('complete'),
      ...sessionFields,
      taste: z.enum(['more', 'different', 'unsure']),
      difficulty: z.enum(['comfortable', 'some-help', 'hard']),
      consent: z.boolean(),
      note: z.string().trim().max(1000),
    })
    .strict(),
  z
    .object({ type: z.literal('save-word'), sessionId: uuid, termId: z.string().min(1).max(100) })
    .strict(),
  z
    .object({
      type: z.literal('review'),
      reviewId: uuid,
      expectedVersion: version,
      answer: z.string().trim().min(1).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal('bookmark'),
      versionId: z.string().min(1).max(100),
      saved: z.boolean(),
    })
    .strict(),
]);
export const commandEnvelopeSchema = z.object({ key: uuid, command: commandSchema }).strict();
export type Command = z.infer<typeof commandSchema>;
export type Onboarding = z.infer<typeof onboardingSchema>;
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 422,
    public readonly retryable = false,
  ) {
    super(message);
  }
}
export function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.!?¿¡,;:]/g, '')
    .replace(/\s+/g, ' ');
}
