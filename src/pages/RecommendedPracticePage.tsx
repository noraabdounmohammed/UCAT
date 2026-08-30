import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

function deterministicJitter(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 1000) / 1000;
}

function conceptPriority(concept: any, now = Date.now()) {
  const md = concept?.mastery_data || {};
  const attempts = Number(md.attempts || 0);
  const incorrect = Number(md.incorrect || 0);
  const lapses = Number(md.fsrs_lapses || 0);
  const masteryLevel = Number(md.mastery_level || 0);
  const coverageNeed = attempts === 0 ? 0.46 : 0;
  const smoothedErrorRate = (incorrect + 1) / (attempts + 2);
  const weakness = attempts > 0 ? smoothedErrorRate * 0.42 : 0;
  const explicitWeakness = masteryLevel === 1 ? 0.16 : 0;
  const dueAt = md.fsrs_due_at ? new Date(md.fsrs_due_at).getTime() : null;
  const isDue = dueAt !== null && Number.isFinite(dueAt) && dueAt <= now;
  const overdueDays = isDue && dueAt !== null ? Math.max(0, (now - dueAt) / 86_400_000) : 0;
  const forgetting = isDue ? 0.22 + Math.min(overdueDays / 60, 0.12) : 0;
  const lapseSignal = Math.min(lapses * 0.025, 0.1);
  const uncertainty = attempts === 0 ? 0.08 : 0.08 / Math.sqrt(attempts + 1);
  const importance = concept?.importance || {};
  const examWeight = Number(importance.exam_weight ?? concept?.exam_weight ?? 0);
  const examBoost = Number.isFinite(examWeight) && examWeight > 0 ? Math.min(examWeight, 5) * 0.025 : 0;
  const safetyBoost = importance.safety_critical === true || concept?.safety_critical === true ? 0.14 : 0;
  const coreBoost = importance.core === true || concept?.core === true ? 0.07 : 0;
  const jitter = deterministicJitter(String(concept?.concept_id || concept?.title || '')) * 0.015;
  return coverageNeed + weakness + explicitWeakness + forgetting + lapseSignal + uncertainty + examBoost + safetyBoost + coreBoost + jitter;
}

function chooseRecommendedConcepts(concepts: any[], count: number) {
  return [...concepts]
    .map(concept => ({ concept, score: conceptPriority(concept) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(count, concepts.length))
    .map(item => item.concept);
}

function QuestionShell() {
  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
      <div className="mx-auto max-w-2xl pt-4 sm:pt-10">
        <div className="flex items-center justify-between">
          <div><div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">Your next question</div><div className="mt-1 text-xs text-[#8A7560]">Chosen from your current learning priorities</div></div>
        </div>
        <div className="mt-6 rounded-[28px] border border-[#E8DCC4] bg-[#FFFDF8] p-7 shadow-[0_18px_50px_rgba(65,43,27,0.05)]">
          <div className="flex gap-2"><span className="rounded-full bg-[#F9E4DF] px-3 py-1 text-[10px] font-medium text-[#8A5148]">UKMLA</span><span className="rounded-full bg-[#F1E7D8] px-3 py-1 text-[10px] font-medium text-[#705E4E]">Recommended</span></div>
          <div className="mt-7 h-6 w-11/12 rounded-full bg-[#EDE1CF]" />
          <div className="mt-3 h-6 w-3/4 rounded-full bg-[#EDE1CF]" />
          <div className="mt-8 grid gap-3"><div className="h-12 rounded-2xl border border-[#E8DCC4]" /><div className="h-12 rounded-2xl border border-[#E8DCC4]" /><div className="h-12 rounded-2xl border border-[#E8DCC4]" /><div className="h-12 rounded-2xl border border-[#E8DCC4]" /></div>
        </div>
        <p className="mt-4 text-sm text-[#8A7560]">StudyEdit is choosing a useful question from your mapped curriculum.</p>
      </div>
    </main>
  );
}

function RecommendedPracticeContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { concepts, isPracticing, practiceQuestions, startPractice, endPractice, updateMastery, practiceError, filterOptions, setPracticeSelection } = useConceptStore() as any;
  const startedRef = useRef(false);

  const startRecommended = useCallback((count: number) => {
    if (!concepts?.length) return;
    const selected = chooseRecommendedConcepts(concepts, count);
    setPracticeSelection(selected.map((concept: any) => concept.concept_id));
    startPractice({ study_mode: 'smart', target_formats: ['ukmla_sba'], question_count: count });
  }, [concepts, setPracticeSelection, startPractice]);

  useEffect(() => {
    if (!user || startedRef.current || !concepts?.length) return;
    startedRef.current = true;
    startRecommended(5);
  }, [user, concepts, startRecommended]);

  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    const question = practiceQuestions.find((q: any) => q.id === questionId);
    if (question?.concept_id) updateMastery(question.concept_id, isCorrect);
  };

  const handleComplete = () => { endPractice(); navigate('/'); };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-md">
          <button onClick={() => navigate('/')} className="mb-8 text-sm text-[#8A7560]">← Back home</button>
          <div className="mb-6"><div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">Recommended practice</div><h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>Sign in, then start with the questions StudyEdit would choose for you.</h1></div>
          <AuthForm />
        </div>
      </main>
    );
  }

  if (practiceError) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#E8DCC4] bg-[#FFFDF8] p-8"><div className="text-sm text-[#8A7560]">We couldn't start your session.</div><p className="mt-2 text-lg">{practiceError}</p><button onClick={() => navigate('/')} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm text-white">Back home</button></div>
      </main>
    );
  }

  if (isPracticing && practiceQuestions?.length > 0) {
    return (
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={handleComplete}
        onAnswerSubmit={handleAnswerSubmit}
        availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
        section="UKMLA AKT"
        currentFormat="ukmla_sba"
        onAnotherFive={() => startRecommended(5)}
      />
    );
  }

  return <QuestionShell />;
}

export function RecommendedPracticePage() {
  const { user } = useAuth();
  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);
  return <ConceptStoreProvider curriculumId={curriculumId}><RecommendedPracticeContent /></ConceptStoreProvider>;
}
