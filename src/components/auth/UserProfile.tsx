import React from 'react';
import { User, Mail, Calendar, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfileProps {
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  if (!user) return null;

  const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 text-center relative border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="absolute top-6 right-8 flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </button>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Your Profile
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Account information and settings
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-4">
          {/* Email */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email Address
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Member Since
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {createdAt}
              </p>
            </div>
          </div>

          {/* User ID (for debugging/support) */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                User ID
              </p>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                {user.id}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
