import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const DashboardLayout = React.memo(
  ({ children, className }: DashboardLayoutProps) => {
    return (
      <div className="bg-background min-h-screen w-full">
        <div
          className={cn(
            'max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;