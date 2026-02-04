
import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { ButtonSpinner } from "../components/LoadingSpinner";
import { useToast } from "../context/ToastContext";

interface Internship {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
  employer_id: number;
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
                {internships.map(internship => (
                    <div key={internship.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{internship.title}</h3>
                                <p className="text-sm text-slate-500">Duration: {internship.duration_weeks} Weeks</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${internship.mode === 'remote' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {internship.mode}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {internship.location}
                        </div>

                        <p className="text-sm text-slate-600 mb-6 line-clamp-2">
                            {internship.description || "No description available."}
                        </p>

                        <button 
                            onClick={() => navigate(`/student/internship/${internship.id}`)}
                            className="w-full py-2 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700"
                        >
                            View Details
                        </button>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
