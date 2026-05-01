import React from 'react';
import '../practice/apple-styles.css';
import './apple-layout-styles.css';
import { AtomicEngineNav } from './AtomicEngineNav';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock' | 'dynamic-demo' | 'explanation-test' | 'concise-demo' | 'concept-practice' | 'concept-practice-old' | 'concept-bulk-upload' | 'curriculum-dashboard' | 'study' | 'review' | 'seed' | 'mistakes' | 'voice' | 'leaderboard' | 'cases';
  isPracticeSession?: boolean;
  /** Hide the Atomic Engine top nav (e.g. for full-screen practice sessions). */
  hideNav?: boolean;
}

export function MainLayout({ children, isPracticeSession = false, hideNav = false }: MainLayoutProps) {

  return (
    <div
      className={`bg-white dark:bg-stone-950 ${isPracticeSession ? 'h-screen overflow-hidden' : 'min-h-screen'}`}
      data-component-name="MainLayout"
    >
      {!hideNav && !isPracticeSession && <AtomicEngineNav />}
      {/* Main content area */}
      <div className={`flex flex-col w-full ${isPracticeSession ? 'h-full' : ''}`}>
        {/* Main content with Apple HIG spacing and design */}
        <main
          className={`flex-1 bg-white dark:bg-stone-950 ${isPracticeSession ? 'overflow-hidden' : 'pb-16'}`}
          data-component-name="MainLayout"
        >
          {children}
        </main>
      </div>
      {!isPracticeSession && (
        <footer className="text-center py-6 text-xs text-stone-400 dark:text-stone-600">
          {/* Plain <a> (not NavLink) — privacy is a lazy route; full reload is fine for a footer link. */}
          <a href="/privacy" className="hover:underline">Privacy &amp; cookies</a>
        </footer>
      )}
    </div>
  );
}