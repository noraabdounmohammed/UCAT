import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const contactEmail = 'nora@studyedit.com';
const P = { cream: '#FAF5EC', paper: '#FFFDF8', espresso: '#1F140C', ink: '#2A1E16', muted: '#746354', line: '#E8DCC4', blush: '#F9E4DF' };

export function TermsOfService() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: P.cream, color: P.ink }}>
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: P.line }}>
          <div><div className="text-xl font-semibold tracking-tight" style={{ color: P.espresso }}>StudyEdit</div><div className="mt-1 text-xs uppercase tracking-[0.2em]" style={{ color: P.muted }}>Terms of service</div></div>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm" style={{ borderColor: P.line, backgroundColor: P.paper }}><ArrowLeft className="h-4 w-4" /> Home</Link>
        </header>

        <section className="pt-10 sm:pt-14">
          <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>The terms, in plain English.</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7">StudyEdit is a learning and exam-preparation service. These terms explain the boundaries that keep it useful and safe.</p>
          <p className="mt-3 text-xs" style={{ color: P.muted }}>Last updated 15 September 2026</p>
        </section>

        <section className="mt-10 rounded-[28px] p-7 sm:p-9" style={{ backgroundColor: P.blush }}>
          <h2 className="text-3xl font-light tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif", color: P.espresso }}>StudyEdit supports learning. It does not replace clinical judgement.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: '#6F4B45' }}>Do not use StudyEdit to make decisions about a real patient or delay seeking qualified medical advice.</p>
        </section>

        <div className="mt-6 space-y-4">
          <Term title="1. Using StudyEdit">You may use StudyEdit for personal study and exam preparation. You must not use it to provide patient-specific medical advice, probe or disrupt the service, bypass limits, scrape content at scale, or use another person’s account.</Term>
          <Term title="2. Accounts and learning history">Keep your sign-in details secure and provide accurate account information. You can study as a guest, but an account is required to retain learning history across supported devices. Our <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link> explains how that data is handled.</Term>
          <Term title="3. Medical and AI-generated content">Questions and tutoring may include AI-assisted content and can contain errors or omissions. StudyEdit applies quality controls, but does not guarantee that every item is complete, current or suitable for a particular examination. Check current authoritative guidance when accuracy matters and report questionable items using the in-app control.</Term>
          <Term title="4. Availability and changes">The service may change as the product is improved and may occasionally be unavailable. We may restrict access where needed to protect learners, clinical-content integrity, security or service capacity.</Term>
          <Term title="5. Intellectual property">StudyEdit’s interface, original questions, explanations and branding are protected content. Your own messages and materials remain yours; you give StudyEdit permission to process them only as needed to operate and improve the service.</Term>
          <Term title="6. Responsibility">To the extent permitted by law, StudyEdit is not responsible for clinical decisions, examination outcomes, or indirect losses arising from reliance on the service. Nothing in these terms excludes rights or liabilities that cannot lawfully be excluded.</Term>
          <Term title="7. Ending use">You may stop using StudyEdit at any time and request account deletion. We may suspend accounts that misuse the service or create a safety or security risk.</Term>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t py-5 text-xs" style={{ borderColor: P.line, color: P.muted }}>
          <span>Questions about these terms?</span>
          <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-1.5 font-medium" style={{ color: P.ink }}>Contact StudyEdit <ExternalLink className="h-3.5 w-3.5" /></a>
        </footer>
      </div>
    </main>
  );
}

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[22px] border p-6 sm:p-7" style={{ borderColor: P.line, backgroundColor: P.paper }}><h2 className="text-xl font-semibold" style={{ color: P.espresso }}>{title}</h2><div className="mt-3 text-sm leading-7" style={{ color: P.muted }}>{children}</div></section>;
}

