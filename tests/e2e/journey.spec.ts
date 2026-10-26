import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
const origin = 'http://127.0.0.1:3103';
async function startPath(page: Page, interest = 'Food culture') {
  await page.goto('/start');
  await page.getByLabel('What should we call you?').fill('Alex');
  await page.getByLabel('I’m 18 or older.').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find a comfortable beginning.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: interest, exact: true }).click();
  await page.getByRole('button', { name: 'Find my first story' }).click();
  await expect(page).toHaveURL(/\/taste$/);
  await page.getByRole('link', { name: 'Browse the collection' }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole('heading', { name: 'A little curiosity, Alex.' })).toBeVisible();
}
async function openMarket(page: Page) {
  await page.goto('/piece/una-mesa-en-el-mercado');
  await page.getByRole('button', { name: 'Begin this story' }).click();
  await expect(page).toHaveURL(/\/session\//);
  await expect(page.locator('.spanish-text')).toContainText('Clara entra');
}
async function toPractice(page: Page) {
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await expect(page.locator('.spanish-text')).toContainText('Un señor llega');
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await page.getByRole('button', { name: 'I’ve read the story. Let’s practice' }).click();
  await expect(
    page.getByRole('heading', { name: 'What is the woman preparing at the stall?' }),
  ).toBeVisible();
}
async function answerQuestions(page: Page, wrong = false) {
  for (const [answer, next] of [
    [wrong ? 'Tomato salad' : 'Squash soup', 'Next question'],
    [wrong ? 'The soup is free' : 'There are fewer people', 'Next question'],
    [wrong ? 'Buying more tomatoes' : 'Hearing the end of Luis’s story', 'Try a little Spanish'],
  ]) {
    await page.getByRole('button', { name: new RegExp(answer) }).click();
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(
      page.getByText(wrong ? 'A useful detail to notice.' : 'You found the detail.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: next, exact: true }).click();
  }
  await page.getByLabel('Your missing word').fill('cuenta');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByText('That expression fits.')).toBeVisible();
  await page.getByRole('button', { name: 'Reflect on the story' }).click();
}
test('desktop: onboarding, source-bound practice, durable recall, adaptation evidence and deletion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('.artifacts', { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Follow your curiosity/ })).toBeVisible();
  await page.screenshot({ path: '.artifacts/home-desktop.png', fullPage: true });
  await startPath(page);
  await page.screenshot({ path: '.artifacts/discover-desktop.png', fullPage: true });
  await openMarket(page);
  const sessionUrl = page.url();
  await page.getByRole('button', { name: 'Save for review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'In your notebook' })).toBeDisabled();
  await page.screenshot({ path: '.artifacts/session-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await expect(page.locator('.spanish-text')).toContainText('Un señor llega');
  await page.reload();
  await expect(page.locator('.spanish-text')).toContainText('Un señor llega');
  await page.getByRole('button', { name: 'Next passage', exact: true }).click();
  await page.getByRole('button', { name: 'I’ve read the story. Let’s practice' }).click();
  await answerQuestions(page);
  await page.getByRole('button', { name: 'Something different Explore another direction' }).click();
  await page.getByRole('button', { name: 'Comfortably I followed most of the story' }).click();
  await page
    .getByLabel('One thought in Spanish')
    .fill('Me gusta la conversación, pero prefiero el cine.');
  await page.getByRole('button', { name: 'Complete my session' }).click();
  await expect(page.getByRole('heading', { name: 'Something to take with you.' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Same challenge, a different cultural direction.' }),
  ).toBeVisible();
  await page.screenshot({ path: '.artifacts/completed-desktop.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Something to take with you.' })).toBeVisible();
  await page.getByRole('link', { name: 'Visit my word notebook', exact: true }).click();
  await page.getByLabel('Your Spanish answer').fill('puesto');
  await page.getByRole('button', { name: 'Check recall' }).click();
  await expect(page.getByText('A familiar word, found again.')).toBeVisible();
  await page.screenshot({ path: '.artifacts/review-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Finish this visit' }).click();
  await expect(page.getByRole('heading', { name: 'You’re up to date.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'You’re up to date.' })).toBeVisible();
  await page.goto('/discover');
  await expect(page.locator('.adaptation-banner')).toContainText(
    'Same challenge, a different cultural direction.',
  );
  await expect(page.locator('.discovery-feature')).not.toContainText('Una mesa en el mercado');
  await page.goto('/evidence');
  await expect(
    page.getByText('Qloo affinity is query-relative cultural evidence', { exact: false }),
  ).toBeVisible();
  await page.getByText('Same challenge, a different cultural direction.', { exact: true }).click();
  await expect(page.locator('.trace-event[open]')).toContainText('self Report Used As Score');
  await page.screenshot({ path: '.artifacts/evidence-desktop.png', fullPage: true });
  const exported = await page.request.get('/api/profile/export');
  expect(exported.status()).toBe(200);
  const data = await exported.json();
  expect(data.path.sessions).toHaveLength(1);
  expect(data.path.reviews).toBe(1);
  expect(JSON.stringify(data)).not.toContain('token_hash');
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete my path', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my path' }).click();
  await page.getByRole('button', { name: 'Delete my path', exact: true }).click();
  await page.getByRole('button', { name: 'Delete my learning path' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(sessionUrl);
  await expect(page).toHaveURL(/\/start$/);
  expect(errors).toEqual([]);
});
test('mobile: no overflow, text fallback, network retry and liked-hard adaptation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startPath(page);
  await openMarket(page);
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => [] });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Listen to this passage' }).click();
  await expect(
    page.getByText(
      'No Spanish voice is available in this browser. You can keep reading the full text below.',
    ),
  ).toBeVisible();
  await page.route('**/api/commands', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Save for review', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/api/commands');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('button', { name: 'In your notebook' })).toBeDisabled();
  await page.screenshot({ path: '.artifacts/session-mobile.png', fullPage: true });
  await toPractice(page);
  await answerQuestions(page, true);
  await page.getByRole('button', { name: 'More like this Keep this cultural thread' }).click();
  await page.getByRole('button', { name: 'I needed more support It was a stretch today' }).click();
  await page.getByRole('button', { name: 'Complete my session' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'You liked the topic. We will keep that thread and add more support.',
    }),
  ).toBeVisible();
  await page.goto('/discover');
  await expect(page.locator('.adaptation-banner')).toContainText('add more support');
  await expect(page.locator('.discovery-feature .feature-category')).toContainText('Food culture');
  await expect(page.locator('.discovery-feature .band-tag')).toContainText('A2 working band');
  await expect(page.locator('.discovery-feature')).not.toContainText('Una mesa en el mercado');
  await page.screenshot({ path: '.artifacts/discover-mobile.png', fullPage: true });
  for (const route of ['/', '/discover', '/review', '/path', '/settings', '/evidence']) {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `overflow on ${route}`,
    ).toBe(true);
  }
});
test('API rejects cross-site requests, invalid input and foreign session IDs', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const input = {
    key: randomUUID(),
    adult: true,
    name: 'API learner',
    readingBand: 'A2',
    listeningBand: 'A2',
    minutes: 10,
    interests: ['food'],
    references: [],
    support: 'guided',
    timezone: 'UTC',
  };
  const cross = await a.request.post('/api/guest', {
    headers: { Origin: 'https://untrusted.example' },
    data: input,
  });
  expect(cross.status()).toBe(403);
  const invalid = await a.request.post('/api/guest', {
    headers: { Origin: origin },
    data: { ...input, adult: false },
  });
  expect(invalid.status()).toBe(422);
  for (const context of [a, b]) {
    const created = await context.request.post('/api/guest', {
      headers: { Origin: origin },
      data: { ...input, key: randomUUID() },
    });
    expect(created.status()).toBe(200);
  }
  const started = await a.request.post('/api/commands', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      command: { type: 'start', versionId: 'una-mesa-en-el-mercado:1', support: 'guided' },
    },
  });
  expect(started.status()).toBe(200);
  const { sessionId } = await started.json();
  const foreign = await b.request.post('/api/commands', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      command: { type: 'save-word', sessionId, termId: 'una-mesa-en-el-mercado-w1' },
    },
  });
  expect(foreign.status()).toBe(404);
  await a.close();
  await b.close();
});
