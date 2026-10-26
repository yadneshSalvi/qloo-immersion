import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { corpus, publicPiece } from '../../src/content/corpus';
import type { LiveOverview, RunView, RunResult, DiscoveryResult } from '../../src/domain/live';
const origin = 'http://127.0.0.1:3103';
const stamp = '2026-10-27T10:00:00.000Z';
const favorite = {
  entityId: 'fixture-film',
  entityType: 'movie' as const,
  name: 'Fixture favorite',
  disambiguation: 'Test fixture only',
  confirmedAt: stamp,
  evidenceAt: stamp,
};
function run(
  kind: RunView['kind'],
  result: RunResult | null,
  state: RunView['state'] = 'succeeded',
): RunView {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    kind,
    state,
    result,
    stage: state === 'queued' ? 'Waiting for worker' : 'Complete',
    attempts: 1,
    createdAt: stamp,
    updatedAt: stamp,
    error: null,
    trace: [{ stage: 'fixture', summary: 'Provider-free browser test fixture', at: stamp }],
  };
}
async function guest(page: Page) {
  const response = await page.request.post('/api/guest', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      adult: true,
      name: 'Live flow test',
      readingBand: 'A2',
      listeningBand: 'A2',
      minutes: 10,
      interests: ['food'],
      references: [],
      support: 'guided',
      timezone: 'UTC',
    },
  });
  expect(response.ok()).toBeTruthy();
}
function overview(patch: Partial<LiveOverview> = {}): LiveOverview {
  return {
    interests: [],
    profileVersion: 1,
    latestDiscovery: null,
    latestResolution: null,
    qlooAvailable: true,
    coachingAvailable: true,
    ...patch,
  };
}

