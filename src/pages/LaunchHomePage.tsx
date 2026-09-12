import React, { useMemo, useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { PracticeFilterModalParchment, type FilterState } from '@/components/practice/PracticeFilterModalParchment';
import { getDaypartGreeting, getLearnerFirstName } from '@/lib/learnerIdentity';
import { buildSessionPlanFromRequest, buildSpoilerSafeSessionPlan, rememberPlannedSession } from '@/lib/sessionPlan';
import { isEssentialConcept } from '@/utils/essentialCurriculum';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const P = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  sage: '#E8EDD9',
  sageDeep: '#667555',
};

function CountedScope({ items, subtle = false }: { items: Array<{ label: string; count: number }>; subtle?: boolean }) {
  if (!items.length) return <span className="text-[12px] font-semibold" style={{ color: P.muted }}>Mixed UKMLA</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span
          key={item.label}
          className="rounded-full border px-3 py-1.5 text-[12px] font-bold"
          style={{
            borderColor: subtle ? P.line : '#D8DDC9',
            backgroundColor: subtle ? '#FBF7F0' : P.sage,
            color: P.espresso,
          }}
        >
          {item.label}{item.count > 1 ? ` ×${item.count}` : ''}
        </span>
      ))}
    </div>
  );
}

function ScopeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[118px_1fr] sm:items-start">
      <div className="pt-1 text-[11px] font-semibold" style={{ color: P.muted }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function caseMix(cases: Array<{ system: string; skill: string }> = []) {
  const counts = new Map<string, number>();
  cases.forEach(item => {
    const label = `${item.system} · ${item.skill}`;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function SessionPlanCard({
  plan,
  onStart,
  onReset,
  personalised,
}: {
  plan: ReturnType<typeof buildSessionPlanFromRequest>;
  onStart: () => void;
  onReset: () => void;
  personalised: boolean;
}) {
  const unmatched = Boolean(plan.request && plan.requestMatched === false);
  const mix = caseMix(plan.cases || []);

  if (plan.count === 0) {
    return (
      <section
        className="mt-7 rounded-[22px] border p-5 sm:p-6"
        style={{ borderColor: P.line, backgroundColor: P.paper }}
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-[13px] font-semibold" style={{ color: P.muted }}>
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: P.sageDeep }} aria-hidden="true" />
          Looking across the UKMLA curriculum…
        </div>
        <p className="mt-2 text-[12px] leading-5" style={{ color: P.muted }}>
          I’ll show you the whole session scope before you start — without revealing future diagnoses or answers.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-7 overflow-hidden rounded-[22px] border"
      style={{ borderColor: P.line, backgroundColor: P.paper }}
      aria-live="polite"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: P.muted }}>
              {unmatched ? 'I couldn’t map that exactly' : plan.request ? 'Here’s what I understood' : personalised ? 'What I’d do next' : 'If I choose for you'}
            </div>
            <div className="mt-2 text-[18px] font-extrabold tracking-[-0.02em]" style={{ color: P.espresso }}>
              Whole session
            </div>
          </div>
          <div className="text-right">
            <div className="pt-0.5 text-[12px] font-semibold" style={{ color: P.muted }}>
              {plan.count} case{plan.count === 1 ? '' : 's'} · about {plan.minutes} min
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: '#9A8977' }}>
              Order hidden
            </div>
          </div>
        </div>

        {plan.request && (
          <div className="mt-4 text-[14px] font-semibold leading-6" style={{ color: P.espresso }}>
            “{plan.request}”
          </div>
        )}

        {unmatched && (
          <p className="mt-3 text-[12px] font-medium leading-5" style={{ color: P.muted }}>
            I couldn’t find a clean curriculum match, so this is my recommended mix instead. You can ask for an area such as cardiology, a skill such as management, a number of cases, or a time such as 10 minutes.
          </p>
        )}

        <div className="mt-6 space-y-5">
          <ScopeRow label="Clinical areas">
            <CountedScope items={plan.systemCounts || []} />
          </ScopeRow>
          <ScopeRow label="You’ll practise">
            <CountedScope items={plan.skillCounts || []} subtle />
          </ScopeRow>
          {mix.length > 0 && (
            <ScopeRow label="Case mix">
              <CountedScope items={mix} subtle />
            </ScopeRow>
          )}
          {personalised && (plan.reasonCounts || []).length > 0 && (
            <ScopeRow label="Why these">
              <CountedScope items={plan.reasonCounts || []} subtle />
            </ScopeRow>
          )}
        </div>

        <p className="mt-6 border-t pt-4 text-[11px] leading-5" style={{ borderColor: P.line, color: P.muted }}>
          This is the complete scope. The case mix is deliberately unordered; I keep exact conditions, decisive clues and answers hidden so seeing the plan cannot give away a case.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            aria-label="Start session"
            className="inline-flex items-center gap-2 rounded-[14px] px-5 py-3.5 text-[14px] font-bold"
            style={{ backgroundColor: P.espresso, color: P.cream }}
          >
            Start session <ArrowRight className="h-4 w-4" />
          </button>
          {plan.request && (
            <button type="button" onClick={onReset} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: P.muted }}>
              Let StudyEdit choose instead
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const selectedFilterValues = (values: string[] | undefined) => (values || []).filter(value => value && value !== 'any');

function conceptMatchesFilterTags(concept: any, values: string[] | undefined) {
  const selected = selectedFilterValues(values);
  if (!selected.length) return true;
  const tags = concept?.custom_filters || [];
  return selected.some(value => tags.includes(value));
}

function conceptMatchesLearningStatus(concept: any, statuses: string[] | undefined) {
  const selected = selectedFilterValues(statuses);
  if (!selected.length) return true;
  const md = concept?.mastery_data || {};
  return selected.some(status =>
    (status === 'mastered' && Number(md.mastery_level || 0) === 2) ||
    (status === 'weak' && Number(md.mastery_level || 0) === 1) ||
    (status === 'cold' && !Number(md.attempts || 0) && !Number(md.mastery_level || 0)) ||
    (status === 'drifting' && Number(md.attempts || 0) > 0 && !Number(md.mastery_level || 0))
  );
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;
  const [draft, setDraft] = useState('');
  const [request, setRequest] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const hasEvidence = useMemo(
    () => (concepts || []).some((concept: any) => Number(concept.mastery_data?.attempts || 0) > 0),
    [concepts],
  );
  const defaultCount = hasEvidence ? 5 : 3;
  const plan = useMemo(
    () => buildSessionPlanFromRequest(concepts || [], request, defaultCount),
    [concepts, defaultCount, request],
  );
  const learnerName = useMemo(() => getLearnerFirstName(user), [user]);
  const greeting = useMemo(() => getDaypartGreeting(), []);

  const applyRequest = (value: string) => {
    const next = value.trim();
    setDraft(next);
    setRequest(next);
  };

  const launchPlan = (nextPlan: ReturnType<typeof buildSessionPlanFromRequest>) => {
    if (nextPlan.count === 0) return;
    rememberPlannedSession(nextPlan);
    try {
      sessionStorage.setItem('studyedit_current_journey_v1', hasEvidence ? 'returning' : 'cold');
    } catch {
      // Starting a session must not depend on storage access.
    }
    navigate(`/recommended-practice?count=${Math.max(1, nextPlan.count || defaultCount)}`);
  };

  const startSession = () => launchPlan(plan);

  const startFilteredSession = (filters: FilterState) => {
    const matchingConcepts = (concepts || []).filter((concept: any) => {
      if (filters.essentialsOnly && !isEssentialConcept(concept)) return false;
      if (!conceptMatchesLearningStatus(concept, filters.statuses)) return false;
      if (!conceptMatchesFilterTags(concept, filters.areas)) return false;
      if (!conceptMatchesFilterTags(concept, filters.conditions)) return false;
      if (!conceptMatchesFilterTags(concept, filters.presentations)) return false;
      if (!conceptMatchesFilterTags(concept, filters.facets)) return false;
      return true;
    });
    const filteredPlan = buildSpoilerSafeSessionPlan(matchingConcepts, Math.max(1, filters.size || defaultCount));
    launchPlan(filteredPlan);
  };

  const requestForm = (
    <>
      <form
        className={`${hasEvidence ? 'mt-5' : 'mt-7'} flex items-center gap-2 rounded-[18px] border p-2 pl-4 shadow-[0_8px_24px_rgba(31,20,12,0.04)]`}
        style={{ borderColor: '#DCCDB8', backgroundColor: P.paper }}
        onSubmit={event => {
          event.preventDefault();
          applyRequest(draft);
        }}
      >
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={hasEvidence ? 'Want something different? Tell me…' : 'e.g. 10 minutes of cardio, 5 management cases, or let me choose'}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium outline-none placeholder:text-[#A89582]"
          style={{ color: P.espresso }}
        />
        <button
          type="submit"
          aria-label="Plan my session"
          className="flex h-11 shrink-0 items-center justify-center rounded-[13px] px-4 text-[13px] font-bold"
          style={{ backgroundColor: P.espresso, color: P.cream }}
        >
          Plan
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-semibold" style={{ color: P.muted }}>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 font-bold"
          style={{ borderColor: '#DCCDB8', backgroundColor: 'rgba(255,253,248,.72)', color: P.espresso }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Choose filters
        </button>
        <button type="button" onClick={() => applyRequest('')} className="underline decoration-[#C7B7A2] underline-offset-4">Let StudyEdit choose</button>
        <button type="button" onClick={() => applyRequest('10 minutes')} className="underline decoration-[#C7B7A2] underline-offset-4">10 minutes</button>
        <button type="button" onClick={() => applyRequest('Cardiology')} className="underline decoration-[#C7B7A2] underline-offset-4">Cardiology</button>
        <button type="button" onClick={() => applyRequest('Management')} className="underline decoration-[#C7B7A2] underline-offset-4">Management</button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div className="text-[19px] font-extrabold tracking-[-0.03em]" style={{ color: P.espresso }}>studyedit.</div>
          {!user ? (
            <button onClick={() => navigate('/signin?next=/')} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign in</button>
          ) : (
            <button onClick={() => void signOut()} className="text-[12px] font-semibold" style={{ color: P.muted }}>Sign out</button>
          )}
        </header>

        <section className="pt-14 sm:pt-20">
          <div className="text-[13px] font-semibold" style={{ color: P.muted }}>
            {learnerName ? `${greeting}, ${learnerName}.` : hasEvidence ? greeting : 'UKMLA tutor'}
          </div>
          <h1 className="mt-3 max-w-[650px] text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[50px]" style={{ color: P.espresso }}>
            {hasEvidence ? 'What do you need today?' : 'What do you want to work on?'}
          </h1>
          <p className="mt-5 max-w-[610px] text-[16px] font-medium leading-7" style={{ color: '#4A392C' }}>
            {hasEvidence
              ? 'I know where I’d start from what you’ve already shown me. You can see the whole session below, or tell me you want something different.'
              : 'Tell me a time, clinical area, skill or number of cases. Or browse the filters if you want to see the options.'}
          </p>

          {hasEvidence ? (
            <>
              <SessionPlanCard
                plan={plan}
                onStart={startSession}
                onReset={() => applyRequest('')}
                personalised
              />
              {requestForm}
            </>
          ) : (
            <>
              {requestForm}
              <SessionPlanCard
                plan={plan}
                onStart={startSession}
                onReset={() => applyRequest('')}
                personalised={false}
              />
            </>
          )}

          {!user && <div className="mt-4 text-[12px] font-medium" style={{ color: P.muted }}>No account needed to start.</div>}
        </section>

        <footer className="mt-14 flex items-center justify-between border-t pt-5 text-[11px]" style={{ borderColor: P.line, color: P.muted }}>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <span>UKMLA AKT</span>
        </footer>
      </div>

      <PracticeFilterModalParchment
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={startFilteredSession}
      />
    </main>
  );
}

export function LaunchHomePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent /></ConceptStoreProvider>;
}
