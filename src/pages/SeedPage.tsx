import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { AtomSeedForm } from '@/components/seed/AtomSeedForm';
import { useSeedAtom } from '@/hooks/useSeedAtom';
import { createSeedRepository } from '@/atom/seedRepository';

export function SeedPage() {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const repo = useMemo(() => createSeedRepository(supabase), []);
  const seed = useSeedAtom({ repo });

  if (!user) return (
    <MainLayout currentPage="seed">
      <AuthGate title="Sign in to add questions" subtitle="Add new UKMLA questions to the review queue." />
    </MainLayout>
  );
  if (!isCreator) return <MainLayout currentPage="seed"><div className="text-center py-12 max-w-md mx-auto"><div className="text-2xl font-medium text-stone-900 dark:text-stone-100 mb-2">Not authorised</div><p className="text-sm text-stone-500 dark:text-stone-400">Adding questions is reserved for clinical creators.</p></div></MainLayout>;

  return (
    <MainLayout currentPage="seed">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Add a question</h1>
        <AtomSeedForm
          onSubmit={(input) => seed.submit(input)}
          status={seed.status}
          errorMessage={seed.errorMessage}
          onReset={seed.reset}
          lastAtomId={seed.lastAtomId}
        />
      </div>
    </MainLayout>
  );
}
