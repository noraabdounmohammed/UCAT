import React from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

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
        className="w-64"
      />
      <main className="flex-1 overflow-auto pt-14 lg:pt-6 px-4 md:px-6 pb-6">
        {children}
      </main>
    </div>
  );
}