import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const contactEmail = 'nora@studyedit.com';

const palette = {
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  blushSoft: '#F9E4DF',
  line: '#E8DCC4',
  paper: '#FFFDF8',
};

export function PrivacyPolicy() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: palette.cream, color: palette.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: palette.line }}>
          <div>
            <div className="text-xl font-semibold tracking-tight" style={{ color: palette.espresso }}>StudyEdit</div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: palette.muted }}>Privacy &amp; data</div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5"
            style={{ borderColor: palette.line, color: palette.ink, backgroundColor: palette.paper }}
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        <section className="pt-10 sm:pt-14">
          <p className="text-sm" style={{ color: palette.muted }}>Your information.</p>
          <h1
            className="mt-3 max-w-3xl text-4xl font-light leading-tight tracking-[-0.035em] sm:text-5xl"
            style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}
          >
            Your data, kept simple.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 sm:text-lg">
            StudyEdit only uses the information needed to run your account, personalise your learning and keep the app reliable.
          </p>
          <p className="mt-3 text-xs" style={{ color: palette.muted }}>Last updated 23 August 2026</p>
        </section>

        <section className="mt-10 overflow-hidden rounded-[30px] p-7 sm:p-9" style={{ backgroundColor: palette.blushSoft }}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: '#9C655D' }}>The short version</div>
          <h2 className="mt-4 max-w-2xl text-3xl font-light tracking-[-0.03em] sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>
            Your learning history is used to make StudyEdit more useful to you — not to build an advertising profile.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: '#6F4B45' }}>
            You can use StudyEdit without opting into optional product analytics. If you want your account deleted, you can ask us directly.
          </p>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <PolicyCard number="01" title="What we collect" tag="Account + learning">
            <ul className="space-y-3">
              <li>• Your email and the name you choose to provide when you sign up through Supabase Auth.</li>
              <li>• Your answer and learning history, used to personalise practice and spaced retrieval.</li>
              <li>• Optional aggregate product analytics and crash reports, only after you consent.</li>
            </ul>
          </PolicyCard>

          <PolicyCard number="02" title="What we do not collect" tag="Kept minimal">
            <ul className="space-y-3">
              <li>• Your real name beyond what you choose to share.</li>
              <li>• Health data you did not deliberately enter — StudyEdit is an exam-prep app, not a medical record.</li>
              <li>• A location profile or device fingerprint beyond the defaults of services required to operate the account.</li>
            </ul>
          </PolicyCard>

          <PolicyCard number="03" title="Analytics & cookies" tag="Opt-in only">
            <p>
              Optional product analytics and error reporting only initialise after you accept the cookie banner. If you decline, StudyEdit remains usable without behavioural analytics being sent through those optional tools.
            </p>
          </PolicyCard>

          <PolicyCard number="04" title="Clinical content" tag="Exam preparation">
            <p>
              StudyEdit is designed for learning and exam preparation, not for patient-specific medical advice. We use quality checks to reduce errors, but if you spot content that may be wrong or ambiguous, please report it so it can be reviewed.
            </p>
            <a
              href={`mailto:${contactEmail}?subject=Clinical%20content%20feedback`}
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
              style={{ borderColor: palette.line, color: palette.ink, backgroundColor: palette.cream }}
            >
              Report a content issue <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </PolicyCard>

          <PolicyCard number="05" title="Delete your account" tag="Your choice" wide>
            <p>
              Email us with the subject “delete my account” and we will remove the account data we control, including associated learning state and review history, subject to any data we are legally required to retain.
            </p>
            <a
              href={`mailto:${contactEmail}?subject=delete%20my%20account`}
              className="mt-5 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5"
              style={{ backgroundColor: palette.espresso }}
            >
              Request account deletion
            </a>
          </PolicyCard>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t py-5 text-xs" style={{ borderColor: palette.line, color: palette.muted }}>
          <span>Privacy &amp; data</span>
          <a href={`mailto:${contactEmail}`} className="font-medium" style={{ color: palette.ink }}>Contact</a>
        </footer>
      </div>
    </main>
  );
}

function PolicyCard({
  number,
  title,
  tag,
  children,
  wide = false,
}: {
  number: string;
  title: string;
  tag: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`rounded-[28px] border p-6 sm:p-7 ${wide ? 'md:col-span-2' : ''}`}
      style={{ borderColor: palette.line, backgroundColor: palette.paper }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: palette.muted }}>{number}</div>
          <h2 className="mt-2 text-2xl font-light tracking-[-0.025em]" style={{ fontFamily: "'Fraunces', serif", color: palette.espresso }}>{title}</h2>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: palette.blushSoft, color: '#8A433A' }}>{tag}</span>
      </div>
      <div className="mt-5 text-sm leading-6" style={{ color: palette.muted }}>{children}</div>
    </section>
  );
}
