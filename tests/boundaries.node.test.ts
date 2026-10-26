import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkServerIdentity } from 'node:tls';
import { databasePoolConfiguration } from '../src/server/database-config';
import { workerDispatchAuthorized } from '../src/server/worker-auth';
import { dispatchConfiguration, learningTaskPayload } from '../src/server/dispatch';
import { sourceIntegrityHash } from '../src/server/integrity';
import { parseByteRange, validateMediaAsset, narrationSourceHash } from '../src/server/media';
import { source, fakeId } from './helpers/live-fixtures';
import { bridges } from './helpers/live-fixtures';
import { validateBridges } from '../src/server/live-config';
import { readJson } from '../src/server/http';

test('JSON input is bounded by received UTF-8 bytes even when its length header is absent or false', async () => {
  assert.deepEqual(
    await readJson(
      new Request('http://localhost/api/fixture', {
        method: 'POST',
        body: JSON.stringify({ answer: 'Una opinión.' }),
      }),
    ),
    { answer: 'Una opinión.' },
  );
  const tooLarge = (error: unknown) =>
    !!error && typeof error === 'object' && 'code' in error && error.code === 'REQUEST_TOO_LARGE';
  await assert.rejects(
    readJson(
      new Request('http://localhost/api/fixture', {
        method: 'POST',
        body: JSON.stringify({ answer: 'ñ'.repeat(8100) }),
        headers: { 'Content-Length': '1' },
      }),
    ),
    tooLarge,
  );
  await assert.rejects(
    readJson(
      new Request('http://localhost/api/fixture', {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Length': '16001' },
      }),
    ),
    tooLarge,
  );
  await assert.rejects(
    readJson(new Request('http://localhost/api/fixture', { method: 'POST', body: '{broken' })),
    (error: unknown) =>
      !!error && typeof error === 'object' && 'code' in error && error.code === 'INVALID_JSON',
  );
});

