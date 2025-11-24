import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurriculumPublishingService, PublishedCurriculum } from '@/services/curriculumPublishing';
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
  curriculum: PublishedCurriculum;
}

export const CurriculumLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isCreator } = useUserRole();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [publishedCurriculums, setPublishedCurriculums] = useState<PublishedCurriculum[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = CurriculumPublishingService.getCachedPublishedCurriculums();
    if (cached && cached.length > 0) {
      setPublishedCurriculums(cached);
      setIsLoading(false);
      // Refresh in background silently
      loadPublishedCurriculums(true);
    } else {
      loadPublishedCurriculums();
    }

    // Listen for published curriculum updates
    const handleRefresh = () => {
      console.log('📢 CurriculumLandingPage: Received refresh event, reloading curriculums...');
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
      const published = await CurriculumPublishingService.getPublishedCurriculums();
      console.log('📚 Loaded published curriculums:', published.length, published);
      setPublishedCurriculums(published);
    } catch (error) {
      console.error('Failed to load published curriculums:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Color palette - cycles through for variety regardless of category
  const colorPalette = [
    { 
      gradient: 'bg-gradient-to-br from-blue-300/40 to-cyan-400/40', 
      bg: 'bg-[#E8F2F6]' // Soft blue
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
      gradient: 'bg-gradient-to-br from-slate-400/40 to-gray-500/40', 
      bg: 'bg-[#D4CFC7]' // Cool gray
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

  const cards: CardData[] = publishedCurriculums.map((curriculum, index) => {
    // Cycle through color palette for variety
    const colors = colorPalette[index % colorPalette.length];
    // Use custom image if available, otherwise generate placeholder from Unsplash
    const imageUrl = curriculum.imageUrl || 
      `https://source.unsplash.com/400x600/?medical,${curriculum.category.toLowerCase().replace(/\s+/g, '-')}`;
    
    return {
      id: curriculum.id,
      title: curriculum.name,
      color: colors.gradient,
      bgColor: colors.bg,
      content: curriculum.category,
      category: curriculum.category,
      country: curriculum.country,
      imageUrl: imageUrl,
      curriculum
    };
  });

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

    if (position === 0) {
      return {
        transform: 'translateX(0) translateY(0) scale(1) rotateY(0deg)',
        zIndex: 50,
        opacity: 1,
      };
    } else if (position === 1) {
      return {
        transform: 'translateX(120px) translateY(40px) scale(0.92) rotateY(-15deg)',
        zIndex: 40,
        opacity: 1,
      };
    } else if (position === 2) {
      return {
        transform: 'translateX(240px) translateY(80px) scale(0.84) rotateY(-20deg)',
        zIndex: 30,
        opacity: 1,
      };
    } else if (position === displayCards.length - 1) {
      return {
        transform: 'translateX(-120px) translateY(40px) scale(0.92) rotateY(15deg)',
        zIndex: 40,
        opacity: 1,
      };
    } else if (position === displayCards.length - 2) {
      return {
        transform: 'translateX(-240px) translateY(80px) scale(0.84) rotateY(20deg)',
        zIndex: 30,
        opacity: 1,
      };
    } else {
      return {
        transform: 'translateX(360px) translateY(120px) scale(0.76) rotateY(-25deg)',
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
    if (index === currentIndex) {
      // Center card clicked - import and navigate to curriculum
      const selectedCurriculum = displayCards[index].curriculum;
      
      setIsImporting(true);
      try {
        console.log('🔵 Importing curriculum:', selectedCurriculum.name);
        const newCurriculumId = await CurriculumPublishingService.importCurriculum(selectedCurriculum);
        console.log('✅ Import successful, new ID:', newCurriculumId);
        
        // Small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Store curriculum ID in sessionStorage for auto-open
        console.log('📝 Setting sessionStorage:', {
          autoOpenCurriculumId: newCurriculumId,
          fromLandingPage: true
        });
        sessionStorage.setItem('autoOpenCurriculumId', newCurriculumId);
        sessionStorage.setItem('fromLandingPage', 'true');
        
        // Verify it was set
        console.log('✅ SessionStorage set:', {
          autoOpenCurriculumId: sessionStorage.getItem('autoOpenCurriculumId'),
          fromLandingPage: sessionStorage.getItem('fromLandingPage')
        });
        
        // Navigate to concept practice
        navigate('/concept-practice');
      } catch (error) {
        console.error('❌ Failed to import curriculum:', error);
        alert('Failed to import curriculum. Please try again.');
        setIsImporting(false);
      }
    } else {
      // Side card clicked - bring to center
      setCurrentIndex(index);
    }
  };

  return (
    <div className={`h-screen ${displayCards[currentIndex]?.bgColor || 'bg-[#E8F2F6]'} flex flex-col transition-colors duration-700 overflow-hidden relative`}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

      {/* Importing overlay */}
      {isImporting && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-300 border-t-stone-800 mb-4"></div>
              <p className="text-lg font-medium text-stone-800 dark:text-stone-100" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                Importing Curriculum...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Back Button - Floating */}
      <div className="fixed top-6 left-6 z-40">
        <button
          onClick={() => navigate('/concept-practice')}
          className="p-3 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full hover:bg-white/80 hover:border-black/[0.12] transition-all duration-300 text-stone-600 hover:text-stone-900"
          title="Back to Curriculum Hub"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {/* Header */}
      <div className="w-full px-8 pt-12 pb-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto w-full text-center">
          <div className="inline-block relative">
            <h1 className="text-6xl md:text-7xl font-bold text-stone-800 tracking-tight transition-all duration-700 mb-0" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' }}>
              Expert Curriculums
            </h1>
            <div className="h-[1px] w-16 bg-stone-300 mx-auto mt-3"></div>
          </div>
          <p className="text-xl md:text-2xl text-stone-600 tracking-normal transition-all duration-700 mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            {displayCards[currentIndex]?.title || 'Medical Education'}
          </p>
        </div>
      </div>

      {/* Main Carousel Container */}
      <div
        className="flex-1 flex items-center justify-center perspective-[2000px] relative overflow-hidden min-h-0"
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
          <div className="relative w-[280px] h-[420px]" style={{ perspective: '2000px' }}>
            {displayCards.map((card, index) => (
              <div
                key={card.id}
                className="absolute inset-0 transition-all duration-700 ease-out cursor-pointer"
                style={getCardStyle(index)}
                onClick={() => handleCardClick(index)}
              >
                <div className="w-full h-full rounded-3xl shadow-2xl flex flex-col items-center justify-center overflow-hidden relative border border-white/10">
                  {/* Glass effect layers */}
                  <div className="absolute inset-0 backdrop-blur-xl bg-white/5"></div>
                  <div className="absolute inset-0 backdrop-blur-lg bg-white/3"></div>

                  {/* Background Image */}
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70 grayscale"
                    style={{ objectPosition: 'center', transform: 'scale(0.85)' }}
                    onError={(e) => {
                      // Fallback to a solid pattern if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  {/* Gradient overlay - only for non-center cards */}
                  <div className={`absolute inset-0 ${card.color} transition-opacity duration-700`} style={{ opacity: index === currentIndex ? 0 : 0.6 }}></div>
                  
                  {/* Delete button - only show on center card and for creators */}
                  {index === currentIndex && isCreator && CurriculumPublishingService.canDeleteCurriculum(card.id) && (
                    <button
                      onClick={(e) => handleDeleteCurriculum(card.id, e)}
                      className="absolute top-4 right-4 z-20 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
                      title="Delete curriculum"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="w-full px-8 pt-6 pb-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto w-full">
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

export default CurriculumLandingPage;
