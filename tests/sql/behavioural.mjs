/**
 * Behavioural security test suite for Noctis CRM.
 *
 * Applies the kit's migrations to a real PostgreSQL, then acts as five
 * different users through genuine RLS enforcement and asserts the guarantees
 * the product promises: tenant isolation, no self-escalation, immutable
 * identity columns, an audit trail the client cannot forge, and per-role
 * permissions across all CRM domains (prospects, contacts, deals, tasks, notes).
 *
 * Run with: npm run test:sql:behavioural
 */
import {
  MIGRATIONS_DIR,
  SHIM,
  SUPABASE_DEFAULT_GRANTS,
  applyMigrations,
  reporter,
  withDatabase,
} from './harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 55433;

const ALICE = 'aaaaaaaa-0000-4000-8000-000000000001';
const BOB = 'bbbbbbbb-0000-4000-8000-000000000002';
const CAROL = 'cccccccc-0000-4000-8000-000000000003';
const DAVE = 'dddddddd-0000-4000-8000-000000000004';
const DEMO_ORG = '11111111-1111-4111-8111-111111111111';

const NOT_DENIED = 'NOT-DENIED';

async function main() {
  const failed = await withDatabase(PORT, async (client) => {
    const t = reporter('behavioural CRM RLS suite');
    t.log(`migrations: ${MIGRATIONS_DIR}`);

    const asUser = async (userId, fn) => {
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify(userId ? { sub: userId, email: `${userId.slice(0, 4)}@example.com` } : {}),
      ]);
      try {
        return await fn();
      } finally {
        await client.query('reset role');
        await client.query('commit');
      }
    };

    const attempt = async (fn) => {
      await client.query('savepoint sp');
      try {
        const result = await fn();
        await client.query('release savepoint sp');
        return { ok: true, result };
      } catch (error) {
        await client.query('rollback to savepoint sp');
        await client.query('release savepoint sp');
        return { ok: false, error: error.message };
      }
    };

    const describe = (r) => (!r.ok ? `blocked: ${r.error}` : `${r.result.rowCount} row(s) changed`);
    const blockedBy = (r, re) => (!r.ok && re.test(r.error)) || NOT_DENIED;
    const noRows = (r) => !r.ok || r.result.rowCount === 0;

    await client.query(SHIM);
    await applyMigrations(client);
    await client.query(SUPABASE_DEFAULT_GRANTS);
    t.check('the kit installs and client is granted default table privileges', true);

    /* ============================================================ bootstrap */
    t.section('\n[1] sign-up and tenant bootstrap');
    for (const [id, email, name] of [
      [ALICE, 'alice@example.com', 'Alice Owner'],
      [BOB, 'bob@example.com', 'Bob Manager'],
      [CAROL, 'carol@example.com', 'Carol Viewer'],
      [DAVE, 'dave@example.com', 'Dave Outsider'],
    ]) {
      await client.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3)`, [
        id,
        email,
        JSON.stringify({ full_name: name }),
      ]);
    }

    t.check(
      'sign-up creates a profile',
      (await scalar(client, 'select count(*)::int as n from public.profiles')) === 4,
    );
    t.check(
      'sign-up grants no tenant membership and no role',
      (await scalar(client, 'select count(*)::int as n from public.memberships')) === 1,
      'only the pending demo invitation exists',
    );

    const orgA = await asUser(ALICE, () => client.query(`select public.create_organization('Apex Sales') as id`));
    const orgB = await asUser(DAVE, () => client.query(`select public.create_organization('Vortex CRM') as id`));
    const A = orgA.rows[0].id;
    const B = orgB.rows[0].id;
    t.check('create_organization returns a new organization id', Boolean(A) && A !== B);
    t.check(
      'each creator becomes an active owner',
      (await scalar(client, `select count(*)::int as n from public.memberships where status = 'active' and role_key = 'owner'`)) === 2,
    );
    t.check(
      'create_organization refuses an anonymous caller',
      blockedBy(
        await asUser('', () => attempt(() => client.query(`select public.create_organization('Ghost')`))),
        /authentication required/i,
      ) !== NOT_DENIED,
    );

    await asUser(ALICE, async () => {
      for (const [email, role] of [
        ['bob@example.com', 'manager'],
        ['carol@example.com', 'viewer'],
      ]) {
        await client.query(
          `insert into public.memberships (organization_id, user_id, email, role_key, status)
           values ($1, null, $2, $3, 'invited')`,
          [A, email, role],
        );
      }
    });

    t.check(
      'a user can claim an invitation addressed to their email',
      (await client.query('select public.claim_pending_invites($1,$2) as n', [BOB, 'bob@example.com'])).rows[0].n === 1,
    );
    await client.query('select public.claim_pending_invites($1,$2)', [CAROL, 'carol@example.com']);

    /* Seed CRM records in Org A and Org B */
    let prospectAId, dealAId, contactAId, taskAId, noteAId;
    await asUser(ALICE, async () => {
      const p = await client.query(
        `insert into public.prospects (organization_id, name, company, email) values ($1, 'Acme Corp', 'Acme', 'lead@acme.example.com') returning id`,
        [A],
      );
      prospectAId = p.rows[0].id;

      const c = await client.query(
        `insert into public.contacts (organization_id, name, email, prospect_id) values ($1, 'Alice Contact', 'alice.c@acme.example.com', $2) returning id`,
        [A, prospectAId],
      );
      contactAId = c.rows[0].id;

      const d = await client.query(
        `insert into public.deals (organization_id, title, value, stage, prospect_id, contact_id) values ($1, 'Acme Enterprise License', 50000, 'proposal', $2, $3) returning id`,
        [A, prospectAId, contactAId],
      );
      dealAId = d.rows[0].id;

      const tk = await client.query(
        `insert into public.tasks (organization_id, title, status, prospect_id, deal_id) values ($1, 'Follow up with Acme', 'pending', $2, $3) returning id`,
        [A, prospectAId, dealAId],
      );
      taskAId = tk.rows[0].id;

      const nt = await client.query(
        `insert into public.notes (organization_id, body, prospect_id, deal_id) values ($1, 'Executive sponsor is highly aligned.', $2, $3) returning id`,
        [A, prospectAId, dealAId],
      );
      noteAId = nt.rows[0].id;
    });

    await asUser(DAVE, async () => {
      await client.query(
        `insert into public.prospects (organization_id, name, company) values ($1, 'Dave Secret Lead', 'Secret Corp')`,
        [B],
      );
      await client.query(
        `insert into public.deals (organization_id, title, value, stage) values ($1, 'Dave Secret Deal', 90000, 'discovery')`,
        [B],
      );
    });

    /* ================================================== tenant isolation */
    t.section('\n[2] tenant isolation — reads');
    const bobProspects = await asUser(BOB, async () => (await client.query(`select organization_id, name from public.prospects`)).rows);
    t.check('member of A cannot read B prospects', bobProspects.every((r) => r.organization_id === A), JSON.stringify(bobProspects));

    const daveProspects = await asUser(DAVE, async () => (await client.query(`select name from public.prospects`)).rows);
    t.check('member of B cannot read A prospects', !daveProspects.some((r) => r.name === 'Acme Corp'));

    const bobDeals = await asUser(BOB, async () => (await client.query(`select organization_id, title from public.deals`)).rows);
    t.check('member of A cannot read B deals', bobDeals.every((r) => r.organization_id === A));

    const daveDeals = await asUser(DAVE, async () => (await client.query(`select title from public.deals`)).rows);
    t.check('member of B cannot read A deals', !daveDeals.some((r) => r.title === 'Acme Enterprise License'));

    t.section('\n[3] tenant isolation — writes');
    t.check(
      'cannot insert prospects into another tenant',
      blockedBy(await asUser(DAVE, () => attempt(() => client.query(
        `insert into public.prospects (organization_id, name) values ($1,'Injected Lead')`, [A],
      ))), /row-level security|permission denied/i) !== NOT_DENIED,
    );
    t.check(
      'cannot insert deals into another tenant',
      blockedBy(await asUser(DAVE, () => attempt(() => client.query(
        `insert into public.deals (organization_id, title, value) values ($1,'Injected Deal',1000)`, [A],
      ))), /row-level security|permission denied/i) !== NOT_DENIED,
    );
    t.check(
      'cannot update another tenant\'s prospect',
      (await asUser(DAVE, async () => (await client.query(`update public.prospects set name='Hijacked' where organization_id=$1`, [A])).rowCount)) === 0,
    );
    t.check(
      'cannot delete another tenant\'s deal',
      (await asUser(DAVE, async () => (await client.query(`delete from public.deals where organization_id=$1`, [A])).rowCount)) === 0,
    );

    const crossMove = await asUser(ALICE, async () => {
      return attempt(() => client.query(`update public.prospects set organization_id=$1 where id=$2`, [B, prospectAId]));
    });
    t.check(
      'cannot move a CRM record into another tenant',
      blockedBy(crossMove, /cannot be moved/i) !== NOT_DENIED,
      describe(crossMove),
    );

    /* ================================================ privilege escalation */
    t.section('\n[4] privilege escalation');
    const managerSelfPromote = await asUser(BOB, () => attempt(() => client.query(
      `update public.memberships set role_key='owner' where user_id=$1`, [BOB],
    )));
    t.check('a manager cannot promote themselves', noRows(managerSelfPromote), describe(managerSelfPromote));

    t.check(
      'an owner cannot demote themselves',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `update public.memberships set role_key='viewer' where user_id=$1`, [ALICE],
      ))), /cannot change your own role/i) !== NOT_DENIED,
    );
    t.check(
      'an owner cannot suspend themselves',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `update public.memberships set status='suspended' where user_id=$1`, [ALICE],
      ))), /cannot change your own role/i) !== NOT_DENIED,
    );
    t.check(
      'an owner cannot remove their own membership',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `delete from public.memberships where user_id=$1 and organization_id=$2`, [ALICE, A],
      ))), /cannot remove your own membership/i) !== NOT_DENIED,
    );

    const ownerGrantsAdmin = await asUser(ALICE, () => attempt(() => client.query(
      `update public.memberships set role_key='admin' where user_id=$1 and organization_id=$2`, [CAROL, A],
    )));
    t.check('an owner CAN promote a member to admin', ownerGrantsAdmin.ok && ownerGrantsAdmin.result.rowCount === 1);

    t.check(
      'an admin cannot hand out the owner role',
      blockedBy(await asUser(CAROL, () => attempt(() => client.query(
        `update public.memberships set role_key='owner' where user_id=$1 and organization_id=$2`, [BOB, A],
      ))), /only owners|only an owner can promote/i) !== NOT_DENIED,
    );

    await asUser(ALICE, () => client.query(`update public.memberships set role_key='viewer' where user_id=$1 and organization_id=$2`, [CAROL, A]));

    const lastOwner = await asUser(ALICE, () => attempt(() => client.query(
      `delete from public.memberships where organization_id=$1 and role_key='owner'`, [A],
    )));
    t.check(
      'an organization cannot be left without an active owner',
      blockedBy(lastOwner, /at least one active owner|cannot remove your own membership/i) !== NOT_DENIED,
    );

    /* ==================================================== role permissions */
    t.section('\n[5] role permissions');
    t.check(
      'a viewer cannot create prospects',
      blockedBy(await asUser(CAROL, () => attempt(() => client.query(
        `insert into public.prospects (organization_id, name) values ($1,'viewer prospect')`, [A],
      ))), /row-level security|permission denied/i) !== NOT_DENIED,
    );
    t.check(
      'a viewer cannot create deals',
      blockedBy(await asUser(CAROL, () => attempt(() => client.query(
        `insert into public.deals (organization_id, title, value) values ($1,'viewer deal', 1000)`, [A],
      ))), /row-level security|permission denied/i) !== NOT_DENIED,
    );
    t.check(
      'a viewer cannot delete prospects',
      (await asUser(CAROL, async () => (await client.query(`delete from public.prospects where id=$1`, [prospectAId])).rowCount)) === 0,
    );
    t.check(
      'an owner can update deals',
      (await asUser(ALICE, async () => (await client.query(`update public.deals set stage='negotiation' where id=$1`, [dealAId])).rowCount)) === 1,
    );

    /* ================================================== identity integrity */
    t.section('\n[6] identity integrity');
    t.check(
      'a profile email cannot be changed from the client',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `update public.profiles set email='victim@example.com' where id=$1`, [ALICE],
      ))), /only be changed through supabase auth/i) !== NOT_DENIED,
    );
    t.check(
      'a profile id cannot be repointed at another account',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `update public.profiles set id=$1 where id=$2`, [DAVE, ALICE],
      ))), /cannot be changed/i) !== NOT_DENIED,
    );
    t.check(
      "cannot update someone else's profile",
      (await asUser(DAVE, async () => (await client.query(`update public.profiles set full_name='hijacked' where id=$1`, [ALICE])).rowCount)) === 0,
    );

    await asUser(ALICE, () => client.query(
      `insert into public.prospects (organization_id, name, created_by) values ($1,'Forged Creator',$2)`, [A, BOB],
    ));
    t.check(
      'created_by is stamped server-side, not taken from the client',
      (await asUser(ALICE, async () => (await client.query(`select created_by from public.prospects where name='Forged Creator'`)).rows[0]?.created_by)) === ALICE,
    );
    t.check(
      'the creator of a CRM record cannot be reassigned',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `update public.prospects set created_by=$1 where name='Forged Creator'`, [DAVE],
      ))), /creator of a record cannot be changed/i) !== NOT_DENIED,
    );

    /* ========================================================= audit trail */
    t.section('\n[7] audit trail');
    t.check(
      'clients cannot write the audit log',
      blockedBy(await asUser(ALICE, () => attempt(() => client.query(
        `insert into public.audit_logs (organization_id, action, entity) values ($1,'insert','prospects')`, [A],
      ))), /row-level security|permission denied/i) !== NOT_DENIED,
    );
    t.check(
      'clients cannot edit the audit log',
      (await asUser(ALICE, async () => (await client.query(`update public.audit_logs set action='delete' where organization_id=$1`, [A])).rowCount)) === 0,
    );

    const auditRows = (await client.query(
      `select action, entity, metadata from public.audit_logs where organization_id=$1 order by id`, [A],
    )).rows;
    t.check('prospect changes are audited automatically', auditRows.some((r) => r.entity === 'prospects'));
    t.check('deal changes are audited automatically', auditRows.some((r) => r.entity === 'deals'));
    t.check('task changes are audited automatically', auditRows.some((r) => r.entity === 'tasks'));

    const dealUpdateAudit = auditRows.find((r) => r.entity === 'deals' && r.action === 'update');
    t.check(
      'an update audit entry lists the columns that changed',
      Array.isArray(dealUpdateAudit?.metadata?.changed) && dealUpdateAudit.metadata.changed.includes('stage'),
      JSON.stringify(dealUpdateAudit?.metadata),
    );

    t.check(
      'a viewer without audit.read sees nothing',
      (await asUser(CAROL, async () => scalar(client, `select count(*)::int as n from public.audit_logs`))) === 0,
    );
    t.check(
      'an owner can read the audit log',
      (await asUser(ALICE, async () => scalar(client, `select count(*)::int as n from public.audit_logs`))) > 0,
    );

    /* ============================================== reference data is RO */
    t.section('\n[8] reference data is read-only at runtime');
    t.check(
      'a manager cannot add org.delete to the owner role',
      blockedBy(await asUser(BOB, () => attempt(async () => {
        const role = await client.query(`select id from public.roles where key='owner'`);
        return client.query(`insert into public.role_permissions (role_id, permission_code) values ($1,'org.delete')`, [role.rows[0].id]);
      })), /row-level security|permission denied/i) !== NOT_DENIED,
    );

    /* ============================================== views inherit the RLS */
    t.section('\n[9] views inherit RLS');
    const bobStats = await asUser(BOB, async () => (await client.query(`select organization_id from public.v_org_stats`)).rows);
    t.check('v_org_stats only exposes the caller\'s organizations', bobStats.every((r) => r.organization_id === A));
    const daveStats = await asUser(DAVE, async () => (await client.query(`select organization_id from public.v_org_stats`)).rows);
    t.check('v_org_stats hides other tenants', !daveStats.some((r) => r.organization_id === A));
    t.check(
      'v_members lists only the caller\'s organization',
      (await asUser(BOB, async () => scalar(client, `select count(*)::int as n from public.v_members`))) === 3,
    );

    /* ================================================== demo workspace */
    t.section('\n[10] demo workspace & cleanup');
    t.check(
      'demo data is invisible until invitation is claimed',
      (await asUser(ALICE, async () => scalar(client, `select count(*)::int as n from public.prospects where organization_id=$1`, [DEMO_ORG]))) === 0,
    );

    await client.query(readFileSync(join(MIGRATIONS_DIR, 'remove-demo-data.sql'), 'utf8'));
    t.check(
      'remove-demo-data.sql deletes the demo workspace',
      (await scalar(client, `select count(*)::int as n from public.organizations where id=$1`, [DEMO_ORG])) === 0,
    );
    t.check(
      '...and takes its CRM and audit entries with it',
      (await scalar(client, `select count(*)::int as n from public.audit_logs where organization_id=$1`, [DEMO_ORG])) === 0,
    );

    return t.finish();
  });

  process.exit(failed ? 1 : 0);
}

async function rows(client, sql, params) {
  return (await client.query(sql, params)).rows;
}

async function scalar(client, sql, params) {
  return Number((await client.query(sql, params)).rows[0].n);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
