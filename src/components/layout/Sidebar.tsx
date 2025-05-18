
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  Target,
  Clock,
  GraduationCap,
  Menu,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentPage: 'dashboard' | 'mock';
  onNavigate: (page: 'dashboard' | 'mock') => void;
  className?: string;
}

const SidebarContent = ({ currentPage, onNavigate }: Pick<SidebarProps, 'currentPage' | 'onNavigate'>) => {
  const supabase = useSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Enhanced branding with new aesthetic design */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full h-11 w-11 shadow-md">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <span className="font-semibold text-xl tracking-tight text-gray-900">MedICU</span>
      </div>
      
      <div className="px-4 py-4">
        <p className="text-xs font-medium text-indigo-500 mb-3 px-2 uppercase tracking-wider">Practice</p>
        
        {/* Enhanced navigation with new aesthetic design */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-4 py-3 h-auto",
              "text-sm font-medium transition-all duration-200",
              "rounded-xl border",
              currentPage === 'dashboard' 
                ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-100 shadow-sm" 
                : "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/40 border-transparent"
            )}
            onClick={() => onNavigate('dashboard')}
          >
            <div className={cn(
              "p-2 rounded-full",
              currentPage === 'dashboard' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
            )}>
              <Target className="h-4 w-4" />
            </div>
            <span>Target Practice</span>
          </Button>
          
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-4 py-3 h-auto",
              "text-sm font-medium transition-all duration-200",
              "rounded-xl border",
              currentPage === 'mock' 
                ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border-indigo-100 shadow-sm" 
                : "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/40 border-transparent"
            )}
            onClick={() => onNavigate('mock')}
          >
            <div className={cn(
              "p-2 rounded-full",
              currentPage === 'mock' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
            )}>
              <Clock className="h-4 w-4" />
            </div>
            <span>Mock Exams</span>
          </Button>
          

        </div>
      </div>
      

      
      {/* Bottom action with sign out */}
      <div className="mt-auto px-4 pt-5 pb-6">
        <Separator className="mb-5 bg-gray-100" />
        <div className="space-y-2">          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-4 py-3 h-auto text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50/60 rounded-xl border border-transparent"
            onClick={handleSignOut}
          >
            <div className="p-2 rounded-full bg-red-50 text-red-500">
              <LogOut className="h-4 w-4" />
            </div>
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </>
  );
};

export function Sidebar({ currentPage, onNavigate, className }: SidebarProps) {
  return (
    <>
      {/* Enhanced mobile sidebar with new aesthetic design */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed left-4 top-4 z-40 rounded-full h-12 w-12 shadow-md bg-white/95 backdrop-blur-sm border border-indigo-100"
          >
            <Menu className="h-5 w-5 text-indigo-600" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 border-r border-indigo-100 shadow-xl bg-white">
          <div className="flex flex-col h-full">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Apple-style clean design */}
      <div className={cn(
        "hidden lg:flex flex-col h-screen bg-white border-r border-gray-200/80",
        "transition-all duration-300 overflow-y-auto",
        "sticky top-0 left-0 shadow-[1px_0_3px_rgba(0,0,0,0.02)]",
        className
      )}>
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </>
  );
}