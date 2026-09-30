/**
 * Static verification of the Noctis CRM schema.
 *
 * Applies the migrations to a real PostgreSQL and then interrogates the
 * catalog for the properties that reading the SQL alone would leave to trust:
 * is RLS actually enabled, does any write policy hand over a whole table, can a
 * browser reach a function it should not, does every SECURITY DEFINER function
 * pin its search_path.
 *
 * Run with: npm run test:sql:static
 */
import {
  MIGRATIONS_DIR,
  SHIM,
  SUPABASE_DEFAULT_GRANTS,
  applyMigrations,
  reporter,
  withDatabase,
} from './harness.mjs';

const PORT = 55432;

const KIT_FUNCTIONS = [
  'current_user_id',
  'is_org_member',
  'org_role',
  'has_perm',
  'shares_org_with_me',
  'member_user_ids',
  'set_flag',
  'flag',
  'touch_updated_at',
  'guard_profile_write',
  'guard_membership_write',
  'guard_crm_record_write',
  'guard_organization_write',
  'guard_organization_identity',
  'audit_row_change',
  'handle_new_user',
  'claim_pending_invites',
  'create_organization',
  'claim_invites',
];

async function main() {
  const failed = await withDatabase(PORT, async (client) => {
    const t = reporter('static schema audit');
    t.log(`migrations: ${MIGRATIONS_DIR}`);

    await client.query(SHIM);
    t.check('the Supabase shim installs', true, 'auth schema, anon/authenticated roles');

    const files = await applyMigrations(client);
    t.check(`all ${files.length} migrations apply cleanly`, true, files.join(', '));

    await client.query(SUPABASE_DEFAULT_GRANTS);
    t.log('      (client table privileges granted, so RLS is the only gate)');

    const c = (
      await client.query(`
      select
        (select count(*) from public.permissions)      as permissions,
        (select count(*) from public.roles)            as roles,
        (select count(*) from public.role_permissions) as matrix,
        (select count(*) from public.prospects)        as prospects,
        (select count(*) from public.contacts)         as contacts,
        (select count(*) from public.deals)            as deals,
        (select count(*) from public.tasks)            as tasks,
        (select count(*) from public.notes)            as notes,
        (select count(*) from public.organizations)    as organizations
    `)
    ).rows[0];
    t.log(`      reference & seed counts: ${JSON.stringify(c)}`);

    /* ------------------------------------------------------ reference data */
    t.section('\nreference data');
    t.check('the permission catalogue is populated', Number(c.permissions) >= 26, `${c.permissions} permissions`);
    t.check('the role catalogue is populated', Number(c.roles) >= 5, `${c.roles} roles`);
    t.check('the role/permission matrix is populated', Number(c.matrix) >= Number(c.roles), `${c.matrix} assignments`);
    t.check(
      'every role holds at least one permission',
      (await scalar(client, `
        select count(*)::int as n from public.roles r
        where not exists (select 1 from public.role_permissions rp where rp.role_id = r.id)
      `)) === 0,
    );
    t.check(
      'a role with org.delete can also read members',
      (await scalar(client, `
        select count(*)::int as n from public.roles r
        where exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_code = 'org.delete')
          and not exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_code = 'members.read')
      `)) === 0,
    );
    t.check(
      'rank is unique across roles, so org_role() comparisons are well defined',
      (await scalar(client, `select count(*)::int as n from (select rank from public.roles group by rank having count(*) > 1) x`)) === 0,
    );

    /* ---------------------------------------------------------- RLS on/off */
    t.section('\nrow level security');
    t.audit(
      'RLS is enabled on every public table',
      await rows(client, `
        select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      `),
      (r) => r.relname,
    );

    /* ------------------------------------------------------------- policies */
    t.section('\npolicies');
    t.audit(
      'no write policy is unconditional',
      await rows(client, `
        select n.nspname || '.' || c.relname || ' [' || p.cmd || '] ' || p.policyname as policy
        from pg_policies p
        join pg_class c on c.relname = p.tablename
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
        where n.nspname = 'public'
          and p.permissive = 'PERMISSIVE'
          and (
            (p.cmd in ('UPDATE', 'DELETE', 'ALL') and (p.qual is null or btrim(p.qual) = 'true'))
            or (p.cmd in ('INSERT', 'UPDATE', 'ALL') and (p.with_check is null or btrim(p.with_check) = 'true'))
          )
      `),
      (r) => r.policy,
    );
    t.audit(
      'no policy is granted to public/anon',
      await rows(client, `
        select schemaname || '.' || tablename || '.' || policyname as policy
        from pg_policies where schemaname = 'public' and roles = '{public}'
      `),
      (r) => r.policy,
    );
    t.audit(
      'the reference tables and the audit log have no write policy',
      await rows(client, `
        select tablename || '.' || policyname as policy
        from pg_policies
        where schemaname = 'public'
          and tablename in ('audit_logs', 'roles', 'permissions', 'role_permissions')
          and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      `),
      (r) => r.policy,
    );
    t.check(
      'audit_logs is readable by a signed-in user through a policy',
      (await scalar(client, `
        select count(*)::int as n from pg_policies
        where schemaname = 'public' and tablename = 'audit_logs' and cmd = 'SELECT'
      `)) > 0,
    );

    /* ------------------------------------------------------ function grants */
    t.section('\nfunction privileges');
    t.audit(
      'no kit function is executable by PUBLIC',
      await rows(client, `
        select n.nspname || '.' || p.proname as fn
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('noctis', 'public')
          and p.proname = any (array[${KIT_FUNCTIONS.map((f) => `'${f}'`).join(',')}]::name[])
          and has_function_privilege('public', p.oid, 'execute')
      `),
      (r) => r.fn,
    );
    t.audit(
      'the bootstrap flag helpers are unreachable by anon and authenticated',
      await rows(client, `
        select g.rolname || ' -> ' || n.nspname || '.' || p.proname as grant_path
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        cross join unnest (array['anon', 'authenticated']) as g(rolname)
        where n.nspname = 'noctis' and p.proname in ('set_flag', 'flag')
          and has_function_privilege(g.rolname, p.oid, 'execute')
      `),
      (r) => r.grant_path,
    );
    t.audit(
      'every SECURITY DEFINER function pins its search_path',
      await rows(client, `
        select n.nspname || '.' || p.proname as fn
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where p.prosecdef
          and coalesce(array_to_string(p.proconfig, ','), '') !~ 'search_path'
          and n.nspname in ('noctis', 'public')
      `),
      (r) => r.fn,
    );
    const owners = await rows(client, `
      select r.rolname as owner, count(*)::int as functions
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_roles r on r.oid = p.proowner
      where p.prosecdef and n.nspname in ('noctis', 'public')
      group by r.rolname order by r.rolname
    `);
    t.check(
      'all SECURITY DEFINER functions share a single owner',
      owners.length === 1,
      owners.map((o) => `${o.owner} (${o.functions})`).join(', '),
    );

    /* ----------------------------------------------------------------- views */
    t.section('\nviews');
    t.audit(
      "every view runs with the caller's privileges (security_invoker = true)",
      await rows(client, `
        select c.relname as view
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v'
          and coalesce(
            (select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'),
            'false'
          ) <> 'true'
      `),
      (r) => r.view,
    );

    /* ------------------------------------------------------------ demo data */
    t.section('\ndemo data');
    t.check('the demo workspace exists', Number(c.organizations) >= 1, `${c.organizations} organization(s)`);
    t.check('the demo prospects exist', Number(c.prospects) > 0, `${c.prospects} prospects`);
    t.check('the demo contacts exist', Number(c.contacts) > 0, `${c.contacts} contacts`);
    t.check('the demo deals exist', Number(c.deals) > 0, `${c.deals} deals`);
    t.check('the demo tasks exist', Number(c.tasks) > 0, `${c.tasks} tasks`);
    t.check('the demo notes exist', Number(c.notes) > 0, `${c.notes} notes`);

    t.audit(
      'every demo prospect email uses the reserved example.com domain',
      await rows(client, `select email from public.prospects where email !~ '@example\\.com$' limit 5`),
      (r) => r.email,
    );
    t.audit(
      'every demo contact email uses the reserved example.com domain',
      await rows(client, `select email from public.contacts where email !~ '@example\\.com$' limit 5`),
      (r) => r.email,
    );
    t.audit(
      'every demo prospect is tagged "demo"',
      await rows(client, `select id from public.prospects where not ('demo' = any (tags)) limit 5`),
      (r) => r.id,
    );
    t.check(
      'the demo invitation is unclaimed',
      (await scalar(client, `
        select count(*)::int as n from public.memberships
        where email = 'demo.owner@example.com' and user_id is null and status = 'invited'
      `)) === 1,
    );

    return t.finish();
  });

  process.exit(failed ? 1 : 0);
}

async function rows(client, sql) {
  return (await client.query(sql)).rows;
}

async function scalar(client, sql) {
  return Number((await client.query(sql)).rows[0].n);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
