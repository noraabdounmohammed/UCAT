/**
 * Live smoke test for the /study queue construction. Hits the production
 * Supabase RPC + RLS as if it were a brand-new authenticated user, and
 * asserts the queue meets minimum quality bars.
 *
 * Run BEFORE and AFTER any deploy that touches:
 *   - buildStudyQueue / queueLoader
 *   - next_unseen_atoms_for_user RPC
 *   - atoms RLS policy
 *   - listVarietyForExam / listFreshUnseenForExam
 *
 * USAGE:
 *   SUPABASE_URL=https://uivitzexbtsmnspcitgh.supabase.co \
 *   SUPABASE_ANON_KEY=<anon-key> \
 *   TEST_USER_EMAIL=<existing-test-account-email> \
 *   TEST_USER_PASSWORD=<password> \
 *   npx tsx scripts/smoke-test-queue.ts
 *
 * CI: not run automatically — this hits prod. Operator-triggered only.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.');
  process.exit(2);
}
if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD env vars.');
  console.error('Create a dedicated test user in Supabase Auth (e.g. smoke-test@studyedit.com)');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

interface AtomRow {
  id: string;
  question_kind: string | null;
  case_id: string | null;
  source_type: string;
  status: string;
}

let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}${detail ? `\n     ${detail}` : ''}`);
  }
}

async function main() {
  console.log('— Smoke test: live /study queue construction —\n');

  // 1. Anon caller must be blocked.
  console.log('TEST: anon caller cannot enumerate the bank');
  {
    const { data, error } = await supabase.rpc('next_unseen_atoms_for_user', {
      p_exam: 'UKMLA',
      p_include_unreviewed: true,
      p_variety_only: false,
      p_limit: 10,
    });
    check(
      'returns 0 rows or auth error for anon',
      (data?.length ?? 0) === 0 || !!error,
      `data.length=${data?.length}, error=${error?.message}`,
    );
  }

  // 2. Authenticate as test user.
  console.log('\nTEST: authenticate as test user');
  const { data: signin, error: signinErr } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL!,
    password: TEST_USER_PASSWORD!,
  });
  check('signed in', !signinErr && !!signin.session, signinErr?.message);
  if (!signin.session) {
    console.error('Cannot continue without a session.');
    process.exit(1);
  }

  // 3. Variety RPC returns at least 1 atom of newer kinds.
  console.log('\nTEST: variety RPC returns calc/EMQ/case-bound');
  {
    const { data, error } = await supabase.rpc('next_unseen_atoms_for_user', {
      p_exam: 'UKMLA',
      p_include_unreviewed: false,
      p_variety_only: true,
      p_limit: 5,
    });
    check('no error', !error, error?.message);
    check('returns >= 1 atom', (data?.length ?? 0) >= 1, `got ${data?.length} atoms`);
    const rows = (data ?? []) as AtomRow[];
    const hasNewerKind = rows.some(r =>
      r.question_kind === 'calc' || r.question_kind === 'emq' || r.case_id !== null,
    );
    check(
      'every returned atom is newer-kind (calc/emq/case-bound)',
      rows.every(r =>
        r.question_kind === 'calc' || r.question_kind === 'emq' || r.case_id !== null,
      ),
      `kinds=${rows.map(r => r.question_kind ?? 'sba').join(',')} caseIds=${rows.filter(r => r.case_id).length}`,
    );
    check('at least one match (sanity)', hasNewerKind);
  }

  // 4. Default pool excludes ai-draft pending.
  console.log('\nTEST: default pool excludes ai-draft pending');
  {
    const { data } = await supabase.rpc('next_unseen_atoms_for_user', {
      p_exam: 'UKMLA',
      p_include_unreviewed: false,
      p_variety_only: false,
      p_limit: 200,
    });
    const rows = (data ?? []) as AtomRow[];
    const aiDraftPending = rows.filter(r => r.source_type === 'ai-draft' && r.status === 'pending_review');
    check(
      'no ai-draft pending atoms returned',
      aiDraftPending.length === 0,
      `found ${aiDraftPending.length} ai-draft pending`,
    );
  }

  // 5. Toggle ON includes ai-draft pending.
  console.log('\nTEST: toggle ON includes ai-draft pending');
  {
    const { data } = await supabase.rpc('next_unseen_atoms_for_user', {
      p_exam: 'UKMLA',
      p_include_unreviewed: true,
      p_variety_only: false,
      p_limit: 200,
    });
    const rows = (data ?? []) as AtomRow[];
    const aiDrafts = rows.filter(r => r.source_type === 'ai-draft');
    check('ai-draft atoms appear when toggle on', aiDrafts.length > 0, `found ${aiDrafts.length}`);
  }

  // 6. Sign out + summary.
  await supabase.auth.signOut();
  console.log(`\n— Result: ${pass} passed, ${fail} failed —`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test threw:', err);
  process.exit(2);
});
