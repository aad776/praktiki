
import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { ButtonSpinner } from "../components/LoadingSpinner";
import { useToast } from "../context/ToastContext";

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
  created_at?: string;
  company_name?: string;
  logo_url?: string;
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
  const [locationFilter, setLocationFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    fetchInternships();
  }, [search, locationFilter, modeFilter]);

  const fetchInternships = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (locationFilter) params.append("location", locationFilter);
      if (modeFilter) params.append("mode", modeFilter);

      const res = await api.get<Internship[]>(`/students/internships?${params.toString()}`);
      setInternships(res);
    } catch (error) {
      console.error("Failed to fetch internships", error);
    } finally {
      setLoading(false);
    }
  };

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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                <input 
                    type="text" 
                    placeholder="Search by role, skill, or company..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="w-full md:w-48">
                <input 
                    type="text" 
                    placeholder="Location (e.g. Delhi)" 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                />
            </div>
            <div className="w-full md:w-48">
                <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                >
                    <option value="">All Modes</option>
                    <option value="remote">Remote</option>
                    <option value="onsite">In-Office</option>
                    <option value="hybrid">Hybrid</option>
                </select>
            </div>
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
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Matching Skills</h4>
                                <div className="flex flex-wrap gap-1">
                                    {rec.matching_skills.slice(0, 3).map((skill, idx) => (
                                        <span key={idx} className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">
                                            {skill}
                                        </span>
                                    ))}
                                    {rec.matching_skills.length > 3 && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                            +{rec.matching_skills.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Missing Skills */}
                            {rec.missing_skills.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills to Develop</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {rec.missing_skills.slice(0, 2).map((skill, idx) => (
                                            <span key={idx} className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                {skill}
                                            </span>
                                        ))}
                                        {rec.missing_skills.length > 2 && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                +{rec.missing_skills.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => navigate(`/student/internship/${rec.internship_id}`)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )
        ) : internships.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No internships found</h3>
                <p className="text-slate-500">Try adjusting your search filters.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map(internship => {
                    const skillsList = internship.skills ? internship.skills.split(',').map(s => s.trim()) : [];
                    return (
                        <div key={internship.id} className="group border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white flex flex-col h-full relative">
                            {/* Company Header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-blue-100">
                                    {internship.logo_url ? (
                                        <img src={internship.logo_url} alt={internship.company_name} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-xl font-bold text-slate-300 group-hover:text-blue-200">
                                            {internship.company_name?.charAt(0) || 'C'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3
                                        className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                                        title={internship.title}
                                        onClick={() => navigate(`/student/internship/${internship.id}`)}
                                    >
                                        {internship.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 truncate font-medium">{internship.company_name || 'Unknown Company'}</p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-4">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="p-1 rounded bg-blue-50 text-blue-600">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                    <span className="truncate">{internship.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </span>
                                    <span>{internship.mode}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="p-1 rounded bg-purple-50 text-purple-600">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    <span>{internship.duration_weeks} Weeks</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="p-1 rounded bg-rose-50 text-rose-600">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </span>
                                    <span className="truncate">{internship.deadline || 'No Deadline'}</span>
                                </div>
                            </div>

                            {/* Short Description */}
                            {internship.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed italic">
                                    "{internship.description}"
                                </p>
                            )}

                            {/* Required Skills */}
                            {skillsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                                    {skillsList.slice(0, 3).map((skill, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                    {skillsList.length > 3 && (
                                        <span className="text-[10px] text-slate-400 font-medium self-center">
                                            +{skillsList.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Posted {internship.created_at ? formatDate(internship.created_at) : 'recently'}</span>
                                </div>
                                <button 
                                    onClick={() => navigate(`/student/internship/${internship.id}`)}
                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg transition-all transform active:scale-95"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </main>
    </div>
  );
}
