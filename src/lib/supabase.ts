import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a mock Supabase client with all the methods we need
const mockSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: { user: { id: 'mock-user-id', email: 'user@example.com' } } }, error: null }),
    getUser: () => Promise.resolve({ data: { user: { id: 'mock-user-id', email: 'user@example.com' } }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: { id: 'mock-user-id', email: 'user@example.com' } }, error: null }),
    signUp: () => Promise.resolve({ data: { user: { id: 'mock-user-id', email: 'user@example.com' } }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: {}, error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    insert: () => Promise.resolve({ data: {}, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: {}, error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: {}, error: null }),
    }),
  }),
};

// Export the mock client as if it were a real Supabase client
export const supabase = mockSupabase as unknown as SupabaseClient<Database>;