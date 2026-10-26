import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { getSession } from './store';
import type { Source } from '../domain/types';

const mediaAssetSchema = z.object({
  pieceId: z.string().min(1).max(100),
  versionId: z.string().min(1).max(120),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  audioFile: z.string().regex(/^[a-z0-9][a-z0-9._-]*\.mp3$/),
  durationSeconds: z.number().finite().positive().max(1800),
  segments: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        startSeconds: z.number().finite().nonnegative(),
        endSeconds: z.number().finite().positive(),
      }),
    )
    .min(1)
    .max(20),
  voice: z.string().min(1).max(100),
  model: z.string().min(1).max(120),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export function narrationSourceHash(source: Source) {
  return createHash('sha256')
    .update(source.segments.map((segment) => segment.text).join('\n\n'))
    .digest('hex');
}
export function validateMediaAsset(input: unknown, source: Source): MediaAsset | null {
  const parsed = mediaAssetSchema.safeParse(input);
  if (!parsed.success) return null;
  const asset = parsed.data;
  if (
    asset.pieceId !== source.id ||
    asset.versionId !== source.versionId ||
    asset.sourceHash !== narrationSourceHash(source) ||
    asset.segments.length !== source.segments.length
  )
    return null;
  if (
    asset.segments.some(
      (segment, index) =>
        segment.id !== source.segments[index].id ||
        segment.endSeconds <= segment.startSeconds ||
        segment.endSeconds > asset.durationSeconds + 0.05 ||
        (index > 0 && segment.startSeconds < asset.segments[index - 1].endSeconds),
    )
  )
    return null;
  return asset;
}
export function parseByteRange(
  value: string | null,
  size: number,
): { start: number; end: number } | null | 'invalid' {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size <= 0)
    return 'invalid';
  if (!match[1]) {
    const count = Number(match[2]);
    if (!Number.isSafeInteger(count) || count <= 0) return 'invalid';
    return { start: Math.max(0, size - count), end: size - 1 };
  }
  const start = Number(match[1]),
    requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start >= size ||
    requestedEnd < start
  )
    return 'invalid';
  return { start, end: Math.min(size - 1, requestedEnd) };
}
async function sessionMedia(learnerId: string, sessionId: string) {
  const session = await getSession(learnerId, sessionId);
  // Serving an already-created licensed narration needs source delivery rights.
  // Permission for future model processing is a separate grant.
  const source = session.piece;
  if (source.format !== 'listen') return null;
  // Docker ships assets/audio explicitly; an operator may instead mount this directory.
  // Do not trace an arbitrary runtime directory or the entire project into Next output.
  const directory = resolve(
    /* turbopackIgnore: true */ process.env.IMMERSION_AUDIO_DIRECTORY ?? 'assets/audio',
  );
  try {
    const manifestPath = resolve(directory, 'manifest.json');
    if ((await stat(manifestPath)).size > 8_000_000) return null;
    const manifest: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
    const rows: unknown[] | null = Array.isArray(manifest)
      ? manifest
      : manifest &&
          typeof manifest === 'object' &&
          'assets' in manifest &&
          Array.isArray(manifest.assets)
        ? manifest.assets
        : null;
    if (!rows || rows.length > 200) return null;
    const valid = rows
      .map((row) => validateMediaAsset(row, source))
      .filter((row): row is MediaAsset => !!row);
    if (valid.length !== 1) return null;
    const asset = valid[0];
    const root = await realpath(/* turbopackIgnore: true */ directory);
    const path = await realpath(/* turbopackIgnore: true */ resolve(directory, asset.audioFile));
    if (!path.startsWith(root + sep)) return null;
    const file = await stat(path);
    if (!file.isFile() || file.size <= 0 || file.size > 50_000_000) return null;
    return { asset, path, size: file.size };
  } catch {
    return null;
  }
}
export async function getMediaManifest(learnerId: string, sessionId: string) {
  const media = await sessionMedia(learnerId, sessionId);
  return media
    ? {
        available: true,
        audioUrl: `/api/media/${sessionId}`,
        durationSeconds: media.asset.durationSeconds,
        segments: media.asset.segments,
        voice: media.asset.voice,
        model: media.asset.model,
        label: 'Synthetic Spanish narration of this original story',
      }
    : { available: false };
}
export async function mediaResponse(learnerId: string, sessionId: string, request: Request) {
  const media = await sessionMedia(learnerId, sessionId);
  const common = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Cookie',
  };
  if (!media)
    return Response.json(
      {
        error: {
          code: 'MEDIA_UNAVAILABLE',
          message:
            'Narration is unavailable. Continue with the source text or the optional browser voice.',
          retryable: false,
        },
      },
      { status: 404, headers: common },
    );
  const range = parseByteRange(request.headers.get('range'), media.size);
  if (range === 'invalid')
    return new Response(null, {
      status: 416,
      headers: { ...common, 'Content-Range': `bytes */${media.size}`, 'Accept-Ranges': 'bytes' },
    });
  const start = range?.start ?? 0,
    end = range?.end ?? media.size - 1;
  const headers = {
    ...common,
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Content-Length': String(end - start + 1),
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${media.size}` } : {}),
  };
  const body =
    request.method === 'HEAD'
      ? null
      : (Readable.toWeb(
          createReadStream(media.path, { start, end }),
        ) as ReadableStream<Uint8Array>);
  return new Response(body, { status: range ? 206 : 200, headers });
}
