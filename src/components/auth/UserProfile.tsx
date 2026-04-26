import React from 'react';
import { User, Mail, Calendar, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      onClose();
      // Redirect to home page after sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
      alert('Failed to sign out. Please try again.');
    }
  };

  if (!user) return null;

  const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-black/[0.08] shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-10 pb-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 flex items-center justify-center w-8 h-8 hover:bg-stone-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-stone-400" />
          </button>
          <div className="w-20 h-20 rounded-full bg-stone-800/90 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
            <User className="h-10 w-10 text-white" />
          </div>
          <div className="inline-block relative mb-4">
            <h2 className="text-3xl font-bold text-stone-800 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' }}>
              Your Profile
            </h2>
            <div className="h-[1px] w-12 bg-stone-300 mx-auto mt-3"></div>
          </div>
          <p className="text-sm text-stone-600" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            Account information and settings
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-3">
          {/* Email */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/50">
            <div className="w-10 h-10 rounded-full bg-stone-200/60 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Email Address
              </p>
              <p className="text-sm text-stone-900 truncate" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/50">
            <div className="w-10 h-10 rounded-full bg-stone-200/60 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Member Since
              </p>
              <p className="text-sm text-stone-900" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                {createdAt}
              </p>
            </div>
          </div>

          {/* User ID (for debugging/support) */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/50">
            <div className="w-10 h-10 rounded-full bg-stone-200/60 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-stone-500 mb-1" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                User ID
              </p>
              <p className="text-xs font-mono text-stone-600 truncate" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                {user.id}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full px-6 py-3 bg-stone-800/90 hover:bg-stone-900 text-white rounded-full transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
