import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  firstName: z.string().min(1, 'Please enter your first name'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service to continue' }) }),
});

type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>;
type FormData = SignInData | SignUpData;

interface AuthFormProps {
  onSuccess?: () => void;
}

const T = {
  cream: '#FAF5EC',
  parchment: '#F4ECDF',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#D9CCB6',
  lineSoft: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
};

export function AuthForm({ onSuccess }: AuthFormProps = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [capsOn, setCapsOn] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user && onSuccess) onSuccess();
  }, [user, onSuccess]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema),
  });

  const getErrorMessage = (authError: unknown): string => {
    const hasMessage = (err: unknown): err is { message: string } =>
      typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string';

    if (hasMessage(authError)) {
      if (authError.message.includes('invalid_credentials')) {
        return mode === 'signin'
          ? 'Invalid email or password. Please check your details and try again.'
          : 'Unable to create your account. Please try again.';
      }
      if (authError.message.includes('User already registered')) {
        return 'An account with this email already exists. Sign in instead.';
      }
      if (authError.message.includes('rate') || authError.message.includes('429')) {
        return 'Too many attempts. Please wait a minute, then try again.';
      }
      return authError.message;
    }
    return 'Something went wrong. Please try again.';
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signup') {
        const signUpData = data as SignUpData;
        const SITE_URL = 'https://studyedit.com';
        const { error: signUpError, data: authData } = await supabase.auth.signUp({
          email: signUpData.email,
          password: signUpData.password,
          options: {
            emailRedirectTo: SITE_URL,
            data: {
              first_name: signUpData.firstName,
              marketing_consent: true,
            }
          }
        });
        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: authData.user.email,
              name: signUpData.firstName,
              role: 'consumer',
            });

          if (profileError) console.error('Error creating profile:', profileError);
        }

        if (!authData.session) {
          setInfo('Account created. Check your email to confirm your address, then sign in.');
        }
      } else {
        const signInData = data as SignInData;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: signInData.email,
          password: signInData.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(getErrorMessage(err));
      if (mode === 'signup') {
        const signUpData = data as SignUpData;
        reset({ firstName: signUpData.firstName, email: signUpData.email, password: '' });
      } else {
        const signInData = data as SignInData;
        reset({ email: signInData.email, password: '' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setInfo(null);
    reset();
  };

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    // @ts-ignore - React's wrapped event exposes getModifierState here.
    const isCaps = typeof e.getModifierState === 'function' ? e.getModifierState('CapsLock') : false;
    setCapsOn(!!isCaps);
  };

  const fieldClass = (hasError: boolean) =>
    `w-full rounded-[18px] border px-4 py-4 text-[15px] outline-none transition-all placeholder:text-[#A79480] focus:bg-[#FFFDF8] ${hasError ? 'border-[#D58E82]' : 'border-[#D9CCB6]'}`;

  return (
    <div className="w-full" style={{ color: T.ink }}>
      <div className="border-t pt-7" style={{ borderColor: T.lineSoft }}>
        <div className="mb-7">
          <div className="text-[10px] font-medium uppercase tracking-[0.24em]" style={{ color: T.muted }}>
            {mode === 'signin' ? 'Your account' : 'Create your account'}
          </div>
          <h2
            className="mt-2 text-[34px] font-light leading-[1.05] tracking-[-0.03em]"
            style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}
          >
            {mode === 'signin' ? (
              <>Welcome <em className="font-normal" style={{ color: T.blush }}>back.</em></>
            ) : (
              <>Start <em className="font-normal" style={{ color: T.blush }}>here.</em></>
            )}
          </h2>
          <p className="mt-2 text-[14px] leading-6" style={{ color: T.muted }}>
            {mode === 'signin'
              ? 'Pick up where you left off.'
              : 'One account keeps your StudyEdit learning history together.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {info && (
            <div className="rounded-[16px] border px-4 py-3 text-sm leading-5" style={{ backgroundColor: '#EEF3E9', borderColor: '#C8D5BC', color: '#526245' }}>
              {info}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-[16px] border px-4 py-3 text-sm leading-5" style={{ backgroundColor: T.blushSoft, borderColor: '#E5B9B1', color: '#8A433A' }}>
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="firstName" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: T.muted }}>
                First name
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Your first name"
                {...register('firstName')}
                className={fieldClass(!!(errors as any).firstName)}
                style={{ backgroundColor: T.parchment, color: T.ink }}
              />
              {(errors as any).firstName && (
                <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#A45146' }}>
                  <AlertCircle className="h-3.5 w-3.5" /> {(errors as any).firstName.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: T.muted }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              className={fieldClass(!!errors.email)}
              style={{ backgroundColor: T.parchment, color: T.ink }}
            />
            {errors.email && (
              <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#A45146' }}>
                <AlertCircle className="h-3.5 w-3.5" /> {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="password" className="block text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: T.muted }}>
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={async () => {
                    const email = (document.getElementById('email') as HTMLInputElement)?.value;
                    if (!email) {
                      setError('Enter your email address first, then choose Forgot password.');
                      return;
                    }
                    try {
                      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: 'https://studyedit.com/reset-password',
                      });
                      if (resetError) throw resetError;
                      setError(null);
                      setInfo('Password reset email sent. Check your inbox.');
                    } catch (resetError) {
                      setError(getErrorMessage(resetError));
                    }
                  }}
                  className="text-xs underline decoration-[#D9CCB6] underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: T.muted }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              {...register('password')}
              className={fieldClass(!!errors.password)}
              style={{ backgroundColor: T.parchment, color: T.ink }}
              onKeyDown={handlePasswordKeyEvent}
              onKeyUp={handlePasswordKeyEvent}
              onFocus={handlePasswordKeyEvent}
              onBlur={() => setCapsOn(false)}
            />
            {capsOn && <p className="mt-2 text-xs" style={{ color: T.muted }}>Caps Lock is on.</p>}
            {errors.password && (
              <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#A45146' }}>
                <AlertCircle className="h-3.5 w-3.5" /> {errors.password.message}
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <div className="pt-1">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  {...register('termsAccepted')}
                  className="mt-1 h-4 w-4 rounded accent-[#1F140C]"
                />
                <span className="text-[12px] leading-[1.55]" style={{ color: T.muted }}>
                  I agree to the <a href="/terms" target="_blank" className="underline underline-offset-2">Terms of Service</a>, <a href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</a>, and to receive product updates by email. You can unsubscribe at any time.
                </span>
              </label>
              {(errors as any).termsAccepted && (
                <p className="mt-2 ml-7 flex items-center gap-1 text-xs" style={{ color: '#A45146' }}>
                  <AlertCircle className="h-3.5 w-3.5" /> {(errors as any).termsAccepted.message}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-[13px] font-medium transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            style={{ backgroundColor: T.espresso, color: T.cream }}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="pt-1 text-center text-[13px]" style={{ color: T.muted }}>
            {mode === 'signin' ? 'New to StudyEdit?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium underline decoration-[#D9CCB6] underline-offset-4"
              style={{ color: T.espresso }}
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
