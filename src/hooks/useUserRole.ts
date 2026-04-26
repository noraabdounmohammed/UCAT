import { useAuth } from '@/contexts/AuthContext';

/**
 * Reads `profiles.is_creator` for the auth'd user. As of Plan 12, RLS
 * policies on atoms + atom_variants also enforce this via the DB-level
 * `is_creator(uid)` function — the React-side check is defence-in-depth,
 * not the sole gate. A malicious authed user can no longer bypass the
 * frontend to mutate atoms via direct REST calls.
 */
export const useUserRole = () => {
  const { userRole } = useAuth();

  return {
    isCreator: userRole === 'creator',
    isConsumer: userRole === 'consumer',
    role: userRole
  };
};
