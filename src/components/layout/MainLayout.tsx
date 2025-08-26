import React from 'react';
import '../practice/apple-styles.css';
import './apple-layout-styles.css';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock';
}

export function MainLayout({ children }: MainLayoutProps) {

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900" data-component-name="MainLayout">
      {/* Main content area */}
      <div className="flex flex-col w-full">
        {/* Main content with Apple HIG spacing and design */}
        <main 
          className="flex-1 bg-white dark:bg-gray-900 pb-8" 
          data-component-name="MainLayout"
        >
          {children}
        </main>
      </div>
    </div>
  );
}