import React, { useState } from 'react';
import { LogIn, User, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserProfile } from '@/components/auth/UserProfile';

export const AuthBar: React.FC = () => {
  const { user, loading } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    navigate('/concept-practice');
  };

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <div className="text-xs text-stone-400 hidden md:block" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>Loading...</div>
      ) : user ? (
        <>
          {/* Upgrade button — only shown to free users */}
          {!subLoading && !isPremium && (
            <button
              onClick={() => navigate('/pricing')}
              className="px-3 py-1.5 text-xs tracking-wide rounded-full bg-stone-900 text-white hover:bg-stone-700 flex items-center gap-1.5 transition-all font-semibold"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              <Zap className="h-3 w-3" />
              <span className="hidden md:inline">Upgrade</span>
            </button>
          )}
          <button
            onClick={() => setShowProfile(true)}
            className="p-2 md:px-4 md:py-2 text-xs tracking-wide rounded-full bg-stone-100 text-stone-800 hover:bg-stone-200 flex items-center gap-1.5 transition-all"
            title={user.email?.split('@')[0] || "View profile"}
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
          >
            <User className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">{user.email?.split('@')[0]}</span>
          </button>
        </>
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
