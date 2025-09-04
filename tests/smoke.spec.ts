import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'test-results', 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function setTheme(page, theme) {
  // theme: 'auto' | 'light' | 'dark' | 'high-contrast'
  await page.evaluate((t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    // also update localStorage so site-toggle UI persists
    try { localStorage.setItem('site-theme', t); } catch (e) { }
  }, theme);
}

async function setFont(page, size) {
  await page.evaluate((s) => document.documentElement.setAttribute('data-font-size', s), size);
}

async function snapshot(page, name) {
  // wait for header (try several common selectors) and a card to appear and be visible
  const headerSelectors = ['.site-header', 'header[role="banner"]', 'nav#mainNav'];
  let headerLocator = null;
  const perSelectorTimeout = 12_000;
  for (const sel of headerSelectors) {
    const loc = page.locator(sel);
    try {
      await loc.waitFor({ state: 'visible', timeout: perSelectorTimeout });
      headerLocator = loc;
      break;
    } catch (e) {
      // try next selector
    }
  }
  const card = page.locator('.card').first();
  try {
    await card.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (e) {
    // continue, we'll capture debug artifacts below
  }
  if (!headerLocator) {
    // save debug artifacts: full page HTML and full-page screenshot
    const debugHtmlPath = path.join(outDir, `${name}-page.html`);
    const debugShotPath = path.join(outDir, `${name}-full.png`);
    const html = await page.content();
    fs.writeFileSync(debugHtmlPath, html, { encoding: 'utf8' });
    await page.screenshot({ path: debugShotPath, fullPage: true });
    throw new Error(`Header not found using selectors ${headerSelectors.join(', ')}; saved HTML and full screenshot to ${outDir}`);
  }
  // small delay to allow CSS transitions
  await page.waitForTimeout(300);
  // locator.screenshot has its own timeout; give it more time and fallback
  try {
    await headerLocator.screenshot({ path: path.join(outDir, `${name}-header.png`), timeout: 30_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(outDir, `${name}-header.png`) });
  }
  try {
    await card.screenshot({ path: path.join(outDir, `${name}-card.png`), timeout: 30_000 });
  } catch (e) {
    await page.screenshot({ path: path.join(outDir, `${name}-card.png`) });
  }
}

test.describe('Theme smoke', () => {
  test.beforeEach(async ({ page }) => {
  // Astro site is built with base '/private/' — navigate there to avoid 404
  await page.goto('/private/');
    await page.waitForLoadState('networkidle');
  });

  test('auto (OS) theme', async ({ page }) => {
    await setTheme(page, 'auto');
    await snapshot(page, 'auto');
  });

  test('explicit light theme', async ({ page }) => {
    await setTheme(page, 'light');
    await snapshot(page, 'light');
  });

  test('explicit dark theme', async ({ page }) => {
    await setTheme(page, 'dark');
    await snapshot(page, 'dark');
  });

  test('compare auto (OS dark) vs explicit dark sizes', async ({ page }) => {
    // measure sizes in auto (OS preference) and explicit dark and compare
    await setTheme(page, 'auto');
    await page.waitForLoadState('networkidle');
    const headerSel = '.site-header';
    const cardSel = '.card';
    const headerAuto = await page.locator(headerSel).boundingBox();
    const cardAuto = await page.locator(cardSel).first().boundingBox();

    await setTheme(page, 'dark');
    await page.waitForLoadState('networkidle');
    const headerDark = await page.locator(headerSel).boundingBox();
    const cardDark = await page.locator(cardSel).first().boundingBox();

    // if any bounding box is null (not found) fail early
    if (!headerAuto || !headerDark || !cardAuto || !cardDark) {
      throw new Error('Could not measure header/card dimensions for comparison');
    }

    const pxTolerance = 4; // allow small rendering differences
    const approxEqual = (a: number, b: number) => Math.abs(a - b) <= pxTolerance;

    // compare heights and widths
    expect(approxEqual(headerAuto.height, headerDark.height), 'header height').toBeTruthy();
    expect(approxEqual(headerAuto.width, headerDark.width), 'header width').toBeTruthy();
    expect(approxEqual(cardAuto.height, cardDark.height), 'card height').toBeTruthy();
    expect(approxEqual(cardAuto.width, cardDark.width), 'card width').toBeTruthy();
  });

  test('log card positions for visual debugging', async ({ page }) => {
    await page.goto('/private/');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('.card');
    const count = await cards.count();
    const positions = [];
    for (let i = 0; i < Math.min(4, count); i++) {
      const box = await cards.nth(i).boundingBox();
      positions.push({ index: i, box });
    }
    console.log('card positions:', JSON.stringify(positions, null, 2));
  });

  test('dump card computed styles for themes', async ({ page }) => {
    const themes = ['auto', 'light', 'dark'];
    for (const t of themes) {
      if (t === 'auto') await setTheme(page, 'auto');
      else await setTheme(page, t);
      await page.goto('/private/');
      await page.waitForLoadState('networkidle');
      const style = await page.evaluate(() => {
        const el = document.querySelector('.card');
        if (!el) return null;
        const s = window.getComputedStyle(el as Element);
        return {
          boxShadow: s.boxShadow,
          marginTop: s.marginTop,
          marginBottom: s.marginBottom,
          paddingTop: s.paddingTop,
          paddingBottom: s.paddingBottom,
          borderTop: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor,
          backgroundImage: s.backgroundImage,
        };
      });
      console.log(`computed styles for theme=${t}:`, JSON.stringify(style, null, 2));
    }
  });

  test('dump ancestor backgrounds for first card', async ({ page }) => {
    await page.goto('/private/');
    await page.waitForLoadState('networkidle');
    const info = await page.evaluate(() => {
      const el = document.querySelector('.card');
      if (!el) return null;
      const ancestors = [];
      let node = el as Element | null;
      for (let i = 0; i < 6 && node; i++) {
        const s = window.getComputedStyle(node);
        ancestors.push({
          tag: node.tagName.toLowerCase(),
          cls: node.className,
          background: s.backgroundColor,
          backgroundImage: s.backgroundImage,
          border: s.border,
          padding: s.padding,
        });
        node = node.parentElement;
      }
      return ancestors;
    });
    console.log('card ancestors:', JSON.stringify(info, null, 2));
  });
});