test('provider-free fixtures: explicitly resolve and confirm, then retain editorial browsing on cancellation', async ({
  page,
}) => {
  await guest(page);
  let current = overview();
  let confirmationCount = 0;
  await page.route('**/api/interests', (route) => route.fulfill({ json: current }));
  await page.route('**/api/interests/resolve', (route) =>
    route.fulfill({
      json: run('resolution', {
        kind: 'resolution',
        query: 'Fixture favorite',
        entityType: 'movie',
        candidates: [favorite],
        mode: 'cached',
        evidenceAt: stamp,
      }),
    }),
  );
  await page.route('**/api/interests/confirm', async (route) => {
    confirmationCount++;
    current = overview({ interests: [favorite], profileVersion: 2 });
    await route.fulfill({ json: current });
  });
  await page.goto('/taste');
  await expect(page.getByRole('heading', { name: 'Name something you love.' })).toBeVisible();
  await page.getByLabel('Name your favorite').fill('Fixture favorite');
  await expect(page.getByRole('button', { name: 'Find my cultural connections' })).toBeDisabled();
  expect(confirmationCount).toBe(0);
  await page.getByRole('button', { name: 'Find a match' }).click();
  await expect(page.getByText('Cached Qloo match')).toBeVisible();
  expect(confirmationCount).toBe(0);
  await page.getByRole('button', { name: 'Confirm match' }).click();
  await expect(
    page.getByRole('button', { name: 'Remove confirmed interest Fixture favorite' }),
  ).toBeVisible();
  expect(confirmationCount).toBe(1);
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  const queued = run('discovery', null, 'queued');
  await page.route('**/api/discovery/runs', async (route) => {
    expect(route.request().postDataJSON().expectedVersion).toBe(2);
    current = { ...current, latestDiscovery: queued };
    await route.fulfill({ json: queued });
  });
  await page.route('**/api/runs/*/cancel', (route) =>
    route.fulfill({ json: { ...queued, state: 'cancelled' } }),
  );
  await page.route('**/api/runs/*', (route) => route.fulfill({ json: queued }));
  await page.getByRole('button', { name: 'Find my cultural connections' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Request cancelled.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A world of small stories.' })).toBeVisible();
});

test('provider-free fixtures: reloading an interrupted search resumes its saved request without another creation', async ({
  page,
}) => {
  await guest(page);
  let current = overview();
  let requests = 0;
  let saved = run('resolution', null, 'queued');
  await page.route('**/api/interests', (route) => route.fulfill({ json: current }));
  await page.route('**/api/interests/resolve', async (route) => {
    requests++;
    current = { ...current, latestResolution: saved };
    await route.fulfill({ json: saved });
  });
  await page.route('**/api/runs/*', (route) => route.fulfill({ json: saved }));
  await page.goto('/taste');
  await page.getByLabel('Name your favorite').fill('Fixture favorite');
  await page.getByRole('button', { name: 'Find a match' }).click();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  saved = run('resolution', {
    kind: 'resolution',
    query: 'Fixture favorite',
    entityType: 'movie',
    candidates: [favorite],
    mode: 'live',
    evidenceAt: stamp,
  });
  await expect(page.getByRole('button', { name: 'Confirm match' })).toBeVisible();
  expect(requests).toBe(1);
});

test('provider-free fixtures: cached ranking has an explicit film-theme-story bridge and a same-shortlist comparison', async ({
  page,
}) => {
  await guest(page);
  const piece = publicPiece(corpus[0].source);
  const result: DiscoveryResult = {
    kind: 'discovery',
    mode: 'cached',
    evidenceAt: stamp,
    profileVersion: 1,
    planning: { mode: 'ai', model: 'fixture-model', policyVersion: 'fixture' },
    recommendations: [
      {
        piece,
        route: 'A familiar thread',
        reason: 'Provider-free fixture: a cultural connection, not an outcome.',
        evidence: {
          anchorName: 'Fixture film connection',
          theme: 'Conversation around a shared table',
          explanation:
            'Editorial interpretation links this film theme with the original market story.',
          sourceUrl: 'https://example.com/fixture',
          providerRank: 1,
          studyFocus: 'Notice how the characters make room for a conversation.',
          warmupQuestion: 'What makes a place welcoming?',
          sourceQuote: corpus[0].source.segments[0].text,
        },
      },
    ],
    comparison: {
      baseline: [{ title: piece.title, pieceId: piece.id, anchorName: 'Fixture film connection' }],
      qloo: [{ title: piece.title, pieceId: piece.id, anchorName: 'Fixture film connection' }],
      candidateCount: 1,
      changedPositions: 0,
      sameFirstChoice: true,
      policy: 'Fixture comparison uses the same eligible shortlist.',
    },
    notes: ['Provider-free browser test data only.'],
  };
  await page.route('**/api/interests', (route) =>
    route.fulfill({
      json: overview({ interests: [favorite], latestDiscovery: run('discovery', result) }),
    }),
  );
  await page.goto('/discover');
  await expect(page.getByText('Cached Qloo-informed discovery')).toBeVisible();
  await expect(page.getByText('Qloo film connection', { exact: true })).toBeVisible();
  await expect(page.getByText('IMMERSION editorial theme', { exact: true })).toBeVisible();
  await expect(page.getByText('AI-assisted study invitation')).toBeVisible();
  await page.getByText('See how the order changed', { exact: false }).click();
  await expect(
    page.getByRole('heading', { name: 'Two orders. The same eligible shortlist.' }),
  ).toBeVisible();
  await expect(page.getByText(/not evidence of learning gain or causal lift/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('provider-free fixtures: opinion feedback needs consent, preserves drafts, and remains separate from source scores', async ({
  page,
}) => {
  await guest(page);
  const command = async (value: Record<string, unknown>) => {
    const response = await page.request.post('/api/commands', {
      headers: { Origin: origin },
      data: { key: randomUUID(), command: value },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const started = await command({
    type: 'start',
    versionId: corpus[0].source.versionId,
    support: 'guided',
  });
  const sessionId = started.sessionId;
  const positioned = await command({
    type: 'position',
    sessionId,
    expectedVersion: 1,
    position: 2,
  });
  const begun = await command({
    type: 'begin-practice',
    sessionId,
    expectedVersion: positioned.session.version,
  });
  let version = begun.session.version;
  for (const assessment of corpus[0].assessments.filter((item) => item.kind === 'comprehension')) {
    const answered = await command({
      type: 'answer',
      sessionId,
      expectedVersion: version,
      assessmentId: assessment.id,
      answer: assessment.answer[0],
    });
    version = answered.session.version;
  }
  const practice = corpus[0].assessments.find((a) => a.kind === 'practice')!;
  await command({
    type: 'answer',
    sessionId,
    expectedVersion: version,
    assessmentId: practice.id,
    answer: practice.answer[0],
  });
  let posts = 0;
  let latest: RunView | null = null;
  await page.route('**/api/practice/feedback?*', (route) =>
    route.fulfill({
      json: { runs: latest ? [latest] : [], remaining: 3 - posts, available: true },
    }),
  );
  await page.route('**/api/practice/feedback', async (route) => {
    posts++;
    expect(route.request().postDataJSON().consent).toBe(true);
    latest = {
      ...run('coaching', {
        kind: 'coaching',
        status: 'feedback',
        success: 'You connect your opinion to a detail from the story.',
        corrections: [
          {
            before: 'me gusta la conversaciones',
            after: 'me gustan las conversaciones',
            explanation: 'Use plural forms with conversaciones.',
          },
        ],
        modelAnswer: 'Me gusta el mercado porque las personas comparten historias.',
        nextPrompt: 'Revise your sentence and keep the reason.',
        sourceEvidence: [
          { segmentId: corpus[0].source.segments[0].id, quote: corpus[0].source.segments[0].text },
        ],
        mode: 'live',
        evidenceAt: stamp,
        model: 'fixture-model',
        policyVersion: 'fixture',
      }),
      submittedAnswer: route.request().postDataJSON().answer,
    };
    await route.fulfill({ json: latest });
  });
  await page.goto(`/session/${sessionId}`);
  const coach = page.getByRole('region', { name: 'Make a little Spanish yours.' });
  await expect(coach).toBeVisible();
  const draft = 'Me gusta la conversaciones porque las personas comparten historias.';
  await coach.getByLabel('Your opinion in Spanish').fill(draft);
  await expect(
    coach.getByRole('button', { name: 'Get writing feedback', exact: true }),
  ).toBeDisabled();
  expect(posts).toBe(0);
  await coach.getByRole('checkbox').check();
  await coach.getByRole('button', { name: 'Get writing feedback', exact: true }).click();
  await expect(coach.getByText('Something that works')).toBeVisible();
  await expect(coach.getByLabel('Your opinion in Spanish')).toHaveValue(draft);
  await expect(coach.getByText('2 of 3 requests remaining for this session')).toBeVisible();
  await expect(coach.getByText(/do not change your fixed source-question results/)).toBeVisible();
  await coach.getByText('See a generated example answer').click();
  await expect(coach.getByText(/AI-generated example/)).toBeVisible();
  await coach.getByRole('button', { name: 'Get feedback on my revision' }).click();
  await expect(coach.getByText('1 of 3 requests remaining for this session')).toBeVisible();
  await coach.getByRole('button', { name: 'Get feedback on my revision' }).click();
  await expect(coach.getByText('0 of 3 requests remaining for this session')).toBeVisible();
  await expect(coach.getByRole('button', { name: 'Get feedback on my revision' })).toBeDisabled();
  expect(posts).toBe(3);
  await page.reload();
  await expect(coach.getByText('Something that works')).toBeVisible();
  await expect(coach.getByLabel('Your opinion in Spanish')).toHaveValue(draft);
  await expect(coach.getByText('0 of 3 requests remaining for this session')).toBeVisible();
  await coach.getByText('Your submitted draft', { exact: true }).click();
  await expect(coach.locator('details p').filter({ hasText: draft })).toBeVisible();
  expect(posts).toBe(3);
});

test('provider-free fixtures: unmatched favorites and provider failures recover without a silent match', async ({
  page,
}) => {
  await guest(page);
  await page.route('**/api/interests', (route) => route.fulfill({ json: overview() }));
  let calls = 0;
  await page.route('**/api/interests/resolve', async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        json: run('resolution', {
          kind: 'resolution',
          query: 'Unmatched fixture',
          entityType: 'movie',
          candidates: [],
          mode: 'live',
          evidenceAt: stamp,
        }),
      });
    else
      await route.fulfill({
        status: 503,
        json: {
          error: {
            message: 'Fixture provider unavailable. Browse the collection or try again later.',
          },
        },
      });
  });
  await page.goto('/taste');
  await page.getByLabel('Name your favorite').fill('Unmatched fixture');
  await page.getByRole('button', { name: 'Find a match' }).click();
  await expect(page.getByRole('heading', { name: 'We couldn’t match that yet.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find my cultural connections' })).toBeDisabled();
  await page.getByLabel('Name your favorite').fill('Another fixture');
  await page.getByRole('button', { name: 'Find a match' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Fixture provider unavailable' }),
  ).toBeVisible();
  await expect(page.getByLabel('Name your favorite')).toHaveValue('Another fixture');
  await page.getByRole('link', { name: 'Browse the collection' }).click();
  await expect(page.getByRole('heading', { name: 'A world of small stories.' })).toBeVisible();
});

function silentWav(seconds: number) {
  const sampleRate = 8000;
  const bytes = seconds * sampleRate * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(bytes, 40);
  return wav;
}

test('a requested extra-support next session preserves the choice and opens closable authored help', async ({
  page,
}) => {
  await guest(page);
  const command = async (value: Record<string, unknown>) => {
    const response = await page.request.post('/api/commands', {
      headers: { Origin: origin },
      data: { key: randomUUID(), command: value },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const first = corpus[0];
  const started = await command({
    type: 'start',
    versionId: first.source.versionId,
    support: 'guided',
  });
  let current = (
    await command({
      type: 'position',
      sessionId: started.sessionId,
      expectedVersion: 1,
      position: 2,
    })
  ).session;
  current = (
    await command({
      type: 'begin-practice',
      sessionId: current.id,
      expectedVersion: current.version,
    })
  ).session;
  for (const item of first.assessments)
    current = (
      await command({
        type: 'answer',
        sessionId: current.id,
        expectedVersion: current.version,
        assessmentId: item.id,
        answer: item.answer[0],
      })
    ).session;
  current = (
    await command({
      type: 'complete',
      sessionId: current.id,
      expectedVersion: current.version,
      taste: 'more',
      difficulty: 'hard',
      consent: true,
      note: '',
    })
  ).session;
  expect(current.feedback.comprehension).toBe(1);
  expect(current.feedback.adaptation.support).toBe('extra');

  const next = corpus.find((item) => item.source.id === 'el-ensayo-del-domingo')!;
  const wav = silentWav(6);
  await page.route(/\/api\/media\/[a-f0-9-]+\/manifest$/, (route) =>
    route.fulfill({
      json: {
        available: true,
        audioUrl: new URL(route.request().url()).pathname.replace(/\/manifest$/, ''),
        durationSeconds: 6,
        voice: 'Test fixture',
        model: 'fixture-silence',
        segments: next.source.segments.map((segment, index) => ({
          id: segment.id,
          startSeconds: index * 2,
          endSeconds: (index + 1) * 2,
        })),
      },
    }),
  );
  await page.route(/\/api\/media\/[a-f0-9-]+$/, (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: wav }),
  );
  await page.goto(`/piece/${next.source.id}`);
  const supported = page.getByRole('button', { name: /^Start with support/ });
  await expect(supported).toHaveAttribute('aria-pressed', 'true');
  await expect(supported).toContainText('Extra support');
  await supported.click();
  const opening = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/commands') &&
      response.request().postDataJSON()?.command?.type === 'start',
  );
  await page.getByRole('button', { name: 'Begin this story', exact: true }).click();
  expect((await opening).request().postDataJSON().command.support).toBe('extra');
  await expect(page.getByText('Extra support is on', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide English', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Narration playback speed')).toHaveValue('0.75');
  expect(await page.locator('audio').evaluate((node) => (node as HTMLAudioElement).paused)).toBe(
    true,
  );
  await page.getByLabel('Narration playback speed').selectOption('1.25');
  await page.reload();
  await expect(page.getByLabel('Narration playback speed')).toHaveValue('1.25');
  expect(await page.locator('audio').evaluate((node) => (node as HTMLAudioElement).paused)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await page.getByRole('button', { name: 'I’ve read the story. Let’s practice' }).click();
  const reference = page.locator('.practice-source');
  await expect(reference).toHaveAttribute('open', '');
  await reference.locator('summary').click();
  await expect(reference).not.toHaveAttribute('open', '');
  await reference.locator('summary').click();
  const questions = next.assessments.filter((item) => item.kind === 'comprehension');
  for (const [index, question] of questions.entries()) {
    const hint = page.locator('.hint-detail');
    await expect(hint).toHaveAttribute('open', '');
    await expect(hint).toContainText(question.hint);
    await hint.locator('summary').click();
    await expect(hint).not.toHaveAttribute('open', '');
    const option = question.options.find((item) => item.id === question.answer[0])!;
    await page.locator('.answer-options button').filter({ hasText: option.text }).click();
    await expect(hint).not.toHaveAttribute('open', '');
    await page.getByRole('button', { name: 'Check my answer', exact: true }).click();
    await page
      .getByRole('button', {
        name: index === questions.length - 1 ? 'Try a little Spanish' : 'Next question',
        exact: true,
      })
      .click();
  }
  await expect(page.locator('.hint-detail')).toHaveAttribute('open', '');
  await expect(page.locator('.hint-detail')).toContainText(
    next.assessments.find((item) => item.kind === 'practice')!.hint,
  );
  await page.locator('.hint-detail summary').click();
  await expect(page.locator('.hint-detail')).not.toHaveAttribute('open', '');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('provider-free audio fixture: explicit playback, passage seek, speed, keyboard scrubbing and restored position', async ({
  page,
}) => {
  await guest(page);
  const source = corpus.find((entry) => entry.source.format === 'listen')!.source;
  const started = await page.request.post('/api/commands', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      command: { type: 'start', versionId: source.versionId, support: 'guided' },
    },
  });
  expect(started.ok()).toBeTruthy();
  const { sessionId } = await started.json();
  const audioUrl = `/api/media/${sessionId}`;
  await page.route(`**${audioUrl}/manifest`, (route) =>
    route.fulfill({
      json: {
        available: true,
        audioUrl,
        durationSeconds: 6,
        voice: 'Test fixture',
        model: 'fixture-silence',
        label: 'Synthetic audio fixture for browser testing only.',
        segments: source.segments.map((segment, index) => ({
          id: segment.id,
          startSeconds: index * 2,
          endSeconds: (index + 1) * 2,
        })),
      },
    }),
  );
  const wav = silentWav(6);
  await page.route(`**${audioUrl}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(wav.length) },
      body: route.request().method() === 'HEAD' ? undefined : wav,
    }),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.getByText('Synthetic Spanish narration', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play narration', exact: true })).toBeVisible();
  expect(await page.locator('audio').evaluate((node) => (node as HTMLAudioElement).paused)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Play narration', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause narration', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause narration', exact: true }).click();
  await page.getByLabel('Narration playback speed').selectOption('0.75');
  expect(
    await page.locator('audio').evaluate((node) => (node as HTMLAudioElement).playbackRate),
  ).toBe(0.75);
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Narration position' })).toHaveValue('2');
  await expect(page.locator('.passage-tabs button').nth(1)).toHaveAttribute(
    'data-audio-current',
    'true',
  );
  const slider = page.getByRole('slider', { name: 'Narration position' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('2.1');
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Narration position' })).toHaveValue('2.1');
  await expect(page.getByRole('button', { name: 'Play narration', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
});

test('provider-free audio fixture: unavailable saved narration leaves an explicit browser-voice fallback', async ({
  page,
}) => {
  await guest(page);
  const response = await page.request.post('/api/commands', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      command: { type: 'start', versionId: corpus[0].source.versionId, support: 'guided' },
    },
  });
  const { sessionId } = await response.json();
  await page.route(`**/api/media/${sessionId}/manifest`, (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.getByText('Browser voice fallback · synthetic Spanish')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Listen to this passage', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.spanish-text')).toContainText(corpus[0].source.segments[0].text);
});
