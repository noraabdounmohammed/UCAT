import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'creator' | 'consumer';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    // Get initial session
    console.log('🔍 Starting auth initialization...');
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeout);
        console.log('📝 Initial session loaded:', session?.user?.email);
        console.log('📝 Session exists:', !!session);
        console.log('📝 User ID:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role from profiles table
        if (session?.user) {
          try {
            console.log('🔍 Fetching user role for:', session.user.email);
            
            // Add timeout to prevent hanging
            const rolePromise = supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
              setTimeout(() => resolve({ data: null, error: { message: 'Role fetch timeout' } }), 3000)
            );
            
            const { data: profile, error } = await Promise.race([rolePromise, timeoutPromise]);
            
            if (error) {
              console.error('❌ Error fetching user role:', error);
              // Check if it's a missing column error
              if (error.message?.includes('column') && error.message?.includes('role')) {
                console.warn('⚠️ Role column missing in profiles table. Please run migration.');
              }
              
              // Default to consumer if role fetch fails
              console.log('⚠️ Defaulting to consumer role due to error');
              setUserRole('consumer');
            } else {
              // Use database role - trust what's in the profiles table
              const role = (profile?.role as UserRole) || 'consumer';
              console.log('✅ User role loaded from database:', role, 'for', session.user.email);
              setUserRole(role);
            }
          } catch (error) {
            console.error('❌ Exception fetching user role:', error);
            // Default to consumer if role fetch fails
            console.log('⚠️ Defaulting to consumer role due to exception');
            setUserRole('consumer');
          }
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('❌ Error getting session:', error);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Fetch user role from profiles table
      if (session?.user) {
        try {
          console.log('🔍 Fetching user role on auth change for:', session.user.email);
          
          // Add timeout to prevent hanging
          const rolePromise = supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => 
            setTimeout(() => resolve({ data: null, error: { message: 'Role fetch timeout' } }), 3000)
          );
          
          const { data: profile, error } = await Promise.race([rolePromise, timeoutPromise]);
          
          if (error) {
            console.error('❌ Error fetching user role on auth change:', error);
            
            // Keep existing role if fetch fails - don't reset to consumer
            console.log('⚠️ Keeping existing role due to fetch error. Current role:', userRole);
            // Only default to consumer if we don't have a role yet
            if (userRole === null) {
              console.log('⚠️ No existing role, defaulting to consumer');
              setUserRole('consumer');
            }
          } else {
            // Use database role - trust what's in the profiles table
            const role = (profile?.role as UserRole) || 'consumer';
            console.log('✅ User role updated from database:', role, 'for', session.user.email);
            setUserRole(role);
          }
        } catch (error) {
          console.error('❌ Exception fetching user role on auth change:', error);
          
          // Keep existing role if fetch fails - don't reset to consumer
          console.log('⚠️ Keeping existing role due to exception. Current role:', userRole);
          // Only default to consumer if we don't have a role yet
          if (userRole === null) {
            console.log('⚠️ No existing role, defaulting to consumer');
            setUserRole('consumer');
          }
        }
      } else {
        console.log('👤 No user session');
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Set a timeout for sign out to prevent hanging
      const signOutPromise = supabase.auth.signOut({ scope: 'local' }); // Only clear local session
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );

      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
        if (error) {
          console.error('Sign out error:', error);
        }
      } catch (timeoutError) {
        console.warn('Sign out timed out, but local state already cleared');
      }

      // Clear any persisted auth data from localStorage
      try {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.warn('Could not clear auth storage:', e);
      }


    } catch (error) {
      console.error('Failed to sign out:', error);
      // Still clear local state even on error
      setUser(null);
      setSession(null);
      setUserRole(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
