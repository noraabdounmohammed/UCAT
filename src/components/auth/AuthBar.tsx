import React, { useState } from 'react';
import { LogIn, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserProfile } from '@/components/auth/UserProfile';

export const AuthBar: React.FC = () => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading...</div>
      ) : user ? (
        <button
          onClick={() => setShowProfile(true)}
          className="px-3 py-1.5 text-xs rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors"
          title="View profile"
        >
          <User className="h-3.5 w-3.5" />
          {user.email}
        </button>
      ) : (
        <button
          onClick={() => setShowAuth(true)}
          className="px-3 py-1.5 text-xs rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 transition-colors"
          title="Sign in"
        >
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </button>
      )}

      {showAuth && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAuth(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AuthForm onSuccess={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};
