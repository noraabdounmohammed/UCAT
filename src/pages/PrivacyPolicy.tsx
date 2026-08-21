import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';

const contactEmail = 'nora@studyedit.com';

export function PrivacyPolicy() {
  return (
    <MainLayout currentPage="dashboard" hideNav>
      <div className="min-h-[calc(100vh-5rem)] bg-stone-50/70 dark:bg-stone-950">
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link
              to="/"
              aria-label="Back to StudyEdit"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              ←
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">StudyEdit</p>
              <h1 className="truncate text-base font-semibold text-stone-900 dark:text-stone-100">Privacy &amp; data</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
          <div className="mb-7">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-4xl">
              Your data, kept simple.
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-6 text-stone-600 dark:text-stone-400">
              StudyEdit only uses the information needed to run your account, personalise your learning and keep the app reliable.
            </p>
            <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">Last updated 26 April 2026</p>
          </div>

          <div className="space-y-3">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-stone-400">01</p>
                  <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Your data</h3>
                </div>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  Account + learning
                </span>
              </div>

              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">What we collect</p>
              <ul className="mt-2 space-y-2 text-sm leading-5 text-stone-600 dark:text-stone-400">
                <li>• Your email and the name you provide when you sign up through Supabase Auth.</li>
                <li>• Your answer history, used to power FSRS-5 spaced repetition.</li>
                <li>• Optional aggregate product analytics and crash reports, only with your consent.</li>
              </ul>

              <div className="my-4 h-px bg-stone-100 dark:bg-stone-800" />

              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">What we do not collect</p>
              <ul className="mt-2 space-y-2 text-sm leading-5 text-stone-600 dark:text-stone-400">
                <li>• Your real name beyond what you choose to share.</li>
                <li>• Health data you did not deliberately enter — StudyEdit is an exam-prep app, not a medical record.</li>
                <li>• A location profile or device fingerprint beyond Supabase Auth defaults.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-stone-400">02</p>
                  <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Analytics &amp; cookies</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Opt-in only
                </span>
              </div>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                PostHog product analytics and Sentry error reporting only initialise after you accept the cookie banner. If you decline, no behavioural events are sent and no error reports leave your device. StudyEdit works the same either way.
              </p>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
              <div className="mb-3">
                <p className="text-xs font-medium text-stone-400">03</p>
                <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Clinical quality</h3>
              </div>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                StudyEdit was built by Nora Mohammed, MD. Every question is signed off by a clinician before it reaches the live bank.
              </p>
              <a
                href={`mailto:${contactEmail}?subject=Clinical%20content%20feedback`}
                className="mt-4 inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
              >
                Report a clinical error
              </a>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
              <div className="mb-3">
                <p className="text-xs font-medium text-stone-400">04</p>
                <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Delete your account</h3>
              </div>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                Email us with the subject “delete my account” and we will remove your auth row, FSRS state, review events and mock attempts within 7 days.
              </p>
              <a
                href={`mailto:${contactEmail}?subject=delete%20my%20account`}
                className="mt-4 inline-flex items-center rounded-xl bg-stone-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                Request account deletion
              </a>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-200 pt-5 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-500">
            <span>Privacy &amp; cookies</span>
            <a href={`mailto:${contactEmail}`} className="font-medium text-stone-700 hover:underline dark:text-stone-300">
              Contact
            </a>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
