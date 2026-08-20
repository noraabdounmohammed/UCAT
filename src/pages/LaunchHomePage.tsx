import React, { useMemo } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const palette = {
  cream: '#FAF5EC', espresso: '#1F140C', ink: '#2A1E16', muted: '#8A7560',
  blushSoft: '#F9E4DF', line: '#E8DCC4',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts, isLoading } = useConceptStore() as any;

  const firstName = useMemo(() => {
    if (!user) return '';
    const metadataName = user.user_metadata?.first_name || user.user_metadata?.name;
    if (metadataName) return String(metadataName).split(' ')[0];
    const emailPart = user.email?.split('@')[0]?.split('.')[0];
    return emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : '';
  }, [user]);

  const preparation = useMemo(() => {
    const all = concepts || [];
    const now = Date.now();
    const attempted = all.filter((c: any) => (c.mastery_data?.attempts || 0) > 0);
    const correct = attempted.reduce((sum: number, c: any) => sum + (c.mastery_data?.correct || 0), 0);
    const attempts = attempted.reduce((sum: number, c: any) => sum + (c.mastery_data?.attempts || 0), 0);
    const due = all.filter((c: any) => c.mastery_data?.fsrs_due_at && new Date(c.mastery_data.fsrs_due_at).getTime() <= now);
    const weak = all.filter((c: any) => c.mastery_data?.mastery_level === 1);
    const unseen = all.filter((c: any) => (c.mastery_data?.attempts || 0) === 0);

    return {
      hasEvidence: attempts > 0,
      coverage: all.length ? Math.round((attempted.length / all.length) * 100) : 0,
      retrieval: attempts ? Math.round((correct / attempts) * 100) : 0,
      weakCount: weak.length,
      dueCount: due.length,
      unseenCount: unseen.length,
      exposed: [...weak]
        .sort((a: any, b: any) => {
          const aa = a.mastery_data?.attempts || 0;
          const ba = b.mastery_data?.attempts || 0;
          const ar = aa ? (a.mastery_data?.correct || 0) / aa : 1;
          const br = ba ? (b.mastery_data?.correct || 0) / ba : 1;
          return ar - br || ba - aa;
        })
        .slice(0, 3),
    };
  }, [concepts]);

  const openRecommended = () => navigate('/recommended-practice');
  const openCustomPractice = () => navigate('/concept-practice');

  return (
    <main className="min-h-screen" style={{ backgroundColor: palette.cream, color: palette.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: palette.line }}>
          <div>
            <div className="text-xl font-semibold tracking-tight" style={{ color: palette.espresso }}>StudyEdit</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: palette.muted }}>UKMLA AKT</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCustomPractice} className="rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5" style={{ borderColor: palette.line, color: palette.ink }}>
              Practice
            </button>
            {user && (
              <button onClick={() => void signOut()} className="hidden rounded-full px-3 py-2 text-xs sm:block" style={{ color: palette.muted }}>
                Sign out
              </button>
            )}
          </div>
        </header>

        <section className="pt-10 sm:pt-14">
          <p className="text-sm" style={{ color: palette.muted }}>{getGreeting()}{firstName ? `, ${firstName}` : ''}.</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-light leading-tight tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Your UKMLA knowledge, mapped.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 sm:text-lg" style={{ color: palette.ink }}>
            StudyEdit learns what you know, what you’re forgetting, and what is worth practising next.
          </p>
        </section>

        <section className="mt-10 rounded-[28px] border p-6 sm:p-8" style={{ borderColor: palette.line, backgroundColor: '#FFFDF8' }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: palette.muted }}>Your preparation map</div>
          <div className="mt-6 grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0" style={{ borderColor: palette.line }}>
            <Metric label="Tested coverage" value={isLoading ? '—' : `${preparation.coverage}%`} detail="of mapped concepts" />
            <Metric label="Retrieval" value={isLoading || !preparation.hasEvidence ? '—' : `${preparation.retrieval}%`} detail={preparation.hasEvidence ? 'across attempts' : 'not enough evidence yet'} />
            <Metric label="Current gaps" value={isLoading || !preparation.hasEvidence ? '—' : String(preparation.weakCount)} detail={preparation.hasEvidence ? 'need another pass' : 'not enough evidence yet'} />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[30px] p-7 sm:p-9" style={{ backgroundColor: palette.blushSoft }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>
            {preparation.hasEvidence ? 'Why StudyEdit is choosing these next' : 'We’re building your map'}
          </div>
          <div className="mt-4 grid gap-8 md:grid-cols-[1.4fr_0.8fr] md:items-end">
            <div>
              <h2 className="text-3xl font-light tracking-[-0.03em] sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>
                {preparation.hasEvidence ? 'Practise what deserves attention now.' : 'Your first answers teach StudyEdit where to look next.'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: '#6F4B45' }}>
                {preparation.hasEvidence
                  ? 'Your recommended session prioritises concepts that are due for retrieval, showing repeated difficulty, or still need stronger evidence.'
                  : 'StudyEdit starts with under-tested curriculum areas, then adapts as your evidence grows. Every answer makes the next recommendation more informed.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {preparation.hasEvidence && preparation.dueCount > 0 && <Pill>{preparation.dueCount} due for retrieval</Pill>}
                {preparation.hasEvidence && preparation.weakCount > 0 && <Pill>{preparation.weakCount} need another pass</Pill>}
                {preparation.unseenCount > 0 && <Pill>{preparation.unseenCount} untested</Pill>}
              </div>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <button onClick={openRecommended} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 md:w-auto" style={{ backgroundColor: palette.espresso }}>
                Start recommended session <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={openCustomPractice} className="inline-flex items-center justify-center gap-2 text-sm" style={{ color: '#7F514A' }}>
                <SlidersHorizontal className="h-4 w-4" /> Practise your way
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-10">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: palette.muted }}>Where you’re most exposed</div>
          <h2 className="mt-2 text-2xl font-light" style={{ fontFamily: "'Fraunces', serif" }}>Your clearest current gaps</h2>
          <div className="mt-5 divide-y rounded-[24px] border px-5" style={{ borderColor: palette.line, backgroundColor: '#FFFDF8' }}>
            {preparation.exposed.length ? preparation.exposed.map((concept: any) => {
              const attempts = concept.mastery_data?.attempts || 0;
              const correct = concept.mastery_data?.correct || 0;
              const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
              return (
                <div key={concept.concept_id} className="flex items-center justify-between gap-6 py-5" style={{ borderColor: palette.line }}>
                  <div>
                    <div className="font-medium" style={{ color: palette.espresso }}>{concept.title}</div>
                    <div className="mt-1 text-sm" style={{ color: palette.muted }}>{accuracy}% retrieval across {attempts} attempt{attempts === 1 ? '' : 's'}</div>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: palette.blushSoft, color: '#8A433A' }}>Needs another pass</span>
                </div>
              );
            }) : (
              <div className="py-7 text-sm" style={{ color: palette.muted }}>{isLoading ? 'Building your preparation picture…' : 'No clear gaps yet. Start a session so StudyEdit can gather enough evidence to find them.'}</div>
            )}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t py-5 text-xs" style={{ borderColor: palette.line, color: palette.muted }}>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          {user && <button className="sm:hidden" onClick={() => void signOut()}>Sign out</button>}
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="py-5 first:pt-0 last:pb-0 sm:px-7 sm:py-0 sm:first:pl-0 sm:last:pr-0"><div className="text-xs" style={{ color: palette.muted }}>{label}</div><div className="mt-2 text-3xl font-light tracking-tight sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>{value}</div><div className="mt-1 text-[11px] sm:text-xs" style={{ color: palette.muted }}>{detail}</div></div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border px-3 py-1.5" style={{ borderColor: '#E5B9B1', backgroundColor: 'rgba(255,255,255,0.45)', color: '#704C46' }}>{children}</span>;
}

export function LaunchHomePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent /></ConceptStoreProvider>;
}
