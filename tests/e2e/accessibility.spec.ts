import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
const origin = 'http://127.0.0.1:3103';
test('WCAG automated checks on the public and personalized flow, with keyboard glossary focus return', async ({
  page,
}) => {
  await page.goto('/');
  for (const path of ['/', '/start', '/discover', '/evidence']) {
    await page.goto(path);
    await page.locator('h1').waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations,
      `${path}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page.request.post('/api/guest', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      adult: true,
      name: 'Keyboard reader',
      readingBand: 'A2',
      listeningBand: 'A2',
      minutes: 10,
      interests: ['food'],
      references: [],
      support: 'guided',
      timezone: 'UTC',
    },
  });
  const response = await page.request.post('/api/commands', {
    headers: { Origin: origin },
    data: {
      key: randomUUID(),
      command: { type: 'start', versionId: 'una-mesa-en-el-mercado:1', support: 'guided' },
    },
  });
  const { sessionId } = await response.json();
  await page.goto(`/session/${sessionId}`);
  let result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const word = page.getByRole('button', { name: 'Meaning of puesto' });
  await word.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'puesto' })).toBeVisible();
  result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: '.artifacts/glossary-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(word).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );
  for (const path of ['/review', '/path', '/settings']) {
    await page.goto(path);
    result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations,
      `${path}: ${JSON.stringify(result.violations.map((v) => v.id))}`,
    ).toEqual([]);
  }
});
