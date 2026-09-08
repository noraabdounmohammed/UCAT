import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { migrateLegacyCurriculumState } from '@/utils/curriculumScope';

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const reason = searchParams.get('reason');
  const requestedNext = searchParams.get('next') || '/';
  const next = requestedNext.startsWith('/') ? requestedNext : '/';

  useEffect(() => {
    if (!user?.id) return;
    migrateLegacyCurriculumState(user.id);
    navigate(next, { replace: true });
  }, [navigate, next, user?.id]);

  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-8 text-[#2A1E16] sm:py-12">
      <div className="mx-auto w-full max-w-[460px]">
        <button onClick={() => navigate(-1)} className="text-[13px] font-semibold text-[#8A7560]">← Back</button>
        <div className="mt-10 text-[19px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
        <h1 className="mt-10 text-[36px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#1F140C]">
          {reason === 'save' ? 'Keep your tutor’s memory.' : 'Pick up where you left off.'}
        </h1>
        <p className="mt-4 text-[15px] font-medium leading-6 text-[#8A7560]">
          {reason === 'save'
            ? 'Sign in and I’ll attach the session you just finished to your learning history, so I know where to start next time.'
            : 'Sign in so StudyEdit can use the learning history attached to your account.'}
        </p>
        <div className="mt-8"><AuthForm /></div>
      </div>
    </main>
  );
}
