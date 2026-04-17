import React, { useState, useEffect } from 'react';
import { X, Filter, Search, ArrowUpRight } from 'lucide-react';
import { QUESTION_FORMATS } from '@/components/dashboard/QuestionFormatSelector';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { QuestionFormat, PracticeConfig } from '@/types/conceptTypes';

interface PracticeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (config: PracticeConfig) => void;
  conceptCount: number;
  preselectedFormat?: string;
  preselectedFilter?: string;
  initialConceptIds?: string[];
}

export const PracticeConfigModal: React.FC<PracticeConfigModalProps> = ({
  isOpen,
  onClose,
  onStartPractice,
  conceptCount: _conceptCount, // Prefix with underscore to indicate intentionally unused
  preselectedFormat,
  preselectedFilter,
  initialConceptIds
}) => {
  const { user } = useAuth();
  const { 
    stats,
    filterCategories,
    filterOptions,
    concepts,
    curriculumId,
    setPracticeSelection
  } = useConceptStore();

  // Independent filter state for practice config - does NOT affect global filter state
  const [practiceFilterState, setPracticeFilterState] = useState({
    custom_filters: [] as string[],
    mastery_levels: [] as number[],
    cascading_mode: true // Default to AND mode (cascading filters)
  });

  // State to show sign-in prompt
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [pendingPracticeConfig, setPendingPracticeConfig] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize practice filter state when modal opens - always reset to fresh state
  useEffect(() => {
    if (isOpen) {
      // ALWAYS start fresh - ignore any previous filters
      // Only use preselectedFilter if provided, otherwise start completely empty
      setPracticeFilterState({
        custom_filters: preselectedFilter ? [preselectedFilter] : [],
        mastery_levels: [],
        cascading_mode: true // Default to AND mode (cascading filters)
      });
    } else {
      // When modal closes, reset to empty state
      setPracticeFilterState({
        custom_filters: [],
        mastery_levels: [],
        cascading_mode: true
      });
    }
  }, [isOpen, preselectedFilter]);

  // Built-in prompt templates - defined early for use in handleClose
  const builtInSBAPrompts = {
    'clinical': `Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should test understanding of the key concept
5. Include a brief explanation of why the correct answer is right`
  };

  const builtInFlashcardPrompts = {
    'clinical': `Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`
  };

  const defaultPrompt = builtInSBAPrompts['clinical'];
  const defaultFlashcardPrompt = builtInFlashcardPrompts['clinical'];

  // Reset selections when modal closes
  const handleClose = () => {
    // Reset all selections to start fresh next time
    setSelectedFormat(preselectedFormat as QuestionFormat || null);
    setSearchQuery('');
    setSelectedPromptPreset('default');
    setSelectedFlashcardPreset('default');
    setCustomPrompt(defaultPrompt);
    setCustomFlashcardPrompt(defaultFlashcardPrompt);
    setPracticeFilterState({
      custom_filters: [],
      mastery_levels: [],
      cascading_mode: true
    });
    onClose();
  };

  // Calculate compatible filters per category in cascading mode
  // Returns a map of categoryId -> Set of compatible filters for that category
  const compatibleFiltersByCategory = React.useMemo(() => {
    const result: Record<string, Set<string>> = {};
    
    console.log('🔍 PracticeConfigModal - Calculating compatible filters:', {
      cascadingMode: practiceFilterState.cascading_mode,
      selectedFilters: practiceFilterState.custom_filters,
      conceptsCount: concepts.length
    });
    
    if (!practiceFilterState.cascading_mode || (practiceFilterState.custom_filters.length === 0 && practiceFilterState.mastery_levels.length === 0) || !concepts.length) {
      // No cascading - all filters are compatible

      return result;
    }

    // Get filter assignments to know which category each filter belongs to
    const filterAssignments = JSON.parse(
      localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}'
    );

    // Group selected custom filters by category
    const selectedByCategory: Record<string, string[]> = {};
    practiceFilterState.custom_filters.forEach((filter: string) => {
      const categoryId = filterAssignments[filter];
      if (categoryId) {
        if (!selectedByCategory[categoryId]) {
          selectedByCategory[categoryId] = [];
        }
        selectedByCategory[categoryId].push(filter);
      }
    });

    // For each category, calculate compatible filters excluding that category's own selections
    const allCategories = new Set([
      'mastery', // Special category for mastery levels
      ...Object.values(filterAssignments)
    ]);

    allCategories.forEach((targetCategory: any) => {
      // Filter concepts based on selections from OTHER categories
      const conceptsMatchingOtherCategories = concepts.filter((concept: any) => {
        const conceptFilters = concept.custom_filters || [];
        const otherFilters = Object.values(selectedByCategory).flat().filter(filter => filterAssignments[filter] !== targetCategory);
        const hasAllOtherFilters = otherFilters.every(filter => concept.custom_filters?.includes(filter));
        const hasAllMasteryLevels = practiceFilterState.mastery_levels.length === 0 || 
          practiceFilterState.mastery_levels.includes(concept.mastery_data?.mastery_level || 0);
        if (!hasAllOtherFilters || !hasAllMasteryLevels) {
          return false;
        }
        
        // Check other custom filter categories (exclude target category)
        for (const [categoryId, categoryFilters] of Object.entries(selectedByCategory)) {
          if (categoryId !== targetCategory) {
            const hasMatch = (categoryFilters as string[]).some(filter => conceptFilters.includes(filter));
            if (!hasMatch) {
              return false;
            }
          }
        }
        
        return true;
      });

      // Get all filters from those concepts for this category
      const compatible = new Set<string>();
      conceptsMatchingOtherCategories.forEach((concept: any) => {
        concept.custom_filters?.forEach((filter: string) => {
          if (filterAssignments[filter] === targetCategory) {
            compatible.add(filter);
          }
        });
      });
      
      result[targetCategory] = compatible;
    });

    return result;
  }, [practiceFilterState.cascading_mode, practiceFilterState.custom_filters, practiceFilterState.mastery_levels, concepts, curriculumId, filterCategories]);

  // Calculate filtered concepts based on practice filter state
  const filteredPracticeConcepts = React.useMemo(() => {
    if (practiceFilterState.custom_filters.length === 0 && practiceFilterState.mastery_levels.length === 0) {
      return concepts;
    }

    return concepts.filter((concept: any) => {
      // Check mastery level filter
      const masteryMatch = practiceFilterState.mastery_levels.length === 0 || 
        practiceFilterState.mastery_levels.includes(concept.mastery_data?.mastery_level || 0);
      
      // Check custom filters
      const customFilterMatch = practiceFilterState.custom_filters.length === 0 || 
        (practiceFilterState.cascading_mode 
          ? practiceFilterState.custom_filters.every((filter: string) => concept.custom_filters?.includes(filter))
          : practiceFilterState.custom_filters.some((filter: string) => concept.custom_filters?.includes(filter))
        );
      
      return masteryMatch && customFilterMatch;
    });
  }, [concepts, practiceFilterState.custom_filters, practiceFilterState.mastery_levels, practiceFilterState.cascading_mode]);

  // Determine the count to display: if no modal filters selected, fall back to incoming initial selection
  const displayConceptCount = React.useMemo(() => {
    const noModalFilters = practiceFilterState.custom_filters.length === 0 && practiceFilterState.mastery_levels.length === 0;
    if (noModalFilters) {
      return initialConceptIds && initialConceptIds.length > 0 ? initialConceptIds.length : concepts.length;
    }
    return filteredPracticeConcepts.length;
  }, [practiceFilterState.custom_filters, practiceFilterState.mastery_levels, initialConceptIds, concepts.length, filteredPracticeConcepts.length]);

  // Calculate counts and mastery stats for each custom filter
  const filterCounts = React.useMemo(() => {
    const counts: Record<string, { total: number; correct: number; incorrect: number }> = {};
    filterOptions.custom_filters?.forEach((filter: string) => {
      const filterConcepts = concepts.filter((c: any) => 
        c.custom_filters?.includes(filter)
      );
      const correct = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 2).length;
      const incorrect = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 1).length;
      
      counts[filter] = {
        total: filterConcepts.length,
        correct,
        incorrect
      };
    });
    return counts;
  }, [concepts, filterOptions.custom_filters]);
  // Show only active formats (not coming soon)
  const activeFormats: QuestionFormat[] = ['flashcard', 'sba', 'ukmla_sba'];
  
  // Formats that are coming soon (disabled)
  const comingSoonFormats: QuestionFormat[] = ['emq', 'true_false', 'ranking'];
  const [selectedFormat, setSelectedFormat] = useState<QuestionFormat | null>(
    preselectedFormat as QuestionFormat || null
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Prompt presets
  const [promptPresets, setPromptPresets] = useState<Record<string, string>>({});
  const [flashcardPresets, setFlashcardPresets] = useState<Record<string, string>>({});
  const [selectedPromptPreset, setSelectedPromptPreset] = useState<string>('default');
  const [selectedFlashcardPreset, setSelectedFlashcardPreset] = useState<string>('default');

  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);
  const [customFlashcardPrompt, setCustomFlashcardPrompt] = useState(defaultFlashcardPrompt);

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPromptPresets = localStorage.getItem('prompt_presets');
    const savedFlashcardPresets = localStorage.getItem('flashcard_presets');
    const lastUsedPromptPreset = localStorage.getItem('last_prompt_preset');
    const lastUsedFlashcardPreset = localStorage.getItem('last_flashcard_preset');
    
    if (savedPromptPresets) {
      const presets = JSON.parse(savedPromptPresets);
      setPromptPresets(presets);
    }
    
    if (savedFlashcardPresets) {
      const presets = JSON.parse(savedFlashcardPresets);
      setFlashcardPresets(presets);
    }
    
    if (lastUsedPromptPreset && lastUsedPromptPreset !== 'default') {
      setSelectedPromptPreset(lastUsedPromptPreset);
      const presets = savedPromptPresets ? JSON.parse(savedPromptPresets) : {};
      if (presets[lastUsedPromptPreset]) {
        setCustomPrompt(presets[lastUsedPromptPreset]);
      }
    }
    
    if (lastUsedFlashcardPreset && lastUsedFlashcardPreset !== 'default') {
      setSelectedFlashcardPreset(lastUsedFlashcardPreset);
      const presets = savedFlashcardPresets ? JSON.parse(savedFlashcardPresets) : {};
      if (presets[lastUsedFlashcardPreset]) {
        setCustomFlashcardPrompt(presets[lastUsedFlashcardPreset]);
      }
    }
  }, []);


  const handleFormatToggle = (format: QuestionFormat) => {
    // Don't allow selection of coming soon formats
    if (comingSoonFormats.includes(format)) {
      return;
    }
    
    // If the format is already selected, deselect it
    if (selectedFormat === format) {
      setSelectedFormat(null);
    } else {
      // Otherwise, select only this format
      setSelectedFormat(format);
    }
  };


  // Auto-start practice when user signs in after being prompted
  useEffect(() => {
    if (user && pendingPracticeConfig) {
      // User just signed in and we have a pending config
      onStartPractice(pendingPracticeConfig);
      setPendingPracticeConfig(null);
      setShowSignInPrompt(false);
      handleClose();
    }
  }, [user, pendingPracticeConfig]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      // Auth context will update and trigger the useEffect above
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handleStartPractice = () => {
    let finalPrompt = customPrompt;
    let finalFlashcardPrompt = customFlashcardPrompt;
    
    // If a saved preset is selected, use that prompt
    if (selectedPromptPreset !== 'default' && selectedPromptPreset !== 'custom') {
      finalPrompt = promptPresets[selectedPromptPreset] || customPrompt;
    } else if (selectedPromptPreset === 'default') {
      finalPrompt = defaultPrompt;
    }
    
    if (selectedFlashcardPreset !== 'default' && selectedFlashcardPreset !== 'custom') {
      finalFlashcardPrompt = flashcardPresets[selectedFlashcardPreset] || customFlashcardPrompt;
    } else if (selectedFlashcardPreset === 'default') {
      finalFlashcardPrompt = defaultFlashcardPrompt;
    }
    
    // Use the concepts filtered within this modal; if none selected in modal, use incoming selection from page
    const noModalFilters = practiceFilterState.custom_filters.length === 0 && practiceFilterState.mastery_levels.length === 0;
    const selectedIds = noModalFilters
      ? (initialConceptIds && initialConceptIds.length > 0
          ? initialConceptIds
          : concepts.map((c: any) => c.concept_id))
      : filteredPracticeConcepts.map((c: any) => c.concept_id);
    // Persist the exact selection to the store so downstream startPractice uses it
    setPracticeSelection(selectedIds);

    const MAX_QUESTIONS_PER_SESSION = 40;
    const config = {
      target_formats: selectedFormat ? [selectedFormat] : undefined,
      question_count: Math.min(selectedIds.length, MAX_QUESTIONS_PER_SESSION),
      custom_prompt: finalPrompt,
      custom_flashcard_prompt: finalFlashcardPrompt
    };

    // Check if user is signed in
    if (!user) {
      // Save the config and show sign-in prompt
      setPendingPracticeConfig(config);
      setShowSignInPrompt(true);
      return;
    }

    // User is signed in, start practice immediately
    onStartPractice(config);
    handleClose();
  };

  if (!isOpen) return null;


  // Helper function to get format display name
  const getFormatDisplayName = (format: QuestionFormat) => {
    switch (format) {
      case 'sba': return 'Quick SBA';
      case 'ukmla_sba': return 'UKMLA SBA';
      case 'mcq': return 'Multiple Choice';
      case 'emq': return 'Extended Matching';
      case 'true_false': return 'True/False';
      case 'ranking': return 'Ranking/Ordering';
      case 'data_interpretation': return 'Data Interpretation';
      case 'osce': return 'OSCE';
      case 'short_answer': return 'Short Answer';
      case 'flashcard': return 'Flashcard';
      case 'essay': return 'Essay';
      case 'mindmap': return 'Mind Map';
      default: return format;
    }
  };
  

  // Show sign-in prompt if user is not authenticated
  if (showSignInPrompt) {
    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSignInPrompt(false);
            setPendingPracticeConfig(null);
            setEmail('');
            setPassword('');
            setAuthError(null);
          }
        }}
      >
        <div 
          className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] shadow-2xl max-w-md w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-semibold mb-2 text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif" }}>
            {authMode === 'signin' ? 'Sign In Required' : 'Create Account'}
          </h2>
          <p className="text-stone-600 mb-6 text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {authMode === 'signin' 
              ? `Please sign in to generate ${selectedFormat === 'flashcard' ? 'flashcards' : 'questions'}. Your practice configuration will start automatically after you sign in.`
              : `Create an account to generate ${selectedFormat === 'flashcard' ? 'flashcards' : 'questions'} and track your progress.`
            }
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none transition-all text-stone-900 [&:-webkit-autofill]:bg-stone-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(245_245_244)] [&:-webkit-autofill:hover]:shadow-[inset_0_0_0px_1000px_rgb(245_245_244)] [&:-webkit-autofill:focus]:shadow-[inset_0_0_0px_1000px_rgb(255_255_255)]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 outline-none transition-all text-stone-900 [&:-webkit-autofill]:bg-stone-50 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(245_245_244)] [&:-webkit-autofill:hover]:shadow-[inset_0_0_0px_1000px_rgb(245_245_244)] [&:-webkit-autofill:focus]:shadow-[inset_0_0_0px_1000px_rgb(255_255_255)]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {authError}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSignInPrompt(false);
                  setPendingPracticeConfig(null);
                  setEmail('');
                  setPassword('');
                  setAuthError(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                {isAuthenticating ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthError(null);
                }}
                className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-0 md:p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-2xl rounded-none md:rounded-2xl border-0 md:border md:border-black/[0.08] shadow-2xl w-full h-full md:h-auto md:max-w-3xl flex flex-col"
        style={{ maxHeight: '100vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 md:px-12 py-6 md:py-8 border-b border-black/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-medium text-stone-900 mb-2 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                {preselectedFormat ? 'Configure Practice' : 'Choose Format'}
              </h2>
              <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                {preselectedFormat 
                  ? `Ready to practice ${displayConceptCount} concept${displayConceptCount !== 1 ? 's' : ''}`
                  : `Select how you want to practice ${displayConceptCount} concept${displayConceptCount !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-12 py-6 md:py-8 overflow-y-auto flex-1">
            
            {!preselectedFormat && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {activeFormats.map(format => {
                const fmt = QUESTION_FORMATS.find(f => f.id === format);
                const Icon = fmt?.icon;
                const isSelected = selectedFormat === format;
                const bg = isSelected ? '#1C1917' : (fmt?.bg ?? '#F7F4F0');
                const fg = isSelected ? '#FFFFFF' : (fmt?.fg ?? '#1C1917');
                return (
                  <button
                    key={format}
                    onClick={() => handleFormatToggle(format)}
                    className="group relative rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02] text-left"
                    style={{ height: '160px', backgroundColor: bg }}
                  >
                    <div className="h-full flex flex-col justify-between p-4">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        {Icon && (
                          <Icon
                            className="h-4 w-4"
                            style={{ color: fg, opacity: isSelected ? 0.6 : 0.4 }}
                          />
                        )}
                        <ArrowUpRight
                          className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                          style={{ color: fg }}
                        />
                      </div>
                      {/* Bottom text */}
                      <div>
                        <p
                          className="text-[10px] uppercase tracking-[0.12em] mb-1.5"
                          style={{ fontFamily: "'Manrope', sans-serif", color: fg, opacity: isSelected ? 0.6 : 0.4 }}
                        >
                          {fmt?.description ?? ''}
                        </p>
                        <h3
                          className="text-[13px] leading-tight"
                          style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 400, letterSpacing: '-0.02em', color: fg }}
                        >
                          {getFormatDisplayName(format)}
                        </h3>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}
            
            {!preselectedFormat && selectedFormat === null && (
              <p className="text-sm text-stone-500 font-light mt-6 text-center" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Select a format to continue
              </p>
            )}

            {/* Concept filtering section - shown when format is selected */}
            {(selectedFormat || preselectedFormat) && (
              <div className="space-y-6">
                {/* Filter Mode Toggle - hidden when a category filter is preselected */}
                {!preselectedFilter && (
                  <div className="p-6 bg-white/60 backdrop-blur-xl rounded-2xl border border-black/[0.06]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-[11px] font-medium text-stone-900 mb-1 flex items-center gap-2 uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                          <Filter className="h-3.5 w-3.5 text-stone-600" strokeWidth={2} />
                          Filter Mode
                        </h4>
                        <p className="text-xs text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                          {practiceFilterState.cascading_mode ? 'Match ALL selected' : 'Match ANY selected'}
                        </p>
                      </div>
                      <button
                        onClick={() => setPracticeFilterState({ ...practiceFilterState, cascading_mode: !practiceFilterState.cascading_mode })}
                        className={`px-4 py-2 rounded-full text-[10px] font-medium transition-all uppercase tracking-widest ${
                          practiceFilterState.cascading_mode
                            ? 'bg-stone-900 text-white'
                            : 'bg-white/60 text-stone-900 border border-black/[0.06]'
                        }`}
                        style={{ fontFamily: "'Unbounded', sans-serif" }}
                      >
                        {practiceFilterState.cascading_mode ? 'AND' : 'OR'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mastery Level Filters */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Mastery Level</h4>
                  <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-black/[0.06] overflow-hidden">
                    {[
                      { level: 0, name: 'Not Started', color: 'bg-gray-400' },
                      { level: 1, name: 'Needs Review', color: 'bg-red-500' },
                      { level: 2, name: 'Mastered', color: 'bg-green-500' }
                    ].map(({ level, name, color }, index) => {
                      const isSelected = practiceFilterState.mastery_levels.includes(level);
                      const count = stats.by_mastery[level] || 0;
                      
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            const newLevels = isSelected
                              ? practiceFilterState.mastery_levels.filter((l: number) => l !== level)
                              : [...practiceFilterState.mastery_levels, level];
                            setPracticeFilterState({ ...practiceFilterState, mastery_levels: newLevels });
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${
                            index !== 2 ? 'border-b border-black/[0.04]' : ''
                          } hover:bg-black/[0.02] active:bg-black/[0.04]`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${color}`} />
                            <span className="text-stone-900 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>{name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>{count}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-stone-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Custom Filters - Categorized */}
                {filterCategories && filterCategories.length > 0 ? (
                  <div className="space-y-6">
                    {filterCategories.map((category) => {
                      // Get filter assignments
                      const filterAssignments = JSON.parse(
                        localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}'
                      );
                      
                      // Get filters for this category
                      const categoryCompatible = compatibleFiltersByCategory[category.id];
                      // All filters that belong to this category
                      const allCategoryFilters = Object.entries(filterAssignments)
                        .filter(([_, catId]) => catId === category.id)
                        .map(([filter]) => filter);

                      // In cascading mode, only show compatible filters (or selected ones)
                      // In OR mode, show all filters in the category
                      const selectedInThisCategory = practiceFilterState.custom_filters.filter((f: string) => filterAssignments[f] === category.id);

                      let categoryFilters = [] as string[];
                      if (practiceFilterState.cascading_mode && practiceFilterState.custom_filters.length > 0) {
                        // Cascading mode with filters selected
                        if (selectedInThisCategory.length > 0) {
                          // If user has already selected filters in THIS category, only show those selected ones
                          categoryFilters = selectedInThisCategory
                            .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
                            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                        } else {
                          // If no filters selected in this category yet, show only compatible filters from other categories
                          categoryFilters = allCategoryFilters
                            .filter(filter => categoryCompatible && categoryCompatible.has(filter))
                            .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
                            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                        }
                      } else {
                        // OR mode or no filters selected: show all filters in this category
                        categoryFilters = allCategoryFilters
                          .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
                          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
                      }
                      
                      if (categoryFilters.length === 0) return null;
                      
                      return (
                        <div key={category.id}>
                          <h4 className="text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                            {category.name}
                          </h4>
                          <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-black/[0.06] overflow-hidden">
                            {categoryFilters.map((filter, index) => {
                              const isSelected = practiceFilterState.custom_filters.includes(filter);
                              const stats = filterCounts[filter] || { total: 0, correct: 0, incorrect: 0 };
                              const correctPercent = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                              const incorrectPercent = stats.total > 0 ? (stats.incorrect / stats.total) * 100 : 0;
                              
                              return (
                                <button
                                  key={filter}
                                  onClick={() => {
                                    const newFilters = isSelected
                                      ? practiceFilterState.custom_filters.filter((f: string) => f !== filter)
                                      : [...practiceFilterState.custom_filters, filter];
                                    setPracticeFilterState({ ...practiceFilterState, custom_filters: newFilters });
                                  }}
                                  className={`relative w-full flex items-center justify-between px-4 py-3 text-sm transition-all overflow-hidden ${
                                    index !== categoryFilters.length - 1 ? 'border-b border-black/[0.04]' : ''
                                  } hover:bg-black/[0.02] active:bg-black/[0.04]`}
                                >
                                  {/* Progress bar background */}
                                  <div className="absolute inset-0 flex">
                                    <div 
                                      className="bg-green-500/20 transition-all duration-300"
                                      style={{ width: `${correctPercent}%` }}
                                    />
                                    <div 
                                      className="bg-red-500/20 transition-all duration-300"
                                      style={{ width: `${incorrectPercent}%` }}
                                    />
                                  </div>
                                  
                                  <span className="relative text-stone-900 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    {filter}
                                  </span>
                                  <div className="relative flex items-center gap-2">
                                    <span className="text-xs text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                      {stats.total}
                                    </span>
                                    {isSelected && (
                                      <svg className="w-4 h-4 text-stone-900" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : filterOptions.custom_filters && filterOptions.custom_filters.length > 0 && (
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Tags</h4>
                    <div className="bg-white/60 backdrop-blur-xl rounded-xl border border-black/[0.06] overflow-hidden">
                      {filterOptions.custom_filters
                        .filter((filter: string) => {
                          // For uncategorized filters, check all categories for compatibility
                          if (Object.keys(compatibleFiltersByCategory).length === 0) return true;
                          return Object.values(compatibleFiltersByCategory).some((set: any) => set.has(filter));
                        })
                        .filter((filter: string) => filter.toLowerCase().includes(searchQuery.toLowerCase()))
                        .sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()))
                        .map((filter: string, index: number) => {
                        const isSelected = practiceFilterState.custom_filters.includes(filter);
                        const stats = filterCounts[filter] || { total: 0, correct: 0, incorrect: 0 };
                        const correctPercent = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                        const incorrectPercent = stats.total > 0 ? (stats.incorrect / stats.total) * 100 : 0;
                        
                        return (
                          <button
                            key={filter}
                            onClick={() => {
                              const newFilters = isSelected
                                ? practiceFilterState.custom_filters.filter((f: string) => f !== filter)
                                : [...practiceFilterState.custom_filters, filter];
                              setPracticeFilterState({ ...practiceFilterState, custom_filters: newFilters });
                            }}
                            className={`relative w-full flex items-center justify-between px-4 py-3 text-sm transition-all overflow-hidden ${
                              index !== filterOptions.custom_filters.length - 1 ? 'border-b border-black/[0.04]' : ''
                            } hover:bg-black/[0.02] active:bg-black/[0.04]`}
                          >
                            {/* Progress bar background */}
                            <div className="absolute inset-0 flex">
                              <div 
                                className="bg-green-500/20 transition-all duration-300"
                                style={{ width: `${correctPercent}%` }}
                              />
                              <div 
                                className="bg-red-500/20 transition-all duration-300"
                                style={{ width: `${incorrectPercent}%` }}
                              />
                            </div>
                            
                            <span className="relative text-stone-900 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                              {filter}
                            </span>
                            <div className="relative flex items-center gap-2">
                              <span className="text-xs text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {stats.total}
                              </span>
                              {isSelected && (
                                <svg className="w-4 h-4 text-stone-900" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

        </div>

        {/* Footer - Always visible */}
        <div className="border-t border-black/[0.06] bg-white/60 backdrop-blur-xl">
          {/* Active Filters */}
          {(practiceFilterState.mastery_levels.length > 0 || practiceFilterState.custom_filters.length > 0) && (
            <div className="px-6 md:px-12 py-4 border-b border-black/[0.06]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="text-[10px] uppercase tracking-widest text-stone-600" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Active Filters
                </h4>
                <button
                  onClick={() => {
                    setPracticeFilterState({
                      ...practiceFilterState,
                      mastery_levels: [],
                      custom_filters: []
                    });
                  }}
                  className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {practiceFilterState.mastery_levels.map((level: number) => {
                  const levelName = level === 0 ? 'Not Started' : level === 1 ? 'Needs Review' : 'Mastered';
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setPracticeFilterState({
                          ...practiceFilterState,
                          mastery_levels: practiceFilterState.mastery_levels.filter((l: number) => l !== level)
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-900 transition-colors"
                      style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
                    >
                      {levelName}
                      <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {practiceFilterState.custom_filters.map((filter: string) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setPracticeFilterState({
                        ...practiceFilterState,
                        custom_filters: practiceFilterState.custom_filters.filter((f: string) => f !== filter)
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-xs text-stone-900 transition-colors"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
                  >
                    {filter}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Start Practice Button */}
          <div className="px-6 md:px-12 py-6">
            <button
              onClick={selectedFormat ? handleStartPractice : undefined}
              disabled={!selectedFormat}
              className={`w-full px-8 py-4 rounded-full text-[11px] uppercase tracking-widest transition-all duration-300 ${
                selectedFormat
                  ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              <div className="flex items-center justify-center gap-2">
                <span>Start Practice</span>
                {selectedFormat && (
                  <span className="opacity-60">
                    ({filteredPracticeConcepts.length})
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
