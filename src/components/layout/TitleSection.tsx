import React from 'react';

interface TitleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function TitleSection({ title, subtitle, icon, action }: TitleSectionProps) {
  return (
    <div className="apple-title-section mb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-[#007AFF]">
              {icon}
            </div>
          )}
          <h1 className="text-[22px] font-semibold text-[#1D1D1F]">{title}</h1>
        </div>
        
        {action && (
          <div className="ml-auto">
            {action}
          </div>
        )}
      </div>
      
      {subtitle && (
        <p className="text-[15px] text-[#86868B] mt-1 ml-0">{subtitle}</p>
      )}
    </div>
  );
}
