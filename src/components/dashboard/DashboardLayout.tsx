import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const DashboardLayout = React.memo(
  ({ children, className }: DashboardLayoutProps) => {
    return (
      <div className="w-full">
        {/* Welcome section removed as requested */}
        
        {/* Content with Apple-like card design and spacing */}
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
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