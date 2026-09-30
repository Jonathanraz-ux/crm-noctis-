/**
 * Demo account manager — Noctis CRM
 *
 *   npm run demo:account -- <create|reset|list|revoke|status> [--email ...] [--role ...]
 *
 * Gives a client a real email + password that opens the seeded demo workspace.
 * Talks to the GoTrue admin API and PostgREST only. No npm dependency.
 *
 * Requirements (environment first, then .env / .env.local):
 *   SUPABASE_URL                defaults to VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   Project Settings -> API -> service_role
 *
 * The service key is never read from a `VITE_*` variable: those are bundled
 * into the browser build. Keep it in .env.local (gitignored) or the shell.
 */

import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMO_ORG_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_ORG_SLUG = 'noctis-sales-forge';
const DEMO_OWNER_EMAIL = 'demo.owner@example.com';
const ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];
const PAGE_SIZE = 1000;

const WORDS = {
  adjectives: [
    'velvet', 'copper', 'silent', 'amber', 'cobalt', 'harbor', 'lunar', 'quiet',
    'rapid', 'silver', 'tidal', 'urban', 'crimson', 'frosted', 'golden', 'noble',
  ],
  nouns: [
    'otter', 'lantern', 'comet', 'harbor', 'meadow', 'signal', 'anchor', 'cedar',
    'quartz', 'falcon', 'ember', 'marble', 'ridge', 'willow', 'beacon', 'summit',
  ],
};

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

let SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

/* ----------------------------------------------------------------- args */

function parseArgs(argv) {
  const tokens = [...argv];
  const first = tokens.find((token) => !token.startsWith('--'));
  const command = first ?? 'status';
  const flags = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === first) continue;
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      flags[token.slice(2, eq)] = tokens[i].slice(eq + 1);
    } else {
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        flags[token.slice(2)] = next;
        i += 1;
      } else {
        flags[token.slice(2)] = 'true';
      }
    }
  }
  return { command, flags };
}

const USAGE = `
Usage: npm run demo:account -- <command> [options]

Commands
  status              Show whether the demo workspace and its logins are ready
  create              Create a login for a client and link it to the demo workspace
  reset               Set a new password on an existing login
  list                List every login and its demo-workspace access
  revoke              Delete a login

Options
  --email <address>   Login email (required by create / reset / revoke)
  --name <full name>  Display name stored on the profile (default: derived)
  --role <role>       owner | admin | manager | member | viewer  (default: owner
                      for demo.owner@example.com, viewer otherwise)
  --password <value>  Use your own password instead of a generated one
  --strong            Generate a 24-character random password instead of a
                      readable passphrase
  --url <url>         Target a different Supabase project than SUPABASE_URL
  --yes               Skip the confirmation prompt (required by revoke)

Examples
  npm run demo:account -- status
  npm run demo:account -- create --name "Acme Corp"
  npm run demo:account -- create --email claire@acme.fr --role viewer
  npm run demo:account -- reset --email claire@acme.fr
  npm run demo:account -- revoke --email claire@acme.fr --yes
`;

function die(message, hint) {
  console.error(`\nERROR  ${message}\n`);
  if (hint) console.error(`${hint}\n`);
  process.exit(1);
}

function requireConfig() {
  if (!SUPABASE_URL) {
    die(
      'No Supabase URL.',
      'Set SUPABASE_URL or VITE_SUPABASE_URL, or pass --url https://xyzcompany.supabase.co',
    );
  }
  if (/your-project-ref|placeholder/.test(SUPABASE_URL)) {
    die(`SUPABASE_URL is still the placeholder value: ${SUPABASE_URL}`);
  }
  if (!SERVICE_KEY) {
    die(
      'No SUPABASE_SERVICE_ROLE_KEY.',
      [
        'Add it to .env.local (gitignored, never committed):',
        '',
        '  SUPABASE_SERVICE_ROLE_KEY=<the service_role key>',
        '',
        'Find it in: Supabase Dashboard -> Project Settings -> API Keys.',
        'Do NOT rename it to a VITE_* variable: Vite ships those to the browser.',
      ].join('\n'),
    );
  }
  assertServiceKey(SERVICE_KEY);
}

function assertServiceKey(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return;
  }
  if (payload.role && payload.role !== 'service_role') {
    die(
      `That key is a "${payload.role}" key, not the service_role key.`,
      [
        'The admin API rejects it, and putting the service_role key in a VITE_*',
        'variable would leak it to every browser that loads the app.',
        '',
        'Use Project Settings -> API Keys -> service_role.',
      ].join('\n'),
    );
  }
}

