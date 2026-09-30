/**
 * Browser smoke test — Noctis CRM
 *
 * Drives the real React 19 app in a browser against Supabase.
 *
 *   npm run test:e2e
 *
 * Requirements (read from .env.local):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   the app's config
 *   E2E_EMAIL, E2E_PASSWORD                     an existing account
 *
 * Uses `playwright-core` (no download at install time). Launches system browser (e.g. `msedge`).
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'test-results');
const SHOTS = path.join(OUT, 'screenshots');

/* ------------------------------------------------------------------ env */

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    const trimmed = raw.trim();
    const unquoted =
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ? trimmed.slice(1, -1)
        : trimmed;
    process.env[key] = unquoted;
  }
}

loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.local'));

const EMAIL = process.env.E2E_EMAIL?.trim();
const PASSWORD = process.env.E2E_PASSWORD?.trim();
const HAS_SUPABASE =
  Boolean(process.env.VITE_SUPABASE_URL?.trim()) &&
  Boolean(process.env.VITE_SUPABASE_ANON_KEY?.trim());

const RESULTS = [];
function check(label, pass, detail = '') {
  RESULTS.push({ label, pass: Boolean(pass), detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? '  -- ' + detail : ''}`);
}

function skip(reason) {
  console.log('');
  console.log('='.repeat(78));
  console.log('E2E SMOKE TEST SKIPPED — 0 checks were run. This is NOT a passing run.');
  console.log('');
  console.log(reason);
  console.log('');
  console.log('Add these to .env.local:');
  console.log('  VITE_SUPABASE_URL=...      from Project Settings -> API');
  console.log('  VITE_SUPABASE_ANON_KEY=... from Project Settings -> API');
  console.log('  E2E_EMAIL=...              an existing account');
  console.log('  E2E_PASSWORD=...           its password');
  console.log('='.repeat(78));
  process.exit(0);
}

if (!HAS_SUPABASE) skip('Supabase is not configured, so the app would render its setup notice.');
if (!EMAIL || !PASSWORD) skip('No E2E test account configured in E2E_EMAIL / E2E_PASSWORD.');

/* --------------------------------------------------------------- server */

const EXPLICIT_BASE = process.env.E2E_BASE_URL?.trim();
const PORT = process.env.E2E_PORT?.trim() || '3000';

async function isKitServing(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    if (!res.ok) return false;
    const html = await res.text();
    return html.includes('id="root"');
  } catch {
    return false;
  }
}

let server = null;

async function baseUrl() {
  if (EXPLICIT_BASE) {
    if (!(await isKitServing(EXPLICIT_BASE))) {
      throw new Error(`E2E_BASE_URL=${EXPLICIT_BASE} is not serving this kit.`);
    }
    return EXPLICIT_BASE;
  }

  const candidate = `http://localhost:${PORT}`;
  if (await isKitServing(candidate)) return candidate;

  console.log(`Starting the dev server on ${candidate} …`);
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  server = spawn(npx, ['vite', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  server.unref?.();

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await isKitServing(candidate)) return candidate;
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(
    `The dev server did not come up on ${candidate}. Run \`npm run dev\` yourself or set E2E_BASE_URL.`,
  );
}

function stopServer() {
  if (!server || server.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
    } else {
      process.kill(-server.pid, 'SIGTERM');
    }
  } catch {
    /* already stopped */
  }
}

/* ------------------------------------------------------------------ run */

const ROUTES = [
  ['/', 'dashboard'],
  ['/prospects', 'prospects list'],
  ['/contacts', 'contacts list'],
  ['/pipeline', 'pipeline deals'],
  ['/tasks', 'tasks list'],
  ['/members', 'members'],
  ['/roles', 'roles'],
  ['/audit', 'audit log'],
  ['/settings', 'settings'],
];

(async () => {
  mkdirSync(SHOTS, { recursive: true });
  const base = await baseUrl();
  const channel = process.env.E2E_CHANNEL?.trim() || 'msedge';

  const browser = await chromium.launch({
    channel,
    headless: process.env.E2E_HEADLESS !== 'false',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedApi = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.status() >= 400 && /\/(rest|auth|functions)\/v1\//.test(r.url())) {
      failedApi.push(`${r.status()} ${r.request().method()} ${r.url().replace(base, '')}`);
    }
  });

  const step = async (name, fn) => {
    try {
      await fn();
    } catch (error) {
      check(`${name} (threw)`, false, String(error).split('\n')[0]);
    }
  };

  console.log('=== 1. app boots and detects config ===');
  await step('GET /', async () => {
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 45_000 });
    const body = await page.locator('body').innerText();
    check('page rendered text', body.length > 0, `len=${body.length}`);
    check(
      'NOT the unconfigured notice',
      !/Supabase is not configured yet/i.test(body),
      /Supabase is not configured yet/i.test(body) ? 'notice still shown' : 'notice absent',
    );
    await page.screenshot({ path: path.join(SHOTS, '01-landing.png'), fullPage: true });
  });

  console.log('=== 2. sign-in form ===');
  await step('GET /login', async () => {
    await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 45_000 });
    check('email input found', await page.locator('#email').isVisible().catch(() => false));
    check('password input found', await page.locator('#password').isVisible().catch(() => false));
    check(
      'sign-in button found',
      await page.getByRole('button', { name: /sign in/i }).first().isVisible().catch(() => false),
    );
    await page.screenshot({ path: path.join(SHOTS, '02-login.png'), fullPage: true });
  });

  console.log('=== 3. password reveal (Adaptive Field contract) ===');
  await step('reveal toggle', async () => {
    const pw = page.locator('#password');
    await pw.fill(PASSWORD);
    check('field starts masked', (await pw.getAttribute('type')) === 'password');
    const toggles = page.locator(
      'button[aria-label*="show" i], button[aria-label*="password" i], button[aria-label*="affich" i]',
    );
    const count = await toggles.count();
    check('a password toggle exists', count > 0, `count=${count}`);
    if (count > 0) {
      await toggles.first().click();
      check('toggle flips password to text', (await pw.getAttribute('type')) === 'text');
      await page.screenshot({ path: path.join(SHOTS, '03-password-reveal.png'), fullPage: true });
    }
  });

  console.log('=== 4. sign in against GoTrue ===');
  await step('submit sign-in', async () => {
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page
      .waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 45_000 })
      .catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
    const pathname = new URL(page.url()).pathname;
    check('left the login page', !/\/login/.test(pathname), `url=${pathname}`);
    await page.screenshot({ path: path.join(SHOTS, '04-after-login.png'), fullPage: true });
  });

  console.log('=== 5. protected routes render real content ===');
  for (const [route, name] of ROUTES) {
    await step(`route ${route}`, async () => {
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45_000 });
      const body = await page.locator('body').innerText();
      const pathname = new URL(page.url()).pathname;
      check(`${name}: not bounced to login`, !/\/login/.test(pathname), `url=${pathname}`);
      check(`${name}: has content`, body.trim().length > 40, `len=${body.length}`);
      check(
        `${name}: no ErrorBoundary fallback`,
        !/Something went wrong/i.test(body),
        /Something went wrong/i.test(body) ? 'a render error was caught' : 'none',
      );
      check(
        `${name}: no unconfigured notice`,
        !/Supabase is not configured yet/i.test(body),
        'ok',
      );
      await page.screenshot({
        path: path.join(SHOTS, `10-${name.replace(/\s+/g, '-')}.png`),
        fullPage: true,
      });
    });
  }

  console.log('=== 6. mobile viewport, signed in ===');
  await step('mobile', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 45_000 });
    const body = await page.locator('body').innerText();
    check('renders signed-in app', body.length > 40, `len=${body.length}`);
    check(
      'not bounced to login',
      !/\/login/.test(new URL(page.url()).pathname),
      `url=${new URL(page.url()).pathname}`,
    );
    check(
      'not stuck on onboarding',
      !/Create your workspace/i.test(body),
      /Create your workspace/i.test(body) ? 'onboarding shown' : 'none',
    );
    await page.screenshot({ path: path.join(SHOTS, '20-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  console.log('=== 7. sign out ===');
  await step('sign out', async () => {
    await page.goto(base + '/prospects', { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
    const trigger = page.locator('header button[aria-haspopup="menu"]');
    const triggers = await trigger.count();
    check('exactly one account menu trigger in the header', triggers === 1, `count=${triggers}`);
    check('account menu trigger found', await trigger.first().isVisible().catch(() => false));
    await trigger.first().click().catch(() => {});
    await page.waitForTimeout(700);

    const item = page.getByRole('menuitem', { name: /sign out/i });
    check('sign-out menu item visible', (await item.count()) > 0, `count=${await item.count()}`);
    await page.screenshot({ path: path.join(SHOTS, '29-account-menu.png') });

    if (await item.count()) {
      await item.first().click().catch(() => {});
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});
      const pathname = new URL(page.url()).pathname;
      check('signed out lands on /login', /\/login/.test(pathname), `url=${pathname}`);
      await page.screenshot({ path: path.join(SHOTS, '30-after-logout.png'), fullPage: true });
    }
  });

  console.log('=== 8. error scans ===');
  const realErrors = consoleErrors.filter(
    (e) => !/favicon|Download the React DevTools|vite dev/i.test(e),
  );
  check('no uncaught page errors', pageErrors.length === 0, `${pageErrors.length}`);
  check('no console errors', realErrors.length === 0, `${realErrors.length}`);
  check('no failed API calls', failedApi.length === 0, `${failedApi.length}`);

  await browser.close();

  const passed = RESULTS.filter((r) => r.pass).length;
  const failed = RESULTS.filter((r) => !r.pass);

  console.log('');
  console.log('='.repeat(78));
  console.log(`RESULT: ${passed}/${RESULTS.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:');
    for (const f of failed) console.log(`  - ${f.label} :: ${f.detail}`);
  }
  console.log(`screenshots: ${SHOTS}`);
  console.log('='.repeat(78));

  writeFileSync(
    path.join(OUT, 'e2e-report.json'),
    JSON.stringify(
      { passed, total: RESULTS.length, results: RESULTS, consoleErrors: realErrors, pageErrors, failedApi },
      null,
      2,
    ),
    'utf8',
  );

  stopServer();
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  stopServer();
  console.error(`\nE2E smoke test could not run: ${error.message}`);
  process.exit(1);
});
