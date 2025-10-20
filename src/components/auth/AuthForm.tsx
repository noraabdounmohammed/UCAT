import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

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
    resolver: zodResolver(formSchema),
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
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (signUpError) throw signUpError;
        // If email confirmations are enabled, Supabase won't sign in immediately.
        // Show guidance to check inbox.
        if (!signUpData.session) {
          setInfo('Account created. Please check your email to confirm your address, then sign in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(getErrorMessage(err));
      // Reset password field on error
      reset({ email: data.email, password: '' });
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
    <div className="w-full max-w-md mx-4">
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 h-10 flex items-center justify-center">
            {mode === 'signin' 
              ? 'Sign in to continue your learning journey' 
              : 'Create an account to start learning'}
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-4">
            {info && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-sm text-emerald-400 font-medium">
                  {info}
                </div>
              </div>
            )}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div className="space-y-2 pt-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.email 
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-900/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/50'
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                {...register('password')}
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.password 
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-900/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/50'
                }`}
                onKeyDown={handlePasswordKeyEvent}
                onKeyUp={handlePasswordKeyEvent}
                onFocus={handlePasswordKeyEvent}
                onBlur={() => setCapsOn(false)}
              />
              {capsOn && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Caps Lock is ON
                </p>
              )}
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-6"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            
            {/* Toggle Mode */}
            <button
              type="button"
              className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              onClick={toggleMode}
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