import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CurriculumPublishingService, PublishedCurriculum } from '@/services/curriculumPublishing';
import { AuthBar } from '@/components/auth/AuthBar';
import { Trash2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface CardData {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  content: string;
  category: string;
  country: string;
  imageUrl: string;
  curriculum?: PublishedCurriculum;
  comingSoon?: boolean;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isCreator } = useUserRole();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [publishedCurriculums, setPublishedCurriculums] = useState<PublishedCurriculum[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = CurriculumPublishingService.getCachedPublishedCurriculums();
    if (cached && cached.length > 0) {
      setPublishedCurriculums(cached);
      setIsLoading(false);
      // Refresh in background without showing spinner
      loadPublishedCurriculums(true);
    } else {
      loadPublishedCurriculums();
    }

    // Listen for published curriculum updates
    const handleRefresh = () => {
      console.log('📢 LandingPage: Received refresh event, reloading curriculums...');
      loadPublishedCurriculums(true);
    };
    window.addEventListener('published-curriculums-updated', handleRefresh);

    return () => {
      window.removeEventListener('published-curriculums-updated', handleRefresh);
    };
  }, []);

  const loadPublishedCurriculums = async (suppressLoading: boolean = false) => {
    if (!suppressLoading) setIsLoading(true);
    try {
      // Always bypass cache here so newly published curriculums show up immediately
      // even if this window has a stale cached list
      const published = await CurriculumPublishingService.getPublishedCurriculums({ useCache: false });
      setPublishedCurriculums(published);
    } catch (error) {
      console.error('Failed to load published curriculums:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Color palette - cycles through for variety regardless of category.
  // All entries are warm Stone variants to match the brand (no cool blues
  // / cyans / slates) — the previous palette mixed blue + cool grey, which
  // looked off-brand against the rest of the warm-Stone surfaces.
  const colorPalette = [
    {
      gradient: 'bg-gradient-to-br from-stone-200/60 to-stone-300/60',
      bg: 'bg-[#F5F1EC]' // Warm off-white
    },
    {
      gradient: 'bg-gradient-to-br from-red-300/40 to-rose-400/40',
      bg: 'bg-[#F0EBE6]' // Warm beige
    },
    {
      gradient: 'bg-gradient-to-br from-orange-300/40 to-amber-400/40',
      bg: 'bg-[#E8E3DC]' // Light tan
    },
    {
      gradient: 'bg-gradient-to-br from-stone-300/50 to-stone-400/50',
      bg: 'bg-[#E5E0D8]' // Warm grey
    },
    {
      gradient: 'bg-gradient-to-br from-green-300/40 to-emerald-400/40',
      bg: 'bg-[#E8F0E6]' // Soft green
    },
    { 
      gradient: 'bg-gradient-to-br from-purple-300/40 to-violet-400/40', 
      bg: 'bg-[#F0E8F6]' // Lavender
    },
    { 
      gradient: 'bg-gradient-to-br from-pink-300/40 to-rose-400/40', 
      bg: 'bg-[#F5E8F0]' // Blush
    },
    { 
      gradient: 'bg-gradient-to-br from-teal-300/40 to-cyan-400/40', 
      bg: 'bg-[#E6F2F0]' // Mint
    }
  ];

  // Show all published curriculums from Supabase
  const cards: CardData[] = React.useMemo(() => {
    const cardsList: CardData[] = [];
    
    // Map all published curriculums to cards
    publishedCurriculums.forEach((curriculum, index) => {
      const colorIndex = index % colorPalette.length;
      cardsList.push({
        id: curriculum.id,
        title: curriculum.name,
        color: colorPalette[colorIndex].gradient,
        bgColor: colorPalette[colorIndex].bg,
        content: curriculum.category,
        category: curriculum.category,
        country: curriculum.country,
        imageUrl: curriculum.imageUrl || `https://source.unsplash.com/400x600/?medical,${curriculum.category.toLowerCase()}`,
        curriculum: curriculum,
        comingSoon: false
      });
    });
    
    console.log('LandingPage: Showing all published curriculums:', cardsList.length);
    return cardsList;
  }, [publishedCurriculums]);

  const filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (searchQuery && filteredCards.length > 0) {
      setCurrentIndex(0);
    }
  }, [searchQuery, filteredCards.length]);

  const displayCards = searchQuery ? filteredCards : cards;

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev === displayCards.length - 1 ? 0 : prev + 1));
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev === 0 ? displayCards.length - 1 : prev - 1));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      setCurrentIndex((prev) => (prev === displayCards.length - 1 ? 0 : prev + 1));
    } else if (e.deltaY < 0) {
      setCurrentIndex((prev) => (prev === 0 ? displayCards.length - 1 : prev - 1));
    }
  };

  const getCardStyle = (index: number) => {
    const position = (index - currentIndex + displayCards.length) % displayCards.length;

    const baseStyle = {
      transition: 'all 700ms ease-out',
      transformStyle: 'preserve-3d' as const,
    };

    if (position === 0) {
      return {
        ...baseStyle,
        transform: 'translateX(0) translateY(0) scale(1) rotateY(0deg)',
        zIndex: 50,
        opacity: 1,
      };
    } else if (position === 1) {
      return {
        ...baseStyle,
        transform: 'translateX(96px) translateY(32px) scale(0.92) rotateY(-15deg)',
        zIndex: 40,
        opacity: 1,
      };
    } else if (position === 2) {
      return {
        ...baseStyle,
        transform: 'translateX(192px) translateY(64px) scale(0.84) rotateY(-20deg)',
        zIndex: 30,
        opacity: 1,
      };
    } else if (position === displayCards.length - 1) {
      return {
        ...baseStyle,
        transform: 'translateX(-96px) translateY(32px) scale(0.92) rotateY(15deg)',
        zIndex: 40,
        opacity: 1,
      };
    } else if (position === displayCards.length - 2) {
      return {
        ...baseStyle,
        transform: 'translateX(-192px) translateY(64px) scale(0.84) rotateY(20deg)',
        zIndex: 30,
        opacity: 1,
      };
    } else {
      return {
        ...baseStyle,
        transform: 'translateX(288px) translateY(96px) scale(0.76) rotateY(-25deg)',
        zIndex: 10,
        opacity: 0,
      };
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = window.confirm('Delete this curriculum from Expert? This cannot be undone.');
    if (!confirmed) return;

    try {
      const success = await CurriculumPublishingService.deletePublishedCurriculum(curriculumId);
      if (success) {
        // Reload curriculums
        await loadPublishedCurriculums();
        // Reset to first card if current card was deleted
        if (currentIndex >= publishedCurriculums.length - 1) {
          setCurrentIndex(Math.max(0, publishedCurriculums.length - 2));
        }
      } else {
        alert('Failed to delete curriculum.');
      }
    } catch (error) {
      console.error('Error deleting curriculum:', error);
      alert('Failed to delete curriculum.');
    }
  };

  const handleCardClick = async (index: number) => {
    const selectedCard = displayCards[index];
    
    if (index === currentIndex) {
      // Center card clicked
      
      // Check if it's a "coming soon" card
      if (selectedCard.comingSoon) {
        // Do nothing for coming soon cards
        return;
      }
      
      // Check if curriculum exists
      if (!selectedCard.curriculum) {
        console.error('No curriculum data available');
        return;
      }
      
      // Allow users to explore curriculum without signing in
      // Import curriculum in background and navigate immediately
      // Store curriculum data for import after navigation
      sessionStorage.setItem('pendingCurriculumImport', JSON.stringify(selectedCard.curriculum));
      sessionStorage.setItem('fromLandingPage', 'true');
      
      // Navigate immediately - import will happen in CurriculumApp
      navigate('/concept-practice');
    } else {
      // Side card clicked - bring to center
      setCurrentIndex(index);
    }
  };

  return (
    <div className={`h-screen ${displayCards[currentIndex]?.bgColor || 'bg-[#F5F1EC]'} dark:bg-stone-950 flex flex-col transition-colors duration-700 overflow-hidden relative`}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

      {/* Minimal Top Bar - Floating Sign In */}
      <div className="fixed top-6 right-6 z-40">
        <AuthBar />
      </div>

      {/* Try Study Mode CTA */}
      <div className="mx-4 my-4 flex-shrink-0 relative z-30">
        <div className="bg-gradient-to-br from-stone-900 to-stone-700 text-white px-6 py-5 rounded-2xl shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/70">New</div>
              <div className="text-lg font-semibold">3-min retrieval sessions</div>
              <p className="text-sm text-white/80 mt-1">FSRS-5 spaced repetition. Made by a doctor for UKMLA.</p>
            </div>
            <Link
              to="/study"
              className="px-5 py-2.5 bg-white text-stone-900 rounded-full text-sm font-medium hover:bg-stone-100 transition-colors whitespace-nowrap"
            >
              Try Study Mode
            </Link>
          </div>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 text-center mt-2">
          Made by a UK doctor. Every question signed off by a clinician.
        </p>
      </div>

      {/* Header */}
      <div className="w-full px-8 pt-16 pb-0 flex-shrink-0">
        <div className="max-w-6xl mx-auto w-full text-center">
          <div className="inline-block relative mb-8">
            <h1 className="font-bold text-stone-800 tracking-tight transition-all duration-700 mb-0" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500, letterSpacing: '-0.02em', lineHeight: '1.2' }}>
              <span className="text-[38px] md:text-[60px] whitespace-nowrap">Elevated</span><br />
              <span className="text-[38px] md:text-[60px] whitespace-nowrap">Exam Prep</span>
            </h1>
            <div className="h-[1px] w-20 bg-stone-400 mx-auto mt-6"></div>
          </div>
          <p className="text-xl md:text-2xl text-stone-600 tracking-normal transition-all duration-700" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            for the <span className="font-semibold text-stone-800">{displayCards[currentIndex]?.title || 'Medical Education'}</span>
          </p>
        </div>
      </div>

      {/* Main Carousel Container */}
      <div
        className="flex-1 flex items-center justify-center perspective-[2000px] relative overflow-hidden min-h-0 -mt-12"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-300 border-t-stone-800"></div>
            <div className="text-stone-600 text-xl font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Loading curriculums...
            </div>
          </div>
        ) : displayCards.length === 0 ? (
          <div className="text-stone-600 text-2xl font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
            No curriculums found
          </div>
        ) : (
          <div className="relative w-[224px] h-[336px]" style={{ perspective: '2000px' }}>
            {displayCards.map((card, index) => (
              <div
                key={card.id}
                className={`absolute inset-0 ${card.comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                style={getCardStyle(index)}
                onClick={() => handleCardClick(index)}
              >
                <div className="w-full h-full rounded-3xl shadow-2xl flex flex-col items-center justify-center overflow-hidden relative border border-white/10">
                  {/* Glass effect layers - hide on center card for clarity */}
                  {index !== currentIndex && (
                    <>
                      <div className="absolute inset-0 backdrop-blur-xl bg-white/5"></div>
                      <div className="absolute inset-0 backdrop-blur-lg bg-white/3"></div>
                    </>
                  )}

                  {/* Background Image */}
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className={`absolute inset-0 w-full h-full object-cover ${index === currentIndex ? 'opacity-100' : 'opacity-70 grayscale'}`}
                    style={{ objectPosition: 'center', transform: 'scale(0.85)' }}
                    onLoad={() => {
                      console.log('LandingPage: image loaded for', card.title, card.imageUrl);
                    }}
                    onError={(e) => {
                      // Try a reliable Unsplash fallback once before hiding
                      const img = e.currentTarget as HTMLImageElement;
                      if (!(img as any).dataset.fallbackTried) {
                        (img as any).dataset.fallbackTried = 'true';
                        img.src = 'https://images.unsplash.com/photo-1554774853-719586f8d76d?auto=format&fit=crop&w=800&q=60';
                        console.warn('LandingPage: primary image failed, using fallback for', card.title);
                        return;
                      }
                      // Hide only if fallback also fails
                      img.style.display = 'none';
                      console.error('LandingPage: fallback image also failed for', card.title);
                    }}
                  />

                  {/* Gradient overlay - only for non-center cards */}
                  <div className={`absolute inset-0 ${card.color} transition-opacity duration-700`} style={{ opacity: index === currentIndex ? 0 : 0.6 }}></div>
                  
                  {/* Delete button - only show on center card if not coming soon and user is creator */}
                  {index === currentIndex && !card.comingSoon && card.curriculum && isCreator && CurriculumPublishingService.canDeleteCurriculum(card.id) && (
                    <button
                      onClick={(e) => handleDeleteCurriculum(card.id, e)}
                      className="absolute top-4 right-4 z-20 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
                      title="Delete curriculum"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Coming Soon Badge */}
                  {card.comingSoon && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="bg-stone-900/90 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                        <span className="text-white text-sm uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="w-full px-8 pt-6 pb-4 flex-shrink-0">
        <div className="max-w-xl mx-auto w-full">
          <div className="relative group">
            <input
              type="text"
              placeholder="search curriculums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-16 py-3 bg-white/60 backdrop-blur-sm border border-stone-200/50 rounded-full text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300/50 focus:bg-white/80 transition-all text-center font-['Manrope']"
              style={{ fontWeight: 300 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors text-sm font-['Manrope']"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-8 py-4 flex justify-between items-center text-stone-400 text-[10px] uppercase tracking-widest flex-shrink-0 border-t border-stone-300/20 font-['Unbounded']" style={{ fontWeight: 500 }}>
        <div className="flex items-center gap-2 invisible">
          <div className="w-1 h-1 bg-stone-400 rounded-full"></div>
          <span>Est. 2024</span>
        </div>
        <div className="hidden md:block font-light invisible">Excellence in Medical Education</div>
        <button 
          onClick={() => navigate('/concept-practice')}
          className="px-4 py-1.5 bg-stone-800/5 border border-stone-300/30 rounded-full hover:bg-stone-800/10 hover:border-stone-300/50 transition-all text-xs font-light invisible"
        >
          Browse All
        </button>
      </footer>
    </div>
  );
};

export default LandingPage;
