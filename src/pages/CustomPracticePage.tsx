import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { ConceptPracticePageLoft } from '@/pages/ConceptPracticePage.loft';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

export function CustomPracticePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const curriculumId = useMemo(() => {
    if (user?.id) migrateLegacyCurriculumState(user.id);
    return getUserCurriculumId(user?.id);
  }, [user?.id]);

  if (user) return <ConceptPracticePageLoft curriculumId={curriculumId} />;

  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate('/')} className="mb-8 text-sm text-[#8A7560]">← Back home</button>
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8A7560]">Practise your way</div>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>
            Sign in so your practice can shape what StudyEdit recommends next.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#8A7560]">
            Your answers update the same learner model used by Recommended Sessions on this device.
          </p>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}
