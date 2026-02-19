
import React from 'react';

interface FilterBarProps {
  onOpenFilters: () => void;
  filterCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onOpenFilters, filterCount }) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
      <button 
        onClick={onOpenFilters}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors shadow-sm font-medium whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {filterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
            {filterCount}
          </span>
        )}
      </button>

      <div className="h-6 w-px bg-slate-200 mx-1"></div>

      <select className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors appearance-none cursor-pointer text-sm font-medium pr-8 relative bg-no-repeat bg-[right_0.75rem_center]">
        <option value="">Type</option>
        <option value="full_time">Full Time</option>
        <option value="part_time">Part Time</option>
      </select>

      <select className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors appearance-none cursor-pointer text-sm font-medium pr-8">
        <option value="">Location</option>
        <option value="delhi">Delhi</option>
        <option value="bangalore">Bangalore</option>
        <option value="remote">Remote</option>
      </select>

      <select className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors appearance-none cursor-pointer text-sm font-medium pr-8">
        <option value="">Roles</option>
        <option value="frontend">Frontend</option>
        <option value="backend">Backend</option>
      </select>

      <div className="flex-1"></div>

      <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors font-medium whitespace-nowrap">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        Sort By
      </button>
    </div>
  );
};