/* ------------------------------------------------------------------ api */

function authHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

async function auth(method, endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method,
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }
  return { status: res.status, ok: res.ok, json };
}

async function rest(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    headers: authHeaders({ Prefer: 'count=exact' }),
  });
  const text = await res.text();
  let rows = [];
  let parseError = null;
  try {
    rows = text ? JSON.parse(text) : [];
  } catch {
    parseError = text.slice(0, 300);
  }
  const range = res.headers.get('content-range') || '';
  const total = range.includes('/') ? range.slice(range.indexOf('/') + 1) : null;
  return {
    ok: res.ok,
    status: res.status,
    rows,
    total: total === '*' || !total ? null : Number(total),
    error: parseError || (res.ok ? null : (rows?.message ?? text.slice(0, 300))),
  };
}

async function findUserByEmail(email) {
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { ok, json } = await auth('GET', `admin/users?page=${page}&per_page=${PAGE_SIZE}`);
    if (!ok) {
      die(
        'The admin API refused the request.',
        `${json?.msg || json?.message || json?.error_code || 'unknown error'}`,
      );
    }
    const users = json?.users ?? [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === wanted);
    if (hit) return hit;
    if (users.length < PAGE_SIZE) return null;
  }
  return null;
}

/* -------------------------------------------------------------- helpers */

function makePassword(strong) {
  const pick = (list) => list[randomInt(list.length)];
  const digits = String(randomInt(1000, 10000));
  if (strong) {
    const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%';
    let out = '';
    for (let i = 0; i < 24; i += 1) out += alphabet[randomInt(alphabet.length)];
    return out;
  }
  const cap = (word) => word[0].toUpperCase() + word.slice(1);
  return `${cap(pick(WORDS.adjectives))}-${pick(WORDS.nouns)}-${digits}`;
}

