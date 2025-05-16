import React from 'react';
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
      <div className="flex items-center gap-2 px-4 py-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-semibold">UCAT Prep</span>
      </div>
      
      <Separator className="my-4" />
      
      <div className="space-y-2">
        <Button
          variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
          className={cn(
            "w-full justify-start gap-2",
            "transition-all duration-300",
            currentPage === 'dashboard' && "bg-primary/10 hover:bg-primary/20"
          )}
          onClick={() => onNavigate('dashboard')}
        >
          <Target className="h-4 w-4" />
          Target Practice
        </Button>
        
        <Button
          variant={currentPage === 'mock' ? 'secondary' : 'ghost'}
          className={cn(
            "w-full justify-start gap-2",
            "transition-all duration-300",
            currentPage === 'mock' && "bg-primary/10 hover:bg-primary/20"
          )}
          onClick={() => onNavigate('mock')}
        >
          <Clock className="h-4 w-4" />
          Mock Exams
        </Button>
      </div>
      
      <div className="mt-auto">
        <Separator className="my-4" />
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
};

export function Sidebar({ currentPage, onNavigate, className }: SidebarProps) {
  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed left-4 top-4 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full px-3 py-4">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col h-full bg-card border-r px-3 py-4",
        "transition-all duration-300",
        className
      )}>
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </>
  );
}