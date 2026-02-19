
import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { ButtonSpinner } from "../components/LoadingSpinner";
import { useToast } from "../context/ToastContext";
import { InternshipCard } from "../components/InternshipCard";
import { FilterModal } from "../components/FilterModal";
import { FilterBar } from "../components/FilterBar";

interface Internship {
  id: number;
  employer_id: number;
  title: string;
  description?: string;
  location: string;
  mode: string;
  duration_weeks: number;
  deadline?: string;
  skills?: string;
  stipend_amount?: number;
  created_at?: string;
  company_name?: string;
  logo_url?: string;
  // Academic fields (optional/mocked for now)
  course?: string;
  semester?: number;
  grade_level?: string;
  completion_status?: string;
}

interface RecommendedInternship {
  internship_id: number;
  title: string;
  company_name: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
}

export function BrowseInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedInternship[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [search, setSearch] = useState("");
  
  // Filter states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchInternships();
  }, [search]); // Re-fetch when search changes, other filters are applied locally or could trigger fetch

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("limit", "1000"); // Fetch all for client-side filtering

      const res = await api.get<Internship[]>(`/students/internships?${params.toString()}`);
      setInternships(res);
    } catch (error) {
      console.error("Failed to fetch internships", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = useMemo(() => {
    let result = [...internships];

    // Apply active filters from modal
    if (activeFilters.locations && activeFilters.locations.length > 0) {
      result = result.filter(i => activeFilters.locations.some((loc: string) => 
        i.location.toLowerCase().includes(loc.toLowerCase())
      ));
    }

    if (activeFilters.type && activeFilters.type.length > 0) {
      // Mapping 'type' from filter to 'mode' in internship
      // This might need adjustment based on exact values
      result = result.filter(i => {
         const mode = i.mode.toLowerCase();
         return activeFilters.type.some((t: string) => {
             if (t === 'remote') return mode === 'remote';
             if (t === 'office') return mode === 'onsite' || mode === 'office';
             if (t === 'hybrid') return mode === 'hybrid';
             return true;
         });
      });
    }

    if (activeFilters.roles && activeFilters.roles.length > 0) {
        result = result.filter(i => activeFilters.roles.some((role: string) => 
            i.title.toLowerCase().includes(role.toLowerCase())
        ));
    }

    if (activeFilters.date && activeFilters.date.length > 0) {
        const now = new Date();
        result = result.filter(i => {
            if (!i.created_at) return true;
            const created = new Date(i.created_at);
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return activeFilters.date.some((d: string) => {
                if (d === 'today') return diffDays <= 1;
                if (d === 'week') return diffDays <= 7;
                if (d === 'month') return diffDays <= 30;
                return true;
            });
        });
    }
    
    // Academic Filters
    if (activeFilters.course && activeFilters.course.length > 0) {
        result = result.filter(i => {
            // Check if course requirement exists in description or dedicated field
            if (i.course) return activeFilters.course.includes(i.course.toLowerCase());
            // Fallback: check description or title
            const text = (i.description + " " + i.title).toLowerCase();
            return activeFilters.course.some((c: string) => text.includes(c));
        });
    }

    if (activeFilters.semester && activeFilters.semester.length > 0) {
        result = result.filter(i => {
            if (i.semester) return activeFilters.semester.includes(i.semester.toString());
            return true; // If not specified, assume open to all
        });
    }

    if (activeFilters.grade_level && activeFilters.grade_level.length > 0) {
        result = result.filter(i => {
            if (i.grade_level) return activeFilters.grade_level.includes(i.grade_level);
            return true;
        });
    }

    return result;
  }, [internships, activeFilters]);

  const fetchRecommendations = async () => {
    setRecommendationLoading(true);
    try {
      const res = await api.get<RecommendedInternship[]>('/students/recommendations');
      setRecommendations(res);
      setShowRecommendations(true);
      if (res.length === 0) {
        toast.info('No recommendations available yet. This could be because there are no internships matching your profile or your profile needs more details.');
      }
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
      toast.error('Failed to get recommendations. Please check your internet connection and try again later.');
    } finally {
      setRecommendationLoading(false);
    }
  };

  const handleApplyFilters = (filters: any) => {
      setActiveFilters(filters);
      setIsFilterModalOpen(false);
      // Reset page to 1 if pagination exists
  };

  const getFilterCount = () => {
      let count = 0;
      Object.values(activeFilters).forEach((val: any) => {
          if (Array.isArray(val)) count += val.length;
          else if (val) count++;
      });
      return count;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Browse Internships</h1>
              <p className="text-lg text-slate-600">Find the perfect opportunity to kickstart your career.</p>
            </div>
            <button
              onClick={fetchRecommendations}
              disabled={recommendationLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recommendationLoading ? <ButtonSpinner /> : null}
              Best Recommendations
            </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
            <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                <input 
                    type="text" 
                    placeholder="Search by role, skill, or company..." 
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <FilterBar 
                onOpenFilters={() => setIsFilterModalOpen(true)}
                filterCount={getFilterCount()}
            />
        </div>

        {/* Toggle between Recommendations and All Internships */}
        {showRecommendations && (
            <div className="mb-6 flex justify-center">
                <div className="inline-flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    <button
                        onClick={() => setShowRecommendations(false)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!showRecommendations ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        All Internships
                    </button>
                    <button
                        onClick={fetchRecommendations}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${showRecommendations ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Recommended ({recommendations.length})
                    </button>
                </div>
            </div>
        )}

        {/* Results */}
        {loading ? (
            <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500">Loading internships...</p>
            </div>
        ) : showRecommendations ? (
            recommendations.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No recommendations available</h3>
                    <p className="text-slate-500">No recommendations available yet. This could be because there are no internships matching your profile or your profile needs more details.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map(rec => (
                        <div key={rec.internship_id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow group relative">
                            {/* Match Score Badge */}
                            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                {Math.round(rec.match_score)}%
                            </div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{rec.title}</h3>
                                    <p className="text-sm text-slate-600">{rec.company_name}</p>
                                </div>
                            </div>
                            
                            {/* Matching Skills */}
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Matching Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {rec.matching_skills.slice(0, 3).map(skill => (
                                        <span key={skill} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-100">
                                            {skill}
                                        </span>
                                    ))}
                                    {rec.matching_skills.length > 3 && (
                                        <span className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded border border-slate-200">
                                            +{rec.matching_skills.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
        ) : (
            filteredInternships.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No internships found</h3>
                    <p className="text-slate-500">Try adjusting your filters or search terms.</p>
                    <button 
                        onClick={() => {setSearch(''); setActiveFilters({});}}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredInternships.map(internship => (
                        <InternshipCard key={internship.id} internship={internship} />
                    ))}
                </div>
            )
        )}

        <FilterModal 
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            onApply={handleApplyFilters}
            initialFilters={activeFilters}
        />
      </main>
    </div>
  );
}
