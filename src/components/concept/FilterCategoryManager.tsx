import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { FilterCategory } from '@/types/conceptTypes';
import { Plus, Edit3, Trash2, Folder, Tag, X } from 'lucide-react';

interface FilterCategoryManagerProps {
  onClose: () => void;
}

export const FilterCategoryManager: React.FC<FilterCategoryManagerProps> = ({ onClose }) => {
  // Handle keyboard events (Escape to close)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FilterCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [draggedFilter, setDraggedFilter] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [editingFilter, setEditingFilter] = useState<string | null>(null);
  const [newFilterName, setNewFilterName] = useState('');
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<number | null>(null);

  const store = useConceptStore() as any;
  const { 
    customFilters,
    filterOptions,
    createFilterCategory, 
    updateFilterCategory, 
    deleteFilterCategory,
    updateCustomFilter,
    deleteCustomFilter,
    concepts,
    updateConcept,
    curriculumId
  } = store;

  // Read filter categories from localStorage directly so they update when refreshTrigger changes
  const filterCategories = React.useMemo(() => {
    try {
      const categoriesKey = `${curriculumId}_filter_categories`;
      const stored = localStorage.getItem(categoriesKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [curriculumId, refreshTrigger]);

  // curriculumId now comes directly from the curriculum-specific concept store context
  // This guarantees we read/write assignments for the active curriculum

  // Get filter assignments with fallback logic (same as ConceptFilterPanel)
  const filterAssignments = React.useMemo(() => {
    const primaryKey = `${curriculumId}_filter_assignments`;
    let stored = localStorage.getItem(primaryKey);
    let usedKey = primaryKey;
    
    // If no assignments found with current curriculum ID, try to find alternative keys
    if (!stored) {
      // Extract base curriculum ID (remove import prefixes and suffixes)
      const baseCurriculumId = curriculumId.replace(/^imported-pub-/, '').split('-')[0];
      
      // Look for any assignment keys that contain the base curriculum ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('filter_assignments') && key.includes(baseCurriculumId)) {
          stored = localStorage.getItem(key);
          usedKey = key;
          break;
        }
      }
    }
    
    const assignments = stored ? JSON.parse(stored) : {};
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🏷️ FilterCategoryManager Assignments Debug:', {
        curriculumId,
        primaryKey,
        usedKey,
        foundAssignments: !!stored,
        assignments,
        assignmentCount: Object.keys(assignments).length
      });
    }
    
    return assignments;
  }, [curriculumId, refreshTrigger, filterCategories, filterOptions?.custom_filters]);

  // Helper function to rename a filter
  const renameFilter = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    
    console.log(`✏️ Renaming filter from "${oldName}" to "${newName}"`);
    
    // Update assignments
    const assignmentKey = `${curriculumId}_filter_assignments`;
    const currentAssignments = { ...filterAssignments };
    if (currentAssignments[oldName]) {
      currentAssignments[newName] = currentAssignments[oldName];
      delete currentAssignments[oldName];
      localStorage.setItem(assignmentKey, JSON.stringify(currentAssignments));
    }
    
    // Update all concepts that have this filter
    let conceptsUpdated = 0;
    concepts.forEach((concept: any) => {
      if (concept.custom_filters?.includes(oldName)) {
        const updatedFilters = (concept.custom_filters as string[]).map((f: string) => 
          f === oldName ? newName : f
        );
        updateConcept(concept.concept_id, {
          ...concept,
          custom_filters: updatedFilters
        });
        conceptsUpdated++;
      }
    });
    
    console.log(`✅ Renamed filter in ${conceptsUpdated} concepts`);
    
    // Force refresh to update the UI
    setRefreshTrigger(prev => prev + 1);
    setEditingFilter(null);
    setNewFilterName('');
  };

  // Helper function to delete a filter by name
  const deleteFilterByName = (filterName: string) => {
    console.log(`🗑️ Starting deletion of filter: ${filterName}`);
    
    // Remove from assignments
    const assignmentKey = `${curriculumId}_filter_assignments`;
    const currentAssignments = { ...filterAssignments };
    delete currentAssignments[filterName];
    localStorage.setItem(assignmentKey, JSON.stringify(currentAssignments));
    console.log('✅ Removed from assignments');

    // Remove from all concepts that have this filter
    let conceptsUpdated = 0;
    concepts.forEach((concept: any) => {
      if (concept.custom_filters?.includes(filterName)) {
        const updatedFilters = (concept.custom_filters as string[]).filter((f: string) => f !== filterName);
        updateConcept(concept.concept_id, {
          ...concept,
          custom_filters: updatedFilters
        });
        conceptsUpdated++;
      }
    });
    
    console.log(`✅ Removed filter from ${conceptsUpdated} concepts`);
    console.log(`🎯 Filter "${filterName}" completely deleted from system`);

    // Force refresh to update the UI
    setRefreshTrigger(prev => prev + 1);
  };

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Orange' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' },
    { value: '#6366F1', name: 'Indigo' },
    { value: '#14B8A6', name: 'Teal' }
  ];

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createFilterCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        color: newCategoryColor
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryColor('#3B82F6');
      setShowCreateCategory(false);
    }
  };

  const handleUpdateCategory = () => {
    if (editingCategory && newCategoryName.trim()) {
      updateFilterCategory(editingCategory.id, {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        color: newCategoryColor
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryColor('#3B82F6');
    }
  };

  const handleEditCategory = (category: FilterCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryColor(category.color || '#3B82F6');
    setShowCreateCategory(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? Filters in this category will become uncategorized.')) {
      // Remove category from any filters that use it
      customFilters.forEach((filter: any) => {
        if (filter.category_id === categoryId) {
          updateCustomFilter(filter.id, { category_id: undefined });
        }
      });
      deleteFilterCategory(categoryId);
    }
  };

  // Handle category reordering
  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    console.log('🚀 Drag started:', categoryId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCategoryId(categoryId);
  };

  const handleCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    console.log('👆 Dragging over index:', index);
    setDragOverCategoryIndex(index);
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Drop event triggered!', {
      draggedCategoryId,
      dropIndex,
      currentCategories: filterCategories.map((c: FilterCategory) => c.name)
    });
    
    if (!draggedCategoryId) {
      console.log('❌ No dragged category ID');
      return;
    }
    
    const draggedIndex = filterCategories.findIndex((cat: FilterCategory) => cat.id === draggedCategoryId);
    
    console.log('📍 Drag details:', {
      draggedIndex,
      dropIndex,
      samePosition: draggedIndex === dropIndex
    });
    
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedCategoryId(null);
      setDragOverCategoryIndex(null);
      return;
    }

    // Reorder categories
    const newCategories = [...filterCategories];
    const [draggedCategory] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(dropIndex, 0, draggedCategory);

    console.log('✅ New order:', newCategories.map((c: FilterCategory) => c.name));

    // Save to localStorage directly
    const categoriesKey = `${curriculumId}_filter_categories`;
    localStorage.setItem(categoriesKey, JSON.stringify(newCategories));
    
    console.log('💾 Saved to localStorage key:', categoriesKey);
    
    // Force component to re-render with new data from localStorage
    setRefreshTrigger(prev => prev + 1);
    
    setDraggedCategoryId(null);
    setDragOverCategoryIndex(null);
  };

  const handleCategoryDragEnd = () => {
    console.log('🏁 Drag ended');
    setDraggedCategoryId(null);
    setDragOverCategoryIndex(null);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose} // Close when clicking outside
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Filter Categories</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Organize your custom filters into categories for better management
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <Folder className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Categories
              </h3>
              <button
                onClick={() => {
                  setShowCreateCategory(true);
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                  setNewCategoryColor('#3B82F6');
                }}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Category
              </button>
            </div>

            {/* Create/Edit Category Form */}
            {(showCreateCategory || editingCategory) && (
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <h4 className="text-sm font-medium mb-3">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      placeholder="Category name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setNewCategoryColor(color.value)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newCategoryColor === color.value 
                              ? 'border-gray-900 dark:border-gray-100' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateCategory(false);
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewCategoryDescription('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="space-y-2">
              {filterCategories.map((category: FilterCategory, index: number) => (
                <div 
                  key={category.id} 
                  draggable
                  onDragStart={(e) => handleCategoryDragStart(e, category.id)}
                  onDragOver={(e) => handleCategoryDragOver(e, index)}
                  onDrop={(e) => handleCategoryDrop(e, index)}
                  onDragEnd={handleCategoryDragEnd}
                  className={`p-3 border rounded-lg cursor-move transition-all ${
                    draggedCategoryId === category.id 
                      ? 'opacity-50 border-blue-500 dark:border-blue-400' 
                      : dragOverCategoryIndex === index
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.name}
                        </h4>
                        {category.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(filterOptions.custom_filters?.filter((filterName: string) => 
                          filterAssignments[filterName] === category.id
                        ) || []).length} filters
                      </span>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filterCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No categories yet</p>
                  <p className="text-xs">Create your first category to organize filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Filters Assignment Section */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              Filter Assignment
            </h3>

            {/* Categorized Filters */}
            {filterCategories.map((category: FilterCategory) => {
              // Get filters assigned to this category from filterAssignments
              const assignedFilters = filterOptions.custom_filters?.filter((filterName: string) => 
                filterAssignments[filterName] === category.id
              ) || [];
              
              return (
                <div 
                  key={category.id} 
                  className={`mb-4 transition-all duration-200 ${
                    dragOverCategory === category.id 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10' 
                      : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverCategory(category.id);
                  }}
                  onDragLeave={() => setDragOverCategory(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedFilter) {
                      const assignmentKey = `${curriculumId}_filter_assignments`;
                      const currentAssignments = { ...filterAssignments };
                      currentAssignments[draggedFilter] = category.id;
                      localStorage.setItem(assignmentKey, JSON.stringify(currentAssignments));
                      setRefreshTrigger(prev => prev + 1);
                      setDraggedFilter(null);
                      setDragOverCategory(null);
                    }
                  }}
                >
                  <div className="flex items-center mb-2">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {category.name} ({assignedFilters.length})
                    </h4>
                  </div>
                  <div className="ml-5 space-y-1">
                    {assignedFilters.map((filterName: string) => (
                      <div 
                        key={filterName} 
                        draggable={editingFilter !== filterName}
                        onDragStart={(e) => {
                          setDraggedFilter(filterName as string);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDraggedFilter(null)}
                        className={`flex items-center justify-between p-2 text-sm transition-opacity ${
                          draggedFilter === filterName ? 'opacity-30' : ''
                        }`}
                      >
                        {editingFilter === filterName ? (
                          <input
                            type="text"
                            value={newFilterName}
                            onChange={(e) => setNewFilterName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                renameFilter(filterName, newFilterName);
                              } else if (e.key === 'Escape') {
                                setEditingFilter(null);
                                setNewFilterName('');
                              }
                            }}
                            onBlur={() => {
                              if (newFilterName.trim()) {
                                renameFilter(filterName, newFilterName);
                              } else {
                                setEditingFilter(null);
                                setNewFilterName('');
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">{filterName}</span>
                        )}
                        <div className="flex items-center gap-2">
                          {editingFilter !== filterName && (
                            <button
                              onClick={() => {
                                setEditingFilter(filterName);
                                setNewFilterName(filterName);
                              }}
                              className="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Edit filter name"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Remove assignment by updating localStorage
                              const assignmentKey = `${curriculumId}_filter_assignments`;
                              const currentAssignments = { ...filterAssignments };
                              delete currentAssignments[filterName];
                              localStorage.setItem(assignmentKey, JSON.stringify(currentAssignments));
                              // Force re-render
                              setRefreshTrigger(prev => prev + 1);
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Remove from category"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete the filter "${filterName}"? This will remove it from all concepts and cannot be undone.`)) {
                                deleteFilterByName(filterName);
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                            title="Delete filter permanently"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Available Filters (Unassigned) */}
            {filterOptions && filterOptions.custom_filters && filterOptions.custom_filters.length > 0 && (
              <div className="mb-4">
                {(() => {
                  // Get filters that are not assigned to any category
                  const unassignedFilters = filterOptions.custom_filters.filter((filterName: string) => 
                    !filterAssignments[filterName]
                  );

                  if (unassignedFilters.length === 0) {
                    return (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        <Tag className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">All filters are assigned to categories</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Unassigned Filters ({unassignedFilters.length})
                      </h4>
                      <div className="space-y-1">
                        {unassignedFilters.map((filterName: string) => (
                          <div 
                            key={filterName} 
                            draggable
                            onDragStart={(e) => {
                              setDraggedFilter(filterName);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => setDraggedFilter(null)}
                            className={`flex items-center justify-between p-2 text-sm transition-opacity ${
                              draggedFilter === filterName ? 'opacity-30' : ''
                            }`}
                          >
                            <span className="text-gray-700 dark:text-gray-300">{filterName}</span>
                            <div className="flex items-center gap-2">
                              <select
                                value={filterAssignments[filterName] || ''}
                                onChange={(e) => {
                                  const categoryId = e.target.value;
                                  // Store filter-to-category assignment in localStorage
                                  const assignmentKey = `${curriculumId}_filter_assignments`;
                                  const currentAssignments = { ...filterAssignments };
                                  
                                  if (categoryId) {
                                    currentAssignments[filterName] = categoryId;
                                    console.log(`Assigned ${filterName} to category ${categoryId}`);
                                  } else {
                                    // Remove assignment if "Select category" is chosen
                                    delete currentAssignments[filterName];
                                    console.log(`Removed assignment for ${filterName}`);
                                  }
                                  
                                  localStorage.setItem(assignmentKey, JSON.stringify(currentAssignments));
                                  
                                  // Force a re-render by updating a state
                                  setRefreshTrigger(prev => prev + 1);
                                }}
                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                              >
                                <option value="">Select category</option>
                                {filterCategories.map((category: FilterCategory) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to permanently delete the filter "${filterName}"? This will remove it from all concepts and cannot be undone.`)) {
                                    deleteFilterByName(filterName);
                                  }
                                }}
                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2 py-1"
                                title="Delete filter permanently"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {(!filterOptions || !filterOptions.custom_filters || filterOptions.custom_filters.length === 0) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No custom filters yet</p>
                <p className="text-xs">Create some custom filters first</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Changes are saved automatically • Press Esc or click outside to close
          </p>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to break out of parent container
  return ReactDOM.createPortal(modalContent, document.body);
};
