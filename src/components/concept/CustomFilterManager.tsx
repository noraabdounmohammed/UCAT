import React, { useState } from 'react';
import { Plus, X, Tag, Folder } from 'lucide-react';

interface CustomFilter {
  id: string;
  name: string;
  category: string;
  color?: string;
  created_at: Date;
}

interface FilterCategory {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CustomFilterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customFilters: CustomFilter[];
  filterCategories: FilterCategory[];
  onCreateFilter: (filter: Omit<CustomFilter, 'id' | 'created_at'>) => void;
  onCreateCategory: (category: Omit<FilterCategory, 'id' | 'created_at'>) => void;
  onDeleteFilter: (filterId: string) => void;
}

export const CustomFilterManager: React.FC<CustomFilterManagerProps> = ({
  isOpen,
  onClose,
  customFilters,
  filterCategories,
  onCreateFilter,
  onCreateCategory,
  onDeleteFilter
}) => {
  const [newFilterName, setNewFilterName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [activeTab, setActiveTab] = useState<'filters' | 'categories'>('filters');

  const handleCreateFilter = () => {
    if (newFilterName.trim() && selectedCategory) {
      onCreateFilter({
        name: newFilterName.trim(),
        category: selectedCategory,
        color: filterCategories.find(c => c.name === selectedCategory)?.color || '#3B82F6'
      });
      setNewFilterName('');
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        order: filterCategories.length
      });
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
    }
  };

  const groupedFilters = customFilters.reduce((acc, filter) => {
    if (!acc[filter.category]) {
      acc[filter.category] = [];
    }
    acc[filter.category].push(filter);
    return acc;
  }, {} as Record<string, CustomFilter[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Custom Filter Manager
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('filters')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'filters'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Tag className="h-4 w-4 inline mr-2" />
            Filters
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Folder className="h-4 w-4 inline mr-2" />
            Categories
          </button>
        </div>

        {activeTab === 'filters' && (
          <div className="space-y-6">
            {/* Create New Filter */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Create New Filter
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Filter Name
                  </label>
                  <input
                    type="text"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    placeholder="e.g., ACS, Heart Failure, ECG"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Select a category</option>
                    {filterCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCreateFilter}
                  disabled={!newFilterName.trim() || !selectedCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Create Filter
                </button>
              </div>
            </div>

            {/* Existing Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Existing Filters ({customFilters.length})
              </h3>
              {Object.keys(groupedFilters).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No custom filters created yet. Create categories first, then add filters.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedFilters).map(([categoryName, filters]) => {
                    const category = filterCategories.find(c => c.name === categoryName);
                    return (
                      <div key={categoryName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <h4 
                          className="text-sm font-medium mb-2 flex items-center"
                          style={{ color: category?.color || '#6B7280' }}
                        >
                          <Folder className="h-4 w-4 mr-1" />
                          {categoryName}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {filters.map(filter => (
                            <span
                              key={filter.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                              style={{ 
                                backgroundColor: `${filter.color}20`,
                                color: filter.color,
                                border: `1px solid ${filter.color}40`
                              }}
                            >
                              {filter.name}
                              <button
                                onClick={() => onDeleteFilter(filter.id)}
                                className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Create New Category */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Create New Category
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Conditions, Systems, Procedures"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-12 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Create Category
                </button>
              </div>
            </div>

            {/* Existing Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Existing Categories ({filterCategories.length})
              </h3>
              {filterCategories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No categories created yet. Create categories to organize your filters.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filterCategories.map(category => (
                    <div
                      key={category.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {groupedFilters[category.name]?.length || 0} filters
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
