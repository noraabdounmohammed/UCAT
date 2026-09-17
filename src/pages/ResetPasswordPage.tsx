import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirmPassword) return setError('The passwords do not match.');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'This reset link may have expired. Request a new one and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="text-[19px] font-extrabold tracking-[-0.03em] text-[#1F140C]">studyedit.</div>
        <h1 className="mt-12 text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#1F140C]">Choose a new password.</h1>
        {complete ? (
          <section className="mt-8 rounded-[20px] border border-[#C8D5BC] bg-[#EEF3E9] p-5">
            <div className="flex items-center gap-2 font-semibold text-[#526245]"><CheckCircle2 className="h-5 w-5" /> Password updated</div>
            <Link to="/signin" className="mt-5 inline-flex rounded-full bg-[#1F140C] px-5 py-3 text-sm font-semibold text-[#FAF5EC]">Continue to sign in</Link>
          </section>
        ) : (
          <form onSubmit={updatePassword} className="mt-8 space-y-5 border-t border-[#E8DCC4] pt-7">
            {error && <div role="alert" className="flex gap-2 rounded-[16px] border border-[#E5B9B1] bg-[#F9E4DF] px-4 py-3 text-sm text-[#8A433A]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1F140C] px-5 py-4 text-sm font-semibold text-[#FAF5EC] disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password</button>
            <p className="text-center text-xs text-[#746354]">If the link has expired, return to <Link to="/signin" className="underline underline-offset-4">sign in</Link> and request another.</p>
          </form>
        )}
      </div>
    </main>
  );
}

function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return <div><label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#746354]">{label}</label><input id={id} type="password" value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} className="w-full rounded-[18px] border border-[#D9CCB6] bg-[#F4ECDF] px-4 py-4 text-[16px] text-[#2A1E16] outline-none focus:border-[#8FA379] focus:ring-2 focus:ring-[#8FA379]/30" /></div>;
}

