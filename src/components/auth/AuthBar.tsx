import React, { useState } from 'react';
import { LogIn, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserProfile } from '@/components/auth/UserProfile';

export const AuthBar: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const handleAuthSuccess = () => {
    setShowAuth(false);
    // Navigate to curriculum hub after successful sign-in
    navigate('/concept-practice');
  };

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <div className="text-xs text-stone-400" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>Loading...</div>
      ) : user ? (
        <button
          onClick={() => setShowProfile(true)}
          className="px-4 py-2 text-xs tracking-wide rounded-full bg-stone-800 text-white hover:bg-stone-900 flex items-center gap-1.5 transition-all"
          title="View profile"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
        >
          <User className="h-3.5 w-3.5" />
          {user.email?.split('@')[0]}
        </button>
      ) : (
        <button
          onClick={() => setShowAuth(true)}
          className="px-4 py-2 text-xs tracking-wide rounded-full bg-stone-800 text-white hover:bg-stone-900 flex items-center gap-1.5 transition-all"
          title="Sign in"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
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
            <AuthForm onSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};
