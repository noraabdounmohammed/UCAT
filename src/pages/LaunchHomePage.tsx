import React, { useMemo } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';

const palette = {
  cream: '#FAF5EC',
  parchment: '#F4ECDF',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  line: '#E8DCC4',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function HomeContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      total: all.length,
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

  const openPractice = () => navigate('/concept-practice');
  const openCustomPractice = () => navigate('/concept-practice?custom=1');

  return (
    <main className="min-h-screen" style={{ backgroundColor: palette.cream, color: palette.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between border-b pb-5" style={{ borderColor: palette.line }}>
          <div>
            <div className="text-xl font-semibold tracking-tight" style={{ color: palette.espresso }}>StudyEdit</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: palette.muted }}>UKMLA AKT</div>
          </div>
          <button
            onClick={openCustomPractice}
            className="rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5"
            style={{ borderColor: palette.line, color: palette.ink }}
          >
            Practice
          </button>
        </header>

        <section className="pt-10 sm:pt-14">
          <p className="text-sm" style={{ color: palette.muted }}>{getGreeting()}{firstName ? `, ${firstName}` : ''}.</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-light leading-tight tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Here’s what will move you closer to the UKMLA today.
          </h1>
        </section>

        <section className="mt-10 rounded-[28px] border p-6 sm:p-8" style={{ borderColor: palette.line, backgroundColor: '#FFFDF8' }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: palette.muted }}>Your preparation</div>
          <div className="mt-6 grid grid-cols-3 divide-x" style={{ borderColor: palette.line }}>
            <Metric label="Tested coverage" value={isLoading ? '—' : `${preparation.coverage}%`} detail="of mapped concepts" />
            <Metric label="Retrieval" value={isLoading ? '—' : `${preparation.retrieval}%`} detail="across attempts" />
            <Metric label="Priority gaps" value={isLoading ? '—' : String(preparation.weakCount)} detail="currently weak" />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[30px] p-7 sm:p-9" style={{ backgroundColor: palette.blushSoft }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>Your next best session</div>
          <div className="mt-4 grid gap-8 md:grid-cols-[1.4fr_0.8fr] md:items-end">
            <div>
              <h2 className="text-3xl font-light tracking-[-0.03em] sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>
                Focus on what will move the needle.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: '#6F4B45' }}>
                StudyEdit will mix concepts due for retrieval, weak areas and under-tested territory using your current learning history.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <Pill>{preparation.dueCount} due</Pill>
                <Pill>{preparation.weakCount} weak</Pill>
                <Pill>{preparation.unseenCount} untested</Pill>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <button
                onClick={openPractice}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-white transition hover:-translate-y-0.5 md:w-auto"
                style={{ backgroundColor: palette.espresso }}
              >
                Start recommended session <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={openCustomPractice} className="inline-flex items-center justify-center gap-2 text-sm" style={{ color: '#7F514A' }}>
                <SlidersHorizontal className="h-4 w-4" /> Practise your way
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: palette.muted }}>Where you’re most exposed</div>
              <h2 className="mt-2 text-2xl font-light" style={{ fontFamily: "'Fraunces', serif" }}>Your clearest current gaps</h2>
            </div>
          </div>

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
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: palette.blushSoft, color: '#8A433A' }}>High priority</span>
                </div>
              );
            }) : (
              <div className="py-7 text-sm" style={{ color: palette.muted }}>
                {isLoading ? 'Building your preparation picture…' : 'No weak concepts yet. Start a session so StudyEdit can learn where you need the most help.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0 sm:px-7">
      <div className="text-xs" style={{ color: palette.muted }}>{label}</div>
      <div className="mt-2 text-3xl font-light tracking-tight sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>{value}</div>
      <div className="mt-1 text-[11px] sm:text-xs" style={{ color: palette.muted }}>{detail}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border px-3 py-1.5" style={{ borderColor: '#E5B9B1', backgroundColor: 'rgba(255,255,255,0.45)', color: '#704C46' }}>{children}</span>;
}

export function LaunchHomePage() {
  return (
    <ConceptStoreProvider curriculumId="default">
      <HomeContent />
    </ConceptStoreProvider>
  );
}
