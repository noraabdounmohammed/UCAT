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

export function AuthForm({ onSuccess }: AuthFormProps = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [capsOn, setCapsOn] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Close modal when user successfully signs in
  useEffect(() => {
    if (user && onSuccess) {
      onSuccess();
    }
  }, [user, onSuccess]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema),
  });

  const getErrorMessage = (error: unknown): string => {
    // Type guard to check if error is an object with a message property
    const hasMessage = (err: unknown): err is { message: string } => 
      typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string';
    
    if (hasMessage(error)) {
      if (error.message.includes('invalid_credentials')) {
        return mode === 'signin' 
          ? 'Invalid email or password. Please check your credentials and try again.'
          : 'Unable to create account. Please try again with different credentials.';
      }
      if (error.message.includes('User already registered')) {
        return 'An account with this email already exists. Please sign in instead.';
      }
      if (error.message.includes('rate') || error.message.includes('429')) {
        return 'Too many attempts. Please wait about a minute, then try again.';
      }
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signup') {
        const signUpData = data as SignUpData;
        // Always send confirmation links to the canonical production domain.
        // The previous `window.location.origin` value was sending users to
        // the legacy `medicu-app.netlify.app` subdomain when they signed up
        // there (and Supabase's Site URL config fallback only kicks in when
        // emailRedirectTo isn't in the Redirect-URLs allow list).
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
        
        // Create profile with default 'consumer' role.
        // (The DB-side `auto_promote_creators` trigger overrides the role
        // for the operator-email allowlist before the row lands.)
        // NOTE: profiles only has `name` (not `first_name`) and no
        // `marketing_consent*` columns — the previous insert was silently
        // failing for every signup, leaving users without a profiles row
        // and breaking useUserRole() / /review.
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: authData.user.email,
              name: signUpData.firstName,
              role: 'consumer',
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't throw - user is created, profile can be fixed later
          }
        }
        
        // If email confirmations are enabled, Supabase won't sign in immediately.
        // Show guidance to check inbox.
        if (!authData.session) {
          setInfo('Account created. Please check your email to confirm your address, then sign in.');
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
      // Reset password field on error
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
    reset();
  };

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    // getModifierState is available on both KeyboardEvent and FocusEvent (React wraps native events)
    // Type guard for safety
    // @ts-ignore - getModifierState exists on the native event
    const isCaps = typeof e.getModifierState === 'function' ? e.getModifierState('CapsLock') : false;
    setCapsOn(!!isCaps);
  };

  return (
    <div className="w-full">
      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-stone-200">
        
        {/* Header */}
        <div className="px-4 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8 text-center">
          <div className="inline-block relative mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800 tracking-tight mb-0" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' }}>
              {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
            </h1>
            <div className="h-[1px] w-12 bg-stone-300 mx-auto mt-3"></div>
          </div>
          <p className="text-sm sm:text-base text-stone-600 tracking-normal px-2" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            {mode === 'signin' 
              ? 'Sign in to continue your learning journey' 
              : 'Create an account to start learning'}
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-8 pt-6 pb-6 space-y-4">
            {info && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-sm text-emerald-700" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                  {info}
                </div>
              </div>
            )}
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-sm text-red-700" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {/* First Name Field - Only for Sign Up */}
            {mode === 'signup' && (
              <div className="space-y-2 pt-2">
                <label htmlFor="firstName" className="block text-xs uppercase tracking-widest text-stone-600" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  {...register('firstName')}
                  className={`w-full px-4 py-3 bg-stone-50/80 border rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-stone-50 transition-all autofill:bg-stone-50 autofill:text-stone-900 ${
                    (errors as any).firstName 
                      ? 'border-red-300 focus:border-red-400' 
                      : 'border-stone-200'
                  }`}
                  style={{ 
                    fontFamily: "'Manrope', sans-serif", 
                    fontWeight: 300,
                    WebkitBoxShadow: '0 0 0 1000px rgb(245 245 244) inset',
                    WebkitTextFillColor: 'rgb(28 25 23)'
                  }}
                />
                {(errors as any).firstName && (
                  <p className="text-sm text-red-600 flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {(errors as any).firstName.message}
                  </p>
                )}
              </div>
            )}
            
            {/* Email Field */}
            <div className="space-y-2 pt-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-widest text-stone-600" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-3 bg-stone-50/80 border rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-stone-50 transition-all autofill:bg-stone-50 autofill:text-stone-900 ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-400' 
                    : 'border-stone-200'
                }`}
                style={{ 
                  fontFamily: "'Manrope', sans-serif", 
                  fontWeight: 300,
                  WebkitBoxShadow: '0 0 0 1000px rgb(245 245 244) inset',
                  WebkitTextFillColor: 'rgb(28 25 23)'
                }}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs uppercase tracking-widest text-stone-600" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const email = (document.getElementById('email') as HTMLInputElement)?.value;
                      if (!email) {
                        alert('Please enter your email address first');
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: 'https://studyedit.com/reset-password',
                        });
                        if (error) throw error;
                        alert('Password reset email sent! Check your inbox.');
                      } catch (error: any) {
                        alert(error.message || 'Failed to send reset email');
                      }
                    }}
                    className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                {...register('password')}
                className={`w-full px-4 py-3 bg-stone-50/80 border rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-stone-50 transition-all autofill:bg-stone-50 autofill:text-stone-900 ${
                  errors.password 
                    ? 'border-red-300 focus:border-red-400' 
                    : 'border-stone-200'
                }`}
                style={{ 
                  fontFamily: "'Manrope', sans-serif", 
                  fontWeight: 300,
                  WebkitBoxShadow: '0 0 0 1000px rgb(245 245 244) inset',
                  WebkitTextFillColor: 'rgb(28 25 23)'
                }}
                onKeyDown={handlePasswordKeyEvent}
                onKeyUp={handlePasswordKeyEvent}
                onFocus={handlePasswordKeyEvent}
                onBlur={() => setCapsOn(false)}
              />
              {capsOn && (
                <p className="text-sm text-amber-600 flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Caps Lock is ON
                </p>
              )}
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>
            
            {/* Terms & Marketing Consent - Only for Sign Up */}
            {mode === 'signup' && (
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="mt-0.5 w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-500 accent-stone-900"
                  />
                  <span className="text-xs text-stone-600 leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                    I agree to the <a href="/terms" target="_blank" className="underline hover:text-stone-900">Terms of Service</a>, <a href="/privacy" target="_blank" className="underline hover:text-stone-900">Privacy Policy</a>, and to receive updates and promotions via email. You can unsubscribe at any time.
                  </span>
                </label>
                {(errors as any).termsAccepted && (
                  <p className="text-sm text-red-600 flex items-center gap-1 ml-7" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {(errors as any).termsAccepted.message}
                  </p>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full py-3.5 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white rounded-full transition-all flex items-center justify-center gap-2 mt-6 text-xs uppercase tracking-widest"
              disabled={isLoading}
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            
            {/* Toggle Mode */}
            <button
              type="button"
              className="w-full py-3 text-stone-600 hover:text-stone-900 text-sm transition-colors"
              onClick={toggleMode}
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              {mode === 'signin' 
                ? "Don't have an account? Create one" 
                : 'Already have an account? Sign in'}
            </button>
        </form>
      </div>
    </div>
  );
}