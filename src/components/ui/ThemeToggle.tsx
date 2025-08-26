import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-90 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-gray-900 dark:text-gray-100" strokeWidth={2.5} />
      ) : (
        <Sun className="h-5 w-5 text-gray-900 dark:text-gray-100" strokeWidth={2.5} />
      )}
    </button>
  );
}