function displayNameFromEmail(email) {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function emailLooksValid(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function membershipQuery(email) {
  return `memberships?organization_id=eq.${DEMO_ORG_ID}&email=eq.${encodeURIComponent(
    email,
  )}&select=email,role_key,status,user_id`;
}

async function demoOrg() {
  const { ok, rows, error } = await rest(
    `organizations?slug=eq.${DEMO_ORG_SLUG}&select=id,name,slug`,
  );
  if (!ok) {
    die('Could not read the organizations table.', `PostgREST said: ${error}`);
  }
  return rows[0] ?? null;
}

function printLoginCard(email, password, orgName) {
  const bar = '-'.repeat(64);
  console.log('');
  console.log(bar);
  console.log('  Send exactly these two lines to the client.');
  console.log(bar);
  console.log(`  URL    : ${process.env.DEMO_PUBLIC_URL || 'your deployed app URL'}`);
  console.log(`  Email  : ${email}`);
  console.log(`  Pass   : ${password}`);
  console.log('');
  console.log(`  They land straight in "${orgName}" with the seeded pipeline.`);
  console.log(bar);
  console.log('');
}

function printSqlLink(userId, email, role) {
  console.log('Run this once in Supabase Dashboard -> SQL Editor (one single run):');
  console.log('');
  console.log('  select noctis.set_flag(\'tenant_bootstrap\', true);');
  console.log('');
  console.log('  insert into public.memberships (organization_id, user_id, email, role_key, status)');
  console.log('  values (');
  console.log(`    ${sqlLiteral(DEMO_ORG_ID)},`);
  console.log(`    ${sqlLiteral(userId)}::uuid,`);
  console.log(`    ${sqlLiteral(email)},`);
  console.log(`    ${sqlLiteral(role)},`);
  console.log("    'active'");
  console.log('  )');
  console.log('  on conflict do nothing;');
  console.log('');
  console.log('  select noctis.set_flag(\'tenant_bootstrap\', false);');
  console.log('');
  console.log('Why the flag: the membership guard only lets an owner add an owner,');
  console.log('so a scripted link must raise it first. It is revoked from anon and');
  console.log('authenticated, so a signed-in user can never do this.');
}

/* ------------------------------------------------------------ commands */

async function commandStatus() {
  const org = await demoOrg();
  console.log(`\nProject: ${SUPABASE_URL}`);
  console.log('');

  if (!org) {
    console.log('  [MISSING] Demo workspace "Noctis Sales Forge"');
    console.log('');
    console.log('  Seed it first: Supabase Dashboard -> SQL Editor, paste the whole of');
    console.log('  supabase/migrations/0008_demo_data.sql and run it.');
  } else {
    const { rows } = await rest(
      `memberships?organization_id=eq.${DEMO_ORG_ID}&select=email,role_key,status,user_id`,
    );
    const list = Array.isArray(rows) ? rows : [];
    const usable = list.filter((r) => r.status === 'active' && r.user_id).length;
    console.log(`  [OK]      Demo workspace "${org.name}" (${org.slug})`);
    console.log(`            ${list.length} membership row(s), ${usable} usable login(s)`);
    if (usable === 0) {
      console.log('');
      console.log('  No usable login yet. Next:');
      console.log('    npm run demo:account -- create --name "Acme Corp"');
    }
  }

  const { ok, json } = await auth('GET', 'admin/users?page=1&per_page=1');
  console.log('');
  console.log(
    ok
      ? '  [OK]      service_role key accepted by the admin API'
      : `  [FAIL]    admin API rejected the key: ${json?.msg || json?.message || json?.error_code}`,
  );
  if (ok && !org) {
    console.log('');
    console.log('  Nothing else works until 0008 is applied. Start there.');
  }
  console.log('');
}

async function commandCreate(flags) {
  const email = (flags.email || DEMO_OWNER_EMAIL).trim().toLowerCase();
  const role = (flags.role || (email === DEMO_OWNER_EMAIL ? 'owner' : 'viewer')).toLowerCase();

  if (!emailLooksValid(email)) die(`"${email}" is not a valid email address.`);
  if (!ROLES.includes(role)) die(`Unknown role "${role}". Use one of: ${ROLES.join(', ')}`);
  if (flags.password && (flags.password.length < 6 || flags.password.length > 72)) {
    die('The password must be between 6 and 72 characters.');
  }

  const org = await demoOrg();
  if (!org) {
    die(
      'The demo workspace does not exist yet.',
      [
        'Apply it before creating any login, otherwise there is nothing to show:',
        '',
        '  Supabase Dashboard -> SQL Editor -> paste the whole of',
        '  supabase/migrations/0008_demo_data.sql -> Run',
        '',
        'Then: npm run demo:account -- create',
      ].join('\n'),
    );
  }

  const name = (flags.name || displayNameFromEmail(email)).trim();
  const existing = await findUserByEmail(email);

  let user = existing;
  let password = flags.password;

  if (existing) {
    console.log(`\n  Reusing the existing login ${email}.`);
    if (flags.password) {
      const { ok, json } = await auth('PUT', `admin/users/${existing.id}`, {
        password: flags.password,
        email_confirm: true,
      });
      if (!ok) die(`Could not set the password.`, json?.msg || json?.message);
      password = flags.password;
      console.log('  Password updated.');
    } else {
      password = '(unchanged — pass --password to set a new one)';
    }
    if (existing.email_confirmed_at === null || existing.email_confirmed_at === undefined) {
      await auth('PUT', `admin/users/${existing.id}`, { email_confirm: true });
      console.log('  Email marked as confirmed.');
    }
  } else {
    password = flags.password || makePassword(Boolean(flags.strong));
    const { ok, status, json } = await auth('POST', 'admin/users', {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (!ok) {
      die(
        `Could not create the login ${email} (HTTP ${status}).`,
        json?.msg || json?.message || json?.error_code || 'no detail returned',
      );
    }
    user = json;
    console.log(`\n  Created ${email} (confirmed, no email confirmation needed).`);
  }

  const { rows } = await rest(membershipQuery(email));
  const membership = Array.isArray(rows) ? rows[0] : null;

  if (membership && membership.status === 'active' && membership.user_id) {
    console.log(
      `  Linked: already ${membership.role_key} of "${org.name}" (the auth trigger claimed the invitation).`,
    );
  } else if (email === DEMO_OWNER_EMAIL && membership) {
    console.log(
      `  Linked: invitation for ${email} is still pending (user_id is null).`,
    );
    console.log('  Run this once in the SQL Editor:');
    console.log('');
    console.log('    update public.memberships');
    console.log(`       set user_id = ${sqlLiteral(user.id)}::uuid, status = 'active'`);
    console.log(`     where organization_id = ${sqlLiteral(DEMO_ORG_ID)}`);
    console.log(`       and email = ${sqlLiteral(email)};`);
    console.log('');
  } else {
    console.log(`  Not linked yet: ${email} has no membership in "${org.name}".`);
    console.log('');
    printSqlLink(user.id, email, role);
    console.log('');
    console.log('  Or skip the SQL: open the app with the owner login, then');
    console.log('  Settings -> Members -> Invite, and invite this address.');
  }

  if (password !== '(unchanged — pass --password to set a new one)') {
    printLoginCard(email, password, org.name);
  }
  console.log('  Verify before you hand it over:');
  console.log('');
  console.log('    E2E_EMAIL=' + email + ' E2E_PASSWORD=' + password + ' npm run test:e2e');
  console.log('');
}

async function commandReset(flags) {
  const email = (flags.email || '').trim().toLowerCase();
  if (!emailLooksValid(email)) die('Pass a valid --email, e.g. --email demo.owner@example.com');

  const user = await findUserByEmail(email);
  if (!user) die(`No login exists for ${email}.`, 'Create it first: npm run demo:account -- create');

  const password = flags.password || makePassword(Boolean(flags.strong));
  const { ok, json } = await auth('PUT', `admin/users/${user.id}`, {
    password,
    email_confirm: true,
  });
  if (!ok) die('Could not set the password.', json?.msg || json?.message);

  const org = await demoOrg();
  const { rows } = await rest(membershipQuery(email));
  const m = Array.isArray(rows) ? rows[0] : null;
  const linked = m?.status === 'active' && Boolean(m?.user_id);

  console.log(`\n  Password rotated for ${email}. The old one no longer works.`);
  if (linked) printLoginCard(email, password, org?.name ?? DEMO_ORG_SLUG);
  else console.log('  This login still has no demo-workspace membership — it will hit onboarding.\n');
}

async function commandList() {
  const emails = [];
  for (let page = 1; page <= 10; page += 1) {
    const { ok, json } = await auth('GET', `admin/users?page=${page}&per_page=${PAGE_SIZE}`);
    if (!ok) die('Could not list users.', json?.msg || json?.message);
    const users = json?.users ?? [];
    for (const user of users) {
      if (!user.email) continue;
      emails.push(user.email.toLowerCase());
    }
    if (users.length < PAGE_SIZE) break;
  }

  const { rows } = await rest(`memberships?organization_id=eq.${DEMO_ORG_ID}&select=email,role_key,status,user_id`);
  const byEmail = new Map(rows.map((r) => [(r.email || '').toLowerCase(), r]));

  console.log(`\nProject: ${SUPABASE_URL}`);
  console.log(`Demo workspace: ${DEMO_ORG_SLUG}\n`);
  console.log('  EMAIL                              ROLE      STATUS     DEMO ACCESS');
  console.log('  ' + '-'.repeat(70));

  for (const email of emails.sort()) {
    const m = byEmail.get(email);
    const role = m?.role_key ?? '-';
    const status = m?.status ?? '-';
    const access = m ? (m.status === 'active' && m.user_id ? 'yes' : `no (${m.status})`) : 'no';
    console.log(`  ${email.padEnd(34)} ${role.padEnd(9)} ${status.padEnd(10)} ${access}`);
  }
  if (emails.length === 0) console.log('  (no logins on this project)');
  console.log('');
}

async function commandRevoke(flags) {
  const email = (flags.email || '').trim().toLowerCase();
  if (!emailLooksValid(email)) die('Pass a valid --email, e.g. --email claire@acme.fr');
  if (flags.yes !== 'true') {
    die(
      `Refusing to delete ${email} without confirmation.`,
      'Re-run with --yes once you are sure.',
    );
  }

  const user = await findUserByEmail(email);
  if (!user) die(`No login exists for ${email}. Nothing to do.`);

  const { ok, json } = await auth('DELETE', `admin/users/${user.id}`);
  if (!ok) die(`Could not delete ${email}.`, json?.msg || json?.message);

  console.log(`\n  Deleted the login ${email}.`);
  console.log('  Its membership row goes with it (auth.users -> profiles -> memberships cascade),');
  console.log('  and the audit trail records the removal.');
  console.log('');
}

/* ---------------------------------------------------------------- main */

const { command, flags } = parseArgs(process.argv.slice(2));

if (flags.help === 'true' || command === 'help') {
  console.log(USAGE);
  process.exit(0);
}

if (flags.url) SUPABASE_URL = flags.url.trim().replace(/\/+$/, '');

const COMMANDS = {
  status: commandStatus,
  create: commandCreate,
  reset: commandReset,
  list: commandList,
  revoke: commandRevoke,
};

const run = COMMANDS[command];
if (!run) {
  console.error(`\nUnknown command "${command}".`);
  console.error(USAGE);
  process.exit(1);
}

requireConfig();
await run(flags);