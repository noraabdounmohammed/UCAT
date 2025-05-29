import React from 'react';
import { Sidebar } from './Sidebar';
import '../practice/apple-styles.css';
import './apple-layout-styles.css';
import { ChevronLeft } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'mock';
  onNavigate: (page: 'dashboard' | 'mock') => void;
}

export function MainLayout({ children, currentPage, onNavigate }: MainLayoutProps) {
  // Get page title based on current page
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Target Practice';
      case 'mock':
        return 'Mock Exams';
      default:
        return 'MedICU';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F7]" data-component-name="MainLayout">
      {/* Apple-style sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* macOS-style header with title and back button */}
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-[#E5E5EA] sticky top-0 z-10 flex items-center px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#0066CC] hover:bg-[#F2F2F7]"
              onClick={() => onNavigate(currentPage === 'mock' ? 'dashboard' : 'mock')}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <h1 className="text-[15px] font-semibold text-[#1D1D1F] ml-2">{getPageTitle()}</h1>
        </header>
        
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