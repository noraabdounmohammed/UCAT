import { MainLayout } from '@/components/layout/MainLayout';

/**
 * Privacy & cookies disclosure.
 *
 * Tailwind's `prose` class is intentionally NOT used here because the project
 * doesn't ship `@tailwindcss/typography`. We hand-style the article instead so
 * spacing and link colours stay consistent with the rest of the app.
 */
export function PrivacyPolicy() {
  return (
    <MainLayout currentPage="dashboard">
      <article className="max-w-2xl mx-auto py-8 px-4 text-stone-800 dark:text-stone-200">
        <h1 className="text-2xl font-semibold mb-2">Privacy &amp; cookies</h1>
        <p className="text-sm text-stone-500 mb-6">Last updated 2026-04-26.</p>

        <h2 className="text-lg font-semibold mt-6 mb-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Your email + name when you sign up (Supabase Auth).</li>
          <li>Your atom-rating history — stored in Supabase to power FSRS-5 spaced repetition.</li>
          <li>Aggregate session telemetry (PostHog, optional — see below).</li>
          <li>Error reports when something crashes (Sentry, optional — see below).</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">What we do NOT collect</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Your real name beyond what you choose to share.</li>
          <li>Any health data you didn&apos;t deliberately enter (we&apos;re an exam-prep app, not a medical record).</li>
          <li>Your location, IP geolocation profile, or device fingerprint beyond Supabase Auth defaults.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">Telemetry — opt-out friendly</h2>
        <p className="text-sm">
          PostHog (product analytics) and Sentry (error reporting) only initialise after you accept
          the cookie banner. If you decline, no behavioural events are sent and no error reports
          leave your device. The app works identically either way.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Made by a doctor</h2>
        <p className="text-sm">
          Built by Nora Mohammed, MD. Every atom of clinical content is signed off by a clinician
          before it reaches the live bank. If you spot a clinical error, email{' '}
          <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">nora@studyedit.com</code>.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Data deletion</h2>
        <p className="text-sm">
          Email{' '}
          <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">nora@studyedit.com</code>{' '}
          with the subject &quot;delete my account&quot; and we&apos;ll wipe your auth row, FSRS state,
          review events, and mock attempts within 7 days.
        </p>
      </article>
    </MainLayout>
  );
}
