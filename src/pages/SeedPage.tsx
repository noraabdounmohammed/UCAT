import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AtomSeedForm } from '@/components/seed/AtomSeedForm';
import { useSeedAtom } from '@/hooks/useSeedAtom';
import { createSeedRepository } from '@/atom/seedRepository';

export function SeedPage() {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const repo = useMemo(() => createSeedRepository(supabase), []);
  const seed = useSeedAtom({ repo });

  if (!user) return <MainLayout currentPage="seed"><div className="text-center py-12 text-stone-600">Sign in to seed atoms.</div></MainLayout>;
  if (!isCreator) return <MainLayout currentPage="seed"><div className="text-center py-12 max-w-md mx-auto"><div className="text-2xl font-medium text-stone-900 mb-2">Not authorised</div><p className="text-sm text-stone-500">Atom seeding is reserved for clinical creators.</p></div></MainLayout>;

  return (
    <MainLayout currentPage="seed">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Seed an atom</h1>
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
