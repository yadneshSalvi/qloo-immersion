import { ZodError } from 'zod';
import { DomainError } from '../domain/commands';
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = new Set([new URL(request.url).origin, process.env.APP_ORIGIN].filter(Boolean));
  if (!origin || !allowed.has(origin))
    throw new DomainError(
      'ORIGIN_REJECTED',
      'Open IMMERSION in this browser before making changes.',
      403,
    );
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
    throw new DomainError('INVALID_CONTENT_TYPE', 'Send a JSON request.');
}
export async function readJson(request: Request) {
  const text = await request.text();
  if (text.length > 16000) throw new DomainError('REQUEST_TOO_LARGE', 'This request is too large.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DomainError('INVALID_JSON', 'The request could not be read. Please try again.');
  }
}
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: error.issues[0]?.message ?? 'Check your answers and try again.',
          retryable: false,
        },
      },
      { status: 422 },
    );
  if (error instanceof DomainError)
    return Response.json(
      { error: { code: error.code, message: error.message, retryable: error.retryable } },
      { status: error.status },
    );
  console.error('IMMERSION request could not complete.', {
    kind: error instanceof Error ? error.name : 'UnknownError',
  });
  return Response.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message:
          'Your learning space is temporarily unavailable. Your saved progress is safe. Please try again.',
        retryable: true,
      },
    },
    { status: 503 },
  );
}
export const privateHeaders = { 'Cache-Control': 'private, no-store' };
