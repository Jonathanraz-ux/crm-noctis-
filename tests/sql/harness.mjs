/**
 * Shared harness for the Noctis CRM SQL test suites.
 *
 * There is no Docker on the target machine, so instead of shelling out to
 * `supabase start` these suites boot a real PostgreSQL through
 * `embedded-postgres`, install the small part of the Supabase schema the
 * migrations depend on (auth.users, the anon/authenticated roles), and then
 * apply the kit's migrations exactly as Supabase would.
 *
 * Everything the tests assert is therefore asserted by PostgreSQL itself:
 * RLS policies, triggers, constraints and privileges are the real ones.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import pg from 'pg';

const { Client } = pg;

/**
 * Is anything already listening on this port?
 */
function portInUse(port) {
  return new Promise((resolvePromise) => {
    const probe = createServer();
    probe.once('error', (err) => resolvePromise(err.code === 'EADDRINUSE'));
    probe.once('listening', () => probe.close(() => resolvePromise(false)));
    probe.listen(port, '127.0.0.1');
  });
}

/**
 * The slice of Supabase the migrations rely on.
 */
export const SHIM = `
create schema if not exists auth;
create schema if not exists extensions;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create table if not exists auth.users (
  id uuid primary key,
  email text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table auth.users owner to postgres;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
`;

export const MIGRATIONS_DIR = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase'));

/** Apply every migration in order, the way Supabase applies them. */
export async function applyMigrations(client, dir = MIGRATIONS_DIR) {
  const files = readdirSync(join(dir, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = [];
  for (const file of files) {
    await client.query(readFileSync(join(dir, 'migrations', file), 'utf8'));
    applied.push(file);
  }
  return applied;
}

/**
 * Supabase default table privileges.
 */
export const SUPABASE_DEFAULT_GRANTS = `
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
`;

/**
 * Boot a throwaway cluster, hand the caller a connected client, and tear
 * everything down afterwards even if the suite throws.
 */
export async function withDatabase(port, fn) {
  if (await portInUse(port)) {
    throw new Error(
      `Port ${port} is already in use, so the test cluster cannot start.\n` +
        'A previous run was probably interrupted and left its server behind. ' +
        'Stop it and try again:\n' +
        `  Get-NetTCPConnection -LocalPort ${port} | Select-Object -ExpandProperty OwningProcess | ` +
        `ForEach-Object { Stop-Process -Id $_ -Force }`,
    );
  }

  const dataDir = mkdtempSync(join(tmpdir(), 'noctis-crm-pg-'));
  const logs = [];
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C', '--lc-collate=C', '--lc-ctype=C'],
    onLog: (m) => logs.push(String(m)),
    onError: (e) => logs.push(String(e)),
  });

  try {
    await server.initialise();
    await server.start();
  } catch (err) {
    throw new Error(
      `Could not start the embedded PostgreSQL on port ${port}: ${String(err)}\n` +
        (logs.length ? `--- server output ---\n${logs.join('\n')}` : '(the server produced no output)'),
    );
  }

  const client = new Client({ connectionString: `postgres://postgres:postgres@localhost:${port}/postgres` });
  client.on('error', () => {});

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
    try {
      await server.stop();
    } catch {
      /* already stopped */
    }
    await removeDataDir(dataDir);
  }
}

async function removeDataDir(dir) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      return;
    } catch (err) {
      if (attempt === 9) {
        console.warn(`\n      note: could not delete the temporary cluster at ${dir} (${err.code ?? err.message})`);
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

/** Minimal pass/fail reporter. */
export function reporter(label) {
  const state = { pass: 0, failures: [] };
  return {
    state,
    log: (m) => console.log(m),
    section: (name) => console.log(`\n${name}`),
    check(name, ok, detail = '') {
      if (ok) {
        state.pass += 1;
        console.log(`  PASS  ${name}`);
      } else {
        state.failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
        console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
      }
    },
    audit(name, rows, render = (r) => Object.values(r).join(', ')) {
      if (rows.length) this.check(name, false, rows.map(render).join('; '));
      else this.check(name, true);
    },
    finish() {
      const failed = state.failures.length;
      const line = '='.repeat(66);
      console.log(`\n${line}`);
      console.log(`${label}: ${state.pass} passed, ${failed} failed`);
      if (failed) state.failures.forEach((f) => console.log(`  - ${f}`));
      console.log(line);
      return failed;
    },
  };
}
