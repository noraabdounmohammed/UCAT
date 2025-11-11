import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { userRole } = useAuth();
  
  return {
    isCreator: userRole === 'creator',
    isConsumer: userRole === 'consumer',
    role: userRole
  };
};
