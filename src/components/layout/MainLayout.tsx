import React from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock';
  onNavigate: (page: 'dashboard' | 'mock') => void;
}

export function MainLayout({ children, currentPage, onNavigate }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        className="w-72"
      />
      <div className="flex-1 flex flex-col">
        {/* Empty padded space at the top */}
        <div className="h-16 bg-gray-50/50"></div>
        
        {/* Main content with Apple-style spacing and design */}
        <main className="flex-1 overflow-auto px-8 py-8 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}