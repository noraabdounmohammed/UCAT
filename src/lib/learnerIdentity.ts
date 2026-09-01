import type { User } from '@supabase/supabase-js';

function cleanName(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const first = raw.split(/\s+/)[0]?.replace(/[^\p{L}'’-]/gu, '').trim();
  if (!first || first.length < 2 || first.length > 32) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function getLearnerFirstName(user: User | null | undefined): string | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};

  const candidates = [
    metadata.first_name,
    metadata.given_name,
    metadata.name,
    metadata.full_name,
    metadata.display_name,
  ];

  for (const candidate of candidates) {
    const name = cleanName(candidate);
    if (name) return name;
  }

  return null;
}

export function getDaypartGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
