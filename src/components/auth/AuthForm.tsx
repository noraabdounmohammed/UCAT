import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import './apple-auth-styles.css';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

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
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (signUpError) throw signUpError;
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

  return (
    <div className="apple-auth-background">
      <div className="apple-auth-container">
        <div className="apple-auth-header">
          <h1 className="apple-auth-title">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="apple-auth-description">
            {mode === 'signin' 
              ? 'Sign in with your email to continue' 
              : 'Create an account to get started'}
          </p>
        </div>
        <div className="apple-auth-content">
        
        <form onSubmit={handleSubmit(onSubmit)} className="apple-auth-form">
          {error && (
            <div className="apple-auth-alert">
              <div className="apple-auth-alert-text">
                <AlertCircle className="h-4 w-4" style={{ display: 'inline', marginRight: '6px' }} />
                {error}
              </div>
            </div>
          )}
          
          <div className="apple-auth-field">
            <label htmlFor="email" className="apple-auth-label">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className={`apple-auth-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && (
              <p className="apple-auth-error">{errors.email.message}</p>
            )}
          </div>
          
          <div className="apple-auth-field">
            <label htmlFor="password" className="apple-auth-label">Password</label>
            <input
              id="password"
              type="password"
              placeholder={mode === 'signup' ? 'Min. 6 characters' : ''}
              {...register('password')}
              className={`apple-auth-input ${errors.password ? 'error' : ''}`}
            />
            {errors.password && (
              <p className="apple-auth-error">{errors.password.message}</p>
            )}
          </div>
          
          <button 
            type="submit" 
            className="apple-auth-button"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 apple-auth-spinner" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
          
          <button
            type="button"
            className="apple-auth-link"
            onClick={toggleMode}
          >
            {mode === 'signin' 
              ? "Don't have an account? Create one" 
              : 'Already have an account? Sign in'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}