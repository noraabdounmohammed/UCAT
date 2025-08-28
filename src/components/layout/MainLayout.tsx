import React from 'react';
import '../practice/apple-styles.css';
import './apple-layout-styles.css';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock';
  isPracticeSession?: boolean;
}

export function MainLayout({ children, isPracticeSession = false }: MainLayoutProps) {

  return (
    <div 
      className={`bg-white dark:bg-gray-900 ${isPracticeSession ? 'h-screen overflow-hidden' : 'min-h-screen'}`}
      data-component-name="MainLayout"
    >
      {/* Main content area */}
      <div className={`flex flex-col w-full ${isPracticeSession ? 'h-full' : ''}`}>
        {/* Main content with Apple HIG spacing and design */}
        <main 
          className={`flex-1 bg-white dark:bg-gray-900 ${isPracticeSession ? 'overflow-hidden' : 'pb-8'}`}
          data-component-name="MainLayout"
        >
          {children}
        </main>
      </div>
    </div>
  );
}