
import React, { useState } from 'react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  initialFilters?: any;
}

const CATEGORIES = [
  { id: 'quick', label: 'Quick Filters', count: 1 },
  { id: 'categories', label: 'Categories' },
  { id: 'locations', label: 'Locations' },
  { id: 'type', label: 'Type' },
  { id: 'date', label: 'Date Posted' },
  { id: 'days', label: 'Working Days' },
  { id: 'timing', label: 'Timing' },
  { id: 'roles', label: 'Roles' },
  { id: 'user_type', label: 'User Type', count: 1 },
  { id: 'domain', label: 'Domain', count: 1 },
  { id: 'course', label: 'Course', count: 1 },
  { id: 'specialization', label: 'Specialization' },
  { id: 'semester', label: 'Semester' },
  { id: 'grade_level', label: 'Grade Level' },
  { id: 'completion_status', label: 'Completion Status' },
];

const FILTER_OPTIONS: Record<string, any[]> = {
  quick: [
    { id: 'quick_apply', label: 'Quick Apply', icon: '⚡' },
    { id: 'open_all', label: 'Open to all', icon: '🚪' },
  ],
  categories: [
    { id: 'web_dev', label: 'Web Development' },
    { id: 'app_dev', label: 'App Development' },
    { id: 'marketing', label: 'Marketing' },
  ],
  locations: [
    { id: 'delhi', label: 'Delhi' },
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'bangalore', label: 'Bangalore' },
    { id: 'remote', label: 'Remote' },
  ],
  type: [
    { id: 'full_time', label: 'Full Time' },
    { id: 'part_time', label: 'Part Time' },
  ],
  date: [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ],
  roles: [
    { id: 'frontend', label: 'Frontend Developer' },
    { id: 'backend', label: 'Backend Developer' },
    { id: 'fullstack', label: 'Full Stack Developer' },
    { id: 'data_science', label: 'Data Scientist' },
  ],
  course: [
    { id: 'btech', label: 'B.Tech' },
    { id: 'mtech', label: 'M.Tech' },
    { id: 'bca', label: 'BCA' },
    { id: 'mca', label: 'MCA' },
  ],
  semester: [
    { id: '1', label: '1st Semester' },
    { id: '2', label: '2nd Semester' },
    { id: '3', label: '3rd Semester' },
    { id: '4', label: '4th Semester' },
    { id: '5', label: '5th Semester' },
    { id: '6', label: '6th Semester' },
    { id: '7', label: '7th Semester' },
    { id: '8', label: '8th Semester' },
  ],
  grade_level: [
    { id: 'first_year', label: 'First Year' },
    { id: 'second_year', label: 'Second Year' },
    { id: 'third_year', label: 'Third Year' },
    { id: 'final_year', label: 'Final Year' },
  ],
  completion_status: [
    { id: 'completed', label: 'Completed' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'dropped', label: 'Dropped' },
  ],
};

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, initialFilters }) => {
  const [activeCategory, setActiveCategory] = useState('quick');
  const [selectedFilters, setSelectedFilters] = useState<any>(initialFilters || {});

  if (!isOpen) return null;

  const handleToggleFilter = (categoryId: string, optionId: string) => {
    setSelectedFilters((prev: any) => {
      const current = prev[categoryId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id: string) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [categoryId]: updated };
    });
  };

  const clearAll = () => {
    setSelectedFilters({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">All Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-slate-100 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-6 py-4 flex items-center justify-between transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-white text-blue-600 font-semibold border-l-4 border-blue-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                {cat.count && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{CATEGORIES.find(c => c.id === activeCategory)?.label}</h3>
            
            <div className="space-y-3">
              {FILTER_OPTIONS[activeCategory] ? (
                FILTER_OPTIONS[activeCategory].map((option) => (
                  <label key={option.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all group">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                      checked={selectedFilters[activeCategory]?.includes(option.id) || false}
                      onChange={() => handleToggleFilter(activeCategory, option.id)}
                    />
                    {option.icon && <span className="text-xl">{option.icon}</span>}
                    <span className="font-medium text-slate-700 group-hover:text-slate-900">{option.label}</span>
                  </label>
                ))
              ) : (
                <p className="text-slate-400 italic">No options available for this category yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <button 
            onClick={clearAll}
            className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={() => { onApply(selectedFilters); onClose(); }}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            Show Result
          </button>
        </div>
      </div>
    </div>
  );
};
