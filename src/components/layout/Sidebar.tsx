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
  LogOut,
  ChevronRight
} from 'lucide-react';
import './apple-layout-styles.css';

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
      {/* Apple-style branding with SF design principles */}
      <div className="apple-sidebar-header">
        <div className="apple-app-icon">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <span className="apple-app-title">MedICU UKMLA</span>
      </div>
      
      <div className="apple-sidebar-section">
        <h3 className="apple-sidebar-heading">Practice</h3>
        
        {/* Apple-style navigation list */}
        <div className="apple-sidebar-nav">
          <Button
            variant="ghost"
            className={cn(
              "apple-sidebar-item",
              currentPage === 'dashboard' && "apple-sidebar-item-selected"
            )}
            onClick={() => onNavigate('dashboard')}
          >
            <div className="apple-sidebar-icon">
              <Target className="h-4 w-4" />
            </div>
            <span className="apple-sidebar-label">Target Practice</span>
            <ChevronRight className="apple-sidebar-chevron" />
          </Button>
          
          <Button
            variant="ghost"
            className={cn(
              "apple-sidebar-item",
              currentPage === 'mock' && "apple-sidebar-item-selected"
            )}
            onClick={() => onNavigate('mock')}
          >
            <div className="apple-sidebar-icon">
              <Clock className="h-4 w-4" />
            </div>
            <span className="apple-sidebar-label">Mock Exams</span>
            <ChevronRight className="apple-sidebar-chevron" />
          </Button>
        </div>
      </div>
      
      {/* Apple-style sign out button */}
      <div className="apple-sidebar-footer">
        <Separator className="apple-separator" />
        <Button 
          variant="ghost" 
          className="apple-signout-button"
          onClick={handleSignOut}
        >
          <div className="apple-sidebar-icon apple-icon-signout">
            <LogOut className="h-4 w-4" />
          </div>
          <span>Sign Out</span>
        </Button>
      </div>
    </>
  );
};

export function Sidebar({ currentPage, onNavigate, className }: SidebarProps) {
  return (
    <>
      {/* Apple-style mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="apple-mobile-menu-button"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="apple-sheet-content">
          <div className="flex flex-col h-full">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Apple macOS style */}
      <div className={cn(
        "apple-sidebar",
        className
      )}>
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </>
  );
}