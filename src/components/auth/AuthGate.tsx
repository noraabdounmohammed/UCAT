import { AuthForm } from './AuthForm';

interface AuthGateProps {
  /** Heading shown above the sign-in form, e.g. "Sign in to study". */
  title: string;
  /** Sub-heading copy explaining what the user is about to access. */
  subtitle?: string;
}

/**
 * Drop-in unauthenticated gate for any route that requires a signed-in user.
 * Renders the project-standard `<AuthForm />` inline so the user can sign in
 * without bouncing to a separate page.
 */
export function AuthGate({ title, subtitle }: AuthGateProps) {
  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
        )}
      </header>
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-6">
        <AuthForm />
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400 text-center mt-2">
        Made by a UK doctor. Every atom signed off by clinician.
      </p>
    </div>
  );
}