test('database TLS pins the supplied CA, removes URL overrides, and has an explicit hostname policy', () => {
  const config = databasePoolConfiguration(
    {
      DATABASE_URL:
        'postgresql://user:fixture@db.invalid/immersion?sslmode=no-verify&sslrootcert=ignored',
      DATABASE_SSL_CA_FILE: '/fixture/ca.pem',
      DATABASE_POOL_MAX: '4',
    },
    () => 'fixture-pinned-CA',
  );
  assert.equal(config.max, 4);
  assert(!config.connectionString?.includes('sslmode'));
  const ssl = config.ssl as {
    ca: string;
    rejectUnauthorized: boolean;
    checkServerIdentity: unknown;
  };
  assert.equal(ssl.ca, 'fixture-pinned-CA');
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(ssl.checkServerIdentity, checkServerIdentity);
  assert.throws(() => databasePoolConfiguration({ DATABASE_SSL_MODE: 'verify-ca' }));
  assert.throws(() => databasePoolConfiguration({ DATABASE_POOL_MAX: 'NaN' }));
  assert.throws(() =>
    databasePoolConfiguration({ DATABASE_SSL_CA_FILE: '/fixture/empty' }, () => ''),
  );
  const explicit = databasePoolConfiguration(
    { DATABASE_SSL_MODE: 'verify-ca', DATABASE_SSL_CA_FILE: '/fixture/ca' },
    () => 'fixture-CA',
  );
  assert.equal((explicit.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized, true);
});
test('private worker dispatch needs a local secret or the explicit Cloud Run IAM boundary', () => {
  const secret = 'x'.repeat(40);
  assert.equal(
    workerDispatchAuthorized(`Bearer ${secret}`, { WORKER_DISPATCH_TOKEN: secret }),
    true,
  );
  assert.equal(
    workerDispatchAuthorized('Bearer guessed', { WORKER_DISPATCH_TOKEN: secret }),
    false,
  );
  assert.equal(workerDispatchAuthorized(undefined, { WORKER_AUTH_MODE: 'cloud-run' }), false);
  assert.equal(
    workerDispatchAuthorized(undefined, {
      WORKER_AUTH_MODE: 'cloud-run',
      K_SERVICE: 'private-worker',
    }),
    true,
  );
});
test('Cloud Tasks dispatch targets only its configured private worker with stable task identity', () => {
  const config = dispatchConfiguration({
    WORKER_URL: 'https://worker.example.run.app',
    WORKER_AUTH_MODE: 'cloud-run',
    GOOGLE_CLOUD_PROJECT: 'immersion-example',
    IMMERSION_TASKS_INVOKER_SERVICE_ACCOUNT: 'tasks@immersion-example.iam.gserviceaccount.com',
  });
  assert(config?.mode === 'cloud-run');
  const first = learningTaskPayload(config, fakeId(1)),
    replay = learningTaskPayload(config, fakeId(1));
  assert.equal(first.task.name, replay.task.name);
  assert.equal(first.task.httpRequest.oidcToken.audience, 'https://worker.example.run.app');
  assert.deepEqual(JSON.parse(Buffer.from(first.task.httpRequest.body, 'base64').toString()), {
    jobId: fakeId(1),
  });
  assert.throws(() =>
    dispatchConfiguration({ WORKER_URL: 'https://worker.invalid?token=fixture' }),
  );
  assert.throws(() =>
    dispatchConfiguration({ WORKER_URL: 'http://worker.invalid', WORKER_AUTH_MODE: 'cloud-run' }),
  );
});
test('source integrity is stable under JSONB key ordering but detects any text or attribution change', () => {
  const reverse = Object.fromEntries(Object.entries(source).reverse());
  assert.equal(sourceIntegrityHash(reverse), sourceIntegrityHash(source));
  assert.notEqual(
    sourceIntegrityHash({ ...source, title: 'changed' }),
    sourceIntegrityHash(source),
  );
  assert.notEqual(
    sourceIntegrityHash({
      ...source,
      provenance: { ...source.provenance, educatorReview: 'fabricated' },
    }),
    sourceIntegrityHash(source),
  );
});
test('media byte ranges handle open/suffix requests and reject malformed or unsatisfiable ranges', () => {
  assert.deepEqual(parseByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseByteRange('bytes=90-', 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange('bytes=0-200', 100), { start: 0, end: 99 });
  assert.equal(parseByteRange(null, 100), null);
  for (const value of [
    'bytes=100-',
    'bytes=10-0',
    'bytes=0-1,3-4',
    'bytes=-0',
    'bytes=-',
    'bytes=999999999999999999999999-',
  ])
    assert.equal(parseByteRange(value, 100), 'invalid');
});
test('narration manifests require the exact frozen text, segment order, safe filename and monotonic timing', () => {
  const asset = {
    pieceId: source.id,
    versionId: source.versionId,
    sourceHash: narrationSourceHash(source),
    audioFile: 'fixture.mp3',
    durationSeconds: 30,
    segments: source.segments.map((segment, index) => ({
      id: segment.id,
      startSeconds: index * 10,
      endSeconds: (index + 1) * 10,
    })),
    voice: 'Fixture synthetic voice',
    model: 'fixture-model',
  };
  assert(validateMediaAsset(asset, source));
  for (const bad of [
    { ...asset, sourceHash: '0'.repeat(64) },
    { ...asset, audioFile: '../private.mp3' },
    { ...asset, versionId: 'other:1' },
    { ...asset, segments: [...asset.segments].reverse() },
    { ...asset, segments: [{ ...asset.segments[0], endSeconds: 11 }, ...asset.segments.slice(1)] },
  ])
    assert.equal(validateMediaAsset(bad, source), null);
});
test('deployment mappings require reviewed distinct canonical identities and safe evidence URLs', () => {
  assert.equal(validateBridges(bridges).length, 6);
  assert.throws(() => validateBridges([...bridges, bridges[0]]));
  assert.throws(() =>
    validateBridges(
      bridges.map((item) => ({ ...item, sourceUrl: 'https://example.com/?secret=fixture' })),
    ),
  );
});
