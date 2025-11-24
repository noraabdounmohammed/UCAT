import React, { useState, useEffect } from 'react';
import { CurriculumHubLoft } from '@/pages/CurriculumHub.loft';
import { ConceptPracticePageLoft } from '@/pages/ConceptPracticePage.loft';
import { CurriculumPublishingService } from '@/services/curriculumPublishing';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  conceptCount: number;
  lastAccessed: Date;
  color: string;
  category: string;
  progress: number;
}

export const CurriculumApp: React.FC = () => {
  const { user, loading } = useAuth();
  // Check if we should skip hub and go directly to curriculum
  const autoOpenId = sessionStorage.getItem('autoOpenCurriculumId');
  const pendingImport = sessionStorage.getItem('pendingCurriculumImport');
  // If there's a pending import or autoOpenId, start in curriculum view to avoid showing sign-in
  const [currentView, setCurrentView] = useState<'hub' | 'curriculum'>((autoOpenId || pendingImport) ? 'curriculum' : 'hub');
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load curriculums from localStorage on mount and handle pending imports
  useEffect(() => {
    const loadCurriculums = async () => {
      console.log('📚 CurriculumApp: Loading curriculums, user:', user?.email);
      
      // Check for pending curriculum import from landing page
      const pendingImport = sessionStorage.getItem('pendingCurriculumImport');
      
      if (pendingImport) {
        try {
          const curriculumData = JSON.parse(pendingImport);
          console.log('📥 CurriculumApp: Importing pending curriculum:', curriculumData.name);
          
          // Import curriculum with user ID if available
          const newCurriculumId = await CurriculumPublishingService.importCurriculum(curriculumData, user?.id);
          console.log('✅ CurriculumApp: Import successful, ID:', newCurriculumId);
          
          // Store the ID to auto-open it
          sessionStorage.setItem('autoOpenCurriculumId', newCurriculumId);
          
          // Clear pending import
          sessionStorage.removeItem('pendingCurriculumImport');
        } catch (error) {
          console.error('❌ Failed to import curriculum:', error);
          sessionStorage.removeItem('pendingCurriculumImport');
        }
      }
      
      // Load curriculums from localStorage using user-specific key if signed in
      let storedCurriculums: string | null = null;
      
      if (user) {
        // Try user-specific key first
        const userKey = `user_${user.id}_curriculums`;
        storedCurriculums = localStorage.getItem(userKey);
        console.log('📍 CurriculumApp: Checking user-specific key:', userKey, 'found:', !!storedCurriculums);
        
        // Migration: Move from old global key to user-specific key
        if (!storedCurriculums) {
          const oldGlobalCurriculums = localStorage.getItem('curriculums');
          if (oldGlobalCurriculums) {
            console.log('🔄 CurriculumApp: Migrating curriculums to user-specific key');
            localStorage.setItem(userKey, oldGlobalCurriculums);
            storedCurriculums = oldGlobalCurriculums;
          }
        }
      }
      
      // Fallback to global key if not signed in or no user-specific data
      if (!storedCurriculums) {
        console.log('📍 CurriculumApp: Using global key');
        storedCurriculums = localStorage.getItem('curriculums');
      }
      
      if (storedCurriculums) {
        try {
          const parsed = JSON.parse(storedCurriculums);
          const curriculumsWithDates = parsed.map((c: any) => ({
            ...c,
            lastAccessed: new Date(c.lastAccessed)
          }));
          console.log('✅ CurriculumApp: Loaded', curriculumsWithDates.length, 'curriculums');
          setCurriculums(curriculumsWithDates);
        } catch (error) {
          console.error('Failed to load curriculums from localStorage:', error);
        }
      } else {
        console.log('📭 CurriculumApp: No curriculums found');
      }
      setIsLoaded(true);
    };
    
    loadCurriculums();
  }, [user]);

  // Check sessionStorage for curriculum ID to auto-open (from landing page)
  useEffect(() => {
    console.log('🔄 CurriculumApp useEffect triggered:', {
      isLoaded,
      curriculumsCount: curriculums.length,
      selectedCurriculum: selectedCurriculum?.id,
      sessionStorageKeys: Object.keys(sessionStorage)
    });
    
    if (!isLoaded || curriculums.length === 0) {

      return;
    }

    const autoOpenId = sessionStorage.getItem('autoOpenCurriculumId');
    const fromLandingPageFlag = sessionStorage.getItem('fromLandingPage');
    
    console.log('🔍 Checking for curriculum to open:', {
      autoOpenId,
      fromLandingPageFlag,
      availableCurriculums: curriculums.map(c => ({ id: c.id, name: c.name })),
      selectedCurriculum: selectedCurriculum?.id
    });
    
    // If sessionStorage has a curriculum ID and we're not already viewing it
    if (autoOpenId && !selectedCurriculum) {
      const curriculum = curriculums.find(c => c.id === autoOpenId);
      if (curriculum) {

        setSelectedCurriculum(curriculum);
        setCurrentView('curriculum');
        
        // Clear sessionStorage so it doesn't re-trigger
        sessionStorage.removeItem('autoOpenCurriculumId');
      } else {

        // Clear it anyway to prevent infinite retries
        sessionStorage.removeItem('autoOpenCurriculumId');
      }
    }
  }, [curriculums, isLoaded, selectedCurriculum]);

  // Save curriculums to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && curriculums.length > 0) {
      // Use user-specific key if signed in, otherwise use global key
      const storageKey = user ? `user_${user.id}_curriculums` : 'curriculums';
      localStorage.setItem(storageKey, JSON.stringify(curriculums));
      console.log('💾 CurriculumApp: Saved', curriculums.length, 'curriculums to key:', storageKey);
    }
  }, [curriculums, isLoaded, user]);

  const handleOpenCurriculum = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
    setCurrentView('curriculum');
  };

  const handleBackToCurriculums = () => {
    // Reload curriculums from localStorage when returning to hub
    const storageKey = user ? `user_${user.id}_curriculums` : 'curriculums';
    const storedCurriculums = localStorage.getItem(storageKey);
    if (storedCurriculums) {
      try {
        const parsed = JSON.parse(storedCurriculums);
        const curriculumsWithDates = parsed.map((c: any) => ({
          ...c,
          lastAccessed: new Date(c.lastAccessed)
        }));
        setCurriculums(curriculumsWithDates);
        console.log('🔄 CurriculumApp: Reloaded', curriculumsWithDates.length, 'curriculums from key:', storageKey);
      } catch (error) {
        console.error('Failed to reload curriculums:', error);
      }
    }
    
    setCurrentView('hub');
    setSelectedCurriculum(null);
  };

  const handleUpdateCurriculum = (updatedCurriculum: Curriculum) => {
    setSelectedCurriculum(updatedCurriculum);
    
    // Update in the curriculums array
    setCurriculums(prev => 
      prev.map(c => c.id === updatedCurriculum.id ? updatedCurriculum : c)
    );
  };

  const handleCreateCurriculum = (newCurriculum: Curriculum) => {

    setCurriculums(prev => [...prev, newCurriculum]);
    
    // Navigate to the new curriculum
    setSelectedCurriculum(newCurriculum);
    setCurrentView('curriculum');
  };

  if (currentView === 'curriculum' && selectedCurriculum) {
    // Check if we came from landing page (for showcase/new users)
    const fromLandingPage = sessionStorage.getItem('fromLandingPage') === 'true';
    
    // Clear the flag after reading it
    if (fromLandingPage) {
      sessionStorage.removeItem('fromLandingPage');
    }
    
    return (
      <ConceptPracticePageLoft
        onBackToCurriculums={handleBackToCurriculums}
        curriculum={selectedCurriculum}
        onUpdateCurriculum={handleUpdateCurriculum}
        initialView={fromLandingPage ? 'concepts' : undefined}
      />
    );
  }

  // Show auth loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-300 border-t-stone-800"></div>
          <p className="text-stone-600 text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Protect hub view - require sign-in to access "My Curriculums"
  if (currentView === 'hub' && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-stone-50 overflow-hidden p-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center px-4">
            <h2 className="text-xl sm:text-2xl font-medium text-stone-900 mb-2" style={{ fontFamily: "'Unbounded', sans-serif" }}>
              Sign In Required
            </h2>
            <p className="text-sm sm:text-base text-stone-600" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              Please sign in to access your curriculums
            </p>
          </div>
          <AuthForm onSuccess={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <CurriculumHubLoft 
      onOpenCurriculum={handleOpenCurriculum}
      curriculums={curriculums}
      setCurriculums={setCurriculums}
      onCreateCurriculum={handleCreateCurriculum}
    />
  );
};
