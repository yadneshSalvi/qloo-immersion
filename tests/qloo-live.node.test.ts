import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPublicCulturalQuery,
  officialQlooArguments,
  officialQlooTransport,
  parseRankedResults,
  parseSearchResults,
  validateQlooRequest,
  type QlooRequest,
} from '../src/integrations/qloo-live';
import { boundedQlooFetch } from '../scripts/qloo-fetch-guard.mjs';
import { fakeId } from './helpers/live-fixtures';
const request: Extract<QlooRequest, { operation: 'insights' }> = {
  operation: 'insights',
  entityType: 'movie',
  signals: [fakeId(1)],
  candidates: [fakeId(10), fakeId(11)],
  take: 2,
};
const row = (id: string, type = 'movie') => ({
  entity_id: id,
  name: 'Fixture film',
  types: [`urn:entity:${type}`],
  query: { affinity: 0.4 },
});
test('official CLI receives a constructed single-request exact shortlist, with no arbitrary model arguments', () => {
  const args = officialQlooArguments(request);
  assert.deepEqual(args.slice(0, 4), ['api', 'insights', '--type', 'movie']);
  assert.deepEqual(JSON.parse(args[args.indexOf('--params') + 1]), {
    'filter.results.entities': request.candidates,
  });
  assert.equal(args[args.indexOf('--take') + 1], '2');
  assert.throws(() => validateQlooRequest({ ...request, take: 1 }));
  assert.throws(() => validateQlooRequest({ ...request, candidates: [fakeId(10), fakeId(10)] }));
  assert.throws(() =>
    validateQlooRequest({ ...request, signals: [fakeId(1), fakeId(2), fakeId(3), fakeId(4)] }),
  );
});
test('Qloo projection validates canonical names/types, exact candidate membership, duplicates and finite scores', () => {
  assert.deepEqual(parseRankedResults([row(fakeId(11)), row(fakeId(10))], request), [
    fakeId(11),
    fakeId(10),
  ]);
  assert.deepEqual(parseRankedResults([], request), []);
  for (const raw of [
    [row(fakeId(99))],
    [row(fakeId(10)), row(fakeId(10))],
    [row(fakeId(10), 'book')],
    [{ ...row(fakeId(10)), query: { affinity: Infinity } }],
  ])
    assert.throws(() => parseRankedResults(raw, request));
  assert.throws(() =>
    parseSearchResults([{ entity_id: fakeId(1), types: ['urn:entity:artist'] }], 'artist'),
  );
  const projected = parseSearchResults(
    [
      {
        ...row(fakeId(1), 'artist'),
        summary: 'DO_NOT_COPY_RAW_PROSE',
        privateNote: 'DO_NOT_COPY_RAW_PROSE',
      },
    ],
    'artist',
  );
  assert(!JSON.stringify(projected).includes('DO_NOT_COPY_RAW_PROSE'));
});
test('search rejects links and credential-like text before invoking any provider', () => {
  for (const query of [
    'https://example.com/private',
    'api_key=secretvalue',
    'a\nb',
    'person@example.com',
  ])
    assert.throws(() => assertPublicCulturalQuery(query));
  assert.doesNotThrow(() => assertPublicCulturalQuery('Rosalía'));
});
test('missing keys and cancelled requests never launch the official harness', async () => {
  await assert.rejects(officialQlooTransport({ NODE_ENV: 'test' })(request), /not configured/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    officialQlooTransport({ NODE_ENV: 'test', QLOO_API_KEY: 'fixture-never-sent' })(
      request,
      controller.signal,
    ),
  );
});
test('preloaded Qloo guard allows one exact GET, denies redirects, method/path changes, and hidden fan-out', async () => {
  let count = 0;
  const guarded = boundedQlooFetch(async (_url: unknown, options: RequestInit) => {
    count++;
    assert.equal(options.redirect, 'error');
    return Response.json([]);
  }, 'insights');
  for (const [url, method] of [
    ['https://untrusted.invalid/v2/insights', 'GET'],
    ['https://hackathon.api.qloo.com/search', 'GET'],
    ['https://hackathon.api.qloo.com/v2/insights', 'POST'],
  ])
    await assert.rejects(guarded(url, { method }));
  assert.equal(count, 0);
  await guarded('https://hackathon.api.qloo.com/v2/insights', { method: 'GET' });
  await assert.rejects(guarded('https://hackathon.api.qloo.com/v2/insights', { method: 'GET' }));
  assert.equal(count, 1);
});
test('Qloo guard rejects an oversized provider response without retaining raw diagnostics', async () => {
  const guarded = boundedQlooFetch(async () => new Response('x'.repeat(512001)), 'search');
  await assert.rejects(guarded('https://hackathon.api.qloo.com/search'), /byte limit/);
});
