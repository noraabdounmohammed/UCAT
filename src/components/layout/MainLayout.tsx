import React from 'react';
import '../practice/apple-styles.css';
import './apple-layout-styles.css';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock';
}

export function MainLayout({ children }: MainLayoutProps) {

  return (
    <div className="min-h-screen bg-[#F5F5F7]" data-component-name="MainLayout">
      {/* Main content area */}
      <div className="flex flex-col w-full">
        {/* Main content with Apple HIG spacing and design */}
        <main 
          className="flex-1 overflow-auto bg-[#F5F5F7] pt-6 pb-12" 
          data-component-name="MainLayout-content"
        >
          <div className="max-w-4xl mx-auto px-5 sm:px-6 md:px-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}