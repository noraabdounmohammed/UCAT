import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, Star, Clock, BookOpen, User, Search, Trash2, MoreVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurriculumPublishingService, PublishedCurriculum, WORLD_COUNTRIES, EXAM_CATEGORIES } from '@/services/curriculumPublishing';
import { useAuth } from '@/contexts/AuthContext';

interface ImportExpertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (curriculumId: string) => void;
}

export const ImportExpertModal: React.FC<ImportExpertModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const { user } = useAuth();
  const [publishedCurriculums, setPublishedCurriculums] = useState<PublishedCurriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryButtonRef = useRef<HTMLButtonElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const [countryPos, setCountryPos] = useState<{top:number; left:number; width:number}>({top:0,left:0,width:0});
  const [categoryPos, setCategoryPos] = useState<{top:number; left:number; width:number}>({top:0,left:0,width:0});

  useEffect(() => {
    if (isOpen) {
      loadPublishedCurriculums();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };

    if (countryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [countryDropdownOpen]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };

    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [categoryDropdownOpen]);

  const loadPublishedCurriculums = async () => {
    setLoading(true);
    try {
      const curriculums = await CurriculumPublishingService.getPublishedCurriculums();
      setPublishedCurriculums(curriculums);
    } catch (error) {
      console.error('Error loading published curriculums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (curriculum: PublishedCurriculum) => {
    setImporting(curriculum.id);
    try {
      const newCurriculumId = await CurriculumPublishingService.importCurriculum(curriculum, user?.id);
      onImport(newCurriculumId);
      onClose();
    } catch (error) {
      console.error('Error importing curriculum:', error);
      alert('Failed to import curriculum. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  const handleDelete = async (curriculum: PublishedCurriculum) => {
    if (!CurriculumPublishingService.canDeleteCurriculum(curriculum.id)) {
      alert('Cannot delete this curriculum. Only user-published curriculums can be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${curriculum.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(curriculum.id);
    try {
      const success = await CurriculumPublishingService.deletePublishedCurriculum(curriculum.id);
      if (success) {
        // Reload the curriculums list to reflect the deletion
        await loadPublishedCurriculums();
        setOpenDropdown(null);
      } else {
        alert('Failed to delete curriculum. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting curriculum:', error);
      alert('Failed to delete curriculum. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const filteredCurriculums = publishedCurriculums.filter(curriculum => {
    const matchesSearch = curriculum.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         curriculum.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || curriculum.category === selectedCategory;
    const matchesCountry = selectedCountry === 'all' || 
                          curriculum.country === selectedCountry;
    
    return matchesSearch && matchesCategory && matchesCountry;
  });

  const categories = EXAM_CATEGORIES;
  // Use the full world countries list instead of just the ones in mock data
  const countries = WORLD_COUNTRIES;
  
  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const handleCountrySelect = (countryName: string) => {
    setSelectedCountry(countryName);
    setCountryDropdownOpen(false);
    setCountrySearchQuery('');
  };

  const getSelectedCountryDisplay = () => {
    if (selectedCountry === 'all') return 'Filter by country';
    const country = countries.find(c => c.name === selectedCountry);
    return country ? `${country.flag} ${country.name}` : selectedCountry;
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCategoryDropdownOpen(false);
  };

  const getSelectedCategoryDisplay = () => {
    if (selectedCategory === 'all') return 'Filter by category';
    const category = categories.find(c => c.name === selectedCategory);
    return category ? `${category.icon} ${category.name}` : selectedCategory;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4" 
      style={{ backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-8 flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
          <h2 className="text-[28px] font-semibold text-gray-900 dark:text-white mb-2">
            Import Expert Curriculum
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400">
            Choose from professionally curated curriculums created by medical educators
          </p>
        </div>

        {/* Filters - Apple HIG Liquid Glass Design */}
        <div className="relative z-[9999] px-8 py-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search curriculums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/30 transition-all"
              />
            </div>

            {/* Country Filter - Searchable Dropdown */}
            <div className="relative lg:min-w-[220px]" ref={countryDropdownRef}>
              <button
                ref={countryButtonRef}
                onClick={() => {
                  const rect = countryButtonRef.current?.getBoundingClientRect();
                  if (rect) {
                    setCountryPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                  }
                  setCountryDropdownOpen(!countryDropdownOpen);
                }}
                className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white flex items-center justify-between hover:bg-white/90 dark:hover:bg-zinc-800/90 transition-all focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/30"
              >
                <span className="truncate">{getSelectedCountryDisplay()}</span>
                <ChevronDown className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2" />
              </button>
              
              {countryDropdownOpen && ReactDOM.createPortal(
                <div
                  className="fixed bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl z-[99999] max-h-80 overflow-hidden"
                  style={{ top: countryPos.top, left: countryPos.left, width: countryPos.width }}
                >
                  {/* Search input */}
                  <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white/60 dark:bg-zinc-700/60 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-[14px] text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/40 transition-all"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {/* Options list */}
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      onClick={() => handleCountrySelect('all')}
                      className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] transition-colors"
                    >
                      Filter by country
                    </button>
                    {filteredCountries.map(country => (
                      <button
                        key={country.name}
                        onClick={() => handleCountrySelect(country.name)}
                        className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] flex items-center gap-3 transition-colors"
                      >
                        <span className="text-[16px]">{country.flag}</span>
                        <span className="truncate">{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>, document.body)
              }
            </div>

            {/* Category Filter - Custom Apple Dropdown */}
            <div className="relative lg:min-w-[200px]" ref={categoryDropdownRef}>
              <button
                ref={categoryButtonRef}
                onClick={() => {
                  const rect = categoryButtonRef.current?.getBoundingClientRect();
                  if (rect) {
                    setCategoryPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                  }
                  setCategoryDropdownOpen(!categoryDropdownOpen);
                }}
                className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white flex items-center justify-between hover:bg-white/90 dark:hover:bg-zinc-800/90 transition-all focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/30"
              >
                <span className="truncate">{getSelectedCategoryDisplay()}</span>
                <ChevronDown className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2" />
              </button>
              
              {categoryDropdownOpen && ReactDOM.createPortal(
                <div
                  className="fixed bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl z-[99999] max-h-80 overflow-hidden"
                  style={{ top: categoryPos.top, left: categoryPos.left, width: categoryPos.width }}
                >
                  {/* Options list */}
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      onClick={() => handleCategorySelect('all')}
                      className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] transition-colors"
                    >
                      Filter by category
                    </button>
                    {categories.map(category => (
                      <button
                        key={category.name}
                        onClick={() => handleCategorySelect(category.name)}
                        className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] flex items-center gap-3 transition-colors"
                      >
                        <span className="text-[16px]">{category.icon}</span>
                        <span className="truncate">{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>, document.body)
              }
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading curriculums...</span>
            </div>
          ) : filteredCurriculums.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No curriculums found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCurriculums.map((curriculum) => (
                <div
                  key={curriculum.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${curriculum.color}`}></div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{curriculum.name}</h3>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                          v{curriculum.version}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {curriculum.description}
                      </p>
                    </div>
                    
                    {/* Dropdown Menu - Only show for user-published curriculums */}
                    {CurriculumPublishingService.canDeleteCurriculum(curriculum.id) && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === curriculum.id ? null : curriculum.id);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>

                        {openDropdown === curriculum.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[60]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(curriculum);
                              }}
                              disabled={deleting === curriculum.id}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center disabled:opacity-50"
                            >
                              {deleting === curriculum.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600 mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <User className="h-3 w-3 mr-1" />
                      {curriculum.author}
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {curriculum.conceptCount} concepts
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {curriculum.estimatedHours}h study time
                    </div>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Download className="h-3 w-3 mr-1" />
                      {curriculum.downloadCount.toLocaleString()} downloads
                    </div>
                  </div>

                  {/* Rating and Difficulty */}
                  <div className="flex items-center mb-4">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      {curriculum.rating}
                    </span>
                  </div>

                  {/* Import Button */}
                  <Button
                    onClick={() => handleImport(curriculum)}
                    disabled={importing === curriculum.id}
                    className="w-full"
                  >
                    {importing === curriculum.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import Curriculum
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            All curriculums are created by verified medical educators and regularly updated with the latest guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};
