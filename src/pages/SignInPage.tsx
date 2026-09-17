import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { migrateLegacyCurriculumState } from '@/utils/curriculumScope';
import { getUserCurriculumId } from '@/utils/curriculumScope';
import { ProgressSyncService } from '@/services/progressSync';

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const reason = searchParams.get('reason');
  const requestedMode = searchParams.get('mode');
  const requestedNext = searchParams.get('next') || '/';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const finishSignIn = async () => {
      migrateLegacyCurriculumState(user.id);
      await ProgressSyncService.migrateFromLocalStorage(user.id, getUserCurriculumId(user.id));
      if (active) navigate(next, { replace: true });
    };
    void finishSignIn();
    return () => { active = false; };
  }, [navigate, next, user?.id]);

  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-8 text-[#2A1E16] sm:py-12">
      <div className="mx-auto w-full max-w-[460px]">
        <button onClick={() => reason === 'save' ? navigate(next, { replace: true }) : navigate(-1)} className="text-[13px] font-semibold text-[#746354]">← Back</button>
        <div className="mt-10 text-[19px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
        <h1 className="mt-10 text-[36px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#1F140C]">
          {reason === 'save' ? 'Keep your tutor’s memory.' : 'Pick up where you left off.'}
        </h1>
        <p className="mt-4 text-[15px] font-medium leading-6 text-[#8A7560]">
          {reason === 'save'
            ? 'Create an account or sign in and I’ll attach the session you just finished to your learning history, so I know where to start next time.'
            : 'Sign in so StudyEdit can use the learning history attached to your account.'}
        </p>
        <div className="mt-8"><AuthForm initialMode={requestedMode === 'signup' || reason === 'save' ? 'signup' : 'signin'} emailRedirectPath={next} /></div>
      </div>
    </main>
  );
}
