import { NavLink } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

interface NavItem {
  to: string;
  label: string;
  /** True if the link is only relevant to creators (Nora etc.) */
  creatorOnly?: boolean;
}

const PUBLIC_ITEMS: NavItem[] = [
  { to: '/study', label: 'Study' },
  { to: '/mistakes', label: 'Mistakes' },
  { to: '/mock', label: 'Mock' },
  { to: '/voice', label: 'Voice' },
];

const CREATOR_ITEMS: NavItem[] = [
  { to: '/review', label: 'Review', creatorOnly: true },
  { to: '/seed', label: 'Seed', creatorOnly: true },
];

/**
 * Top-of-page nav for the Atomic Engine routes (Plans 2-10).
 * Creator-only routes (review, seed) are gated by useUserRole().isCreator.
 * Renders as a horizontal tab strip; mobile-first (scrollable when narrow).
 */
export function AtomicEngineNav() {
  const { isCreator } = useUserRole();
  const items = isCreator ? [...PUBLIC_ITEMS, ...CREATOR_ITEMS] : PUBLIC_ITEMS;

  return (
    <nav
      aria-label="Atomic Engine"
      className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800"
    >
      <ul className="max-w-3xl mx-auto flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-block px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800'
              }`
            }
          >
            Home
          </NavLink>
        </li>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `inline-block px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
