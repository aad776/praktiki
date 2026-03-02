
import React from 'react';

interface FilterBarProps {
  onOpenFilters: () => void;
  filterCount: number;
  activeFilters: Record<string, any>;
  onUpdateFilters: (filters: Record<string, any>) => void;
  onSort: (sort: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  onOpenFilters, 
  filterCount, 
  activeFilters, 
  onUpdateFilters,
  onSort
}) => {
  const handleToggleQuickFilter = (categoryId: string, optionId: string) => {
    const current = activeFilters[categoryId] || [];
    const updated = current.includes(optionId)
      ? current.filter((id: string) => id !== optionId)
      : [...current, optionId];
    onUpdateFilters({ ...activeFilters, [categoryId]: updated });
  };

  const isQuickFilterActive = (categoryId: string, optionId: string) => {
    return activeFilters[categoryId]?.includes(optionId);
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
      <button 
        onClick={onOpenFilters}
        className={`flex items-center gap-2 px-4 py-2 border rounded-full transition-colors shadow-sm font-medium whitespace-nowrap ${
          filterCount > 0 
            ? 'bg-blue-600 border-blue-600 text-white' 
            : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {filterCount > 0 && (
          <span className="bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
            {filterCount}
          </span>
        )}
      </button>

      <div className="h-6 w-px bg-slate-200 mx-1"></div>

      {/* Quick Filters */}
      <button 
        onClick={() => handleToggleQuickFilter('type', 'full_time')}
        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${
          isQuickFilterActive('type', 'full_time')
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        Full Time
      </button>

      <button 
        onClick={() => handleToggleQuickFilter('locations', 'remote')}
        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${
          isQuickFilterActive('locations', 'remote')
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        Remote
      </button>

      <button 
        onClick={() => onOpenFilters()} // Roles usually need more options, so open modal
        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${
          activeFilters.roles?.length > 0
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        Roles {activeFilters.roles?.length > 0 ? `(${activeFilters.roles.length})` : ''}
      </button>

      <div className="flex-1"></div>

      <div className="relative">
        <select 
          onChange={(e) => onSort(e.target.value)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors font-medium whitespace-nowrap appearance-none cursor-pointer pr-10"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="stipend_high">Highest Stipend</option>
          <option value="duration_short">Shortest Duration</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};
