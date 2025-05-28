import { useState, useEffect } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Target, Calculator, BookOpen, Brain, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Make informed decisions based on complex information' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
};

interface StableSectionTabsProps {
  sections: string[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

/**
 * StableSectionTabs uses Radix UI Tabs to provide a flash-free section selection experience,
 * similar to the one used in the MockExam page.
 */
export function StableSectionTabs({ 
  sections, 
  activeSection, 
  onSectionChange 
}: StableSectionTabsProps) {
  // Local state to track the active section
  const [localActiveSection, setLocalActiveSection] = useState(activeSection);
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalActiveSection(activeSection);
  }, [activeSection]);
  
  // Handle section change
  const handleValueChange = (value: string) => {
    setLocalActiveSection(value);
    onSectionChange(value);
  };
  
  return (
    <TabsPrimitive.Root
      value={localActiveSection}
      onValueChange={handleValueChange}
      className="w-full"
    >
      <div className="flex items-center justify-between pb-3 sm:pb-5 border-b border-gray-100">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-[#1D1D1F] flex items-center gap-3">
          <Target className="h-5 w-5 text-[#0066CC]" />
          <span>Select Section</span>
        </h2>
        <div className="text-xs sm:text-sm text-[#86868B]">
          {sections.length} sections available
        </div>
      </div>
      
      <div className="pt-2 sm:pt-5">
        <TabsPrimitive.List 
          className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            willChange: 'transform',
            contain: 'content'
          }}
        >
          {sections.map(section => {
            const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
            return (
              <TabsPrimitive.Trigger
                key={section}
                value={section}
                className={cn(
                  "flex flex-col items-center justify-center p-2 sm:p-5 rounded-xl sm:rounded-2xl border",
                  "will-change-transform backface-visibility-hidden touch-manipulation",
                  "active:scale-[0.98] transition-transform",
                  "data-[state=active]:bg-[#F2F9FF] data-[state=active]:border-[#0066CC]/20",
                  "data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:border-[#0066CC]/10 data-[state=inactive]:hover:bg-[#F5F5F7]"
                )}
                style={{
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  willChange: 'transform',
                  contain: 'content'
                }}
              >
                <div className={cn(
                  "p-2 sm:p-3.5 rounded-full mb-1 sm:mb-4 transition-all duration-300",
                  "data-[state=active]:bg-[#0066CC] data-[state=active]:scale-110",
                  "data-[state=inactive]:bg-[#F5F5F7]"
                )}>
                  <SectionIcon className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    "data-[state=active]:text-white",
                    "data-[state=inactive]:text-[#86868B]"
                  )} />
                </div>
                <span className={cn(
                  "font-medium text-xs sm:text-sm transition-colors duration-300 text-center",
                  "data-[state=active]:text-[#0066CC]",
                  "data-[state=inactive]:text-[#1D1D1F]"
                )}>
                  {SECTION_DETAILS[section]?.name || section}
                </span>
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
      </div>
    </TabsPrimitive.Root>
  );
}
