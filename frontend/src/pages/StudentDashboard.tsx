import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader, ButtonSpinner } from '../components/LoadingSpinner';

// Types
interface StudentProfile {
  id: number;
  user_id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  university_name?: string;
  department?: string;
  year?: number;
  cgpa?: string;
  skills?: string;
  interests?: string;
  is_apaar_verified: boolean;
}

interface Resume {
  career_objective?: string;
  work_experience?: string;
  resume_file_path?: string;
}

interface RecommendedInternship {
  internship_id: number;
  title: string;
  company_name: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation?: {
    rule_based_score?: number;
    embedding_score?: number;
  };
}

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

interface Application {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  hours_worked?: number;
  policy_used?: string;
  credit_status?: string;
  is_pushed_to_abc?: boolean;
  internship: {
    id: number;
    title: string;
    description?: string;
    location: string;
    mode: string;
    duration_weeks: number;
    company_name: string;
  };
}

interface CreditSummary {
  total_credits: number;
  approved_credits: number;
  pending_credits: number;
  total_hours: number;
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  // State
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedInternship[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [masterTitles, setMasterTitles] = useState<string[]>([]);
  const [masterLocations, setMasterLocations] = useState<string[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);

  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Loading states
  const [pageLoading, setPageLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // Suggestions state
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchLocation, setSearchLocation] = useState(searchParams.get('location') || '');
  const [searchMode, setSearchMode] = useState(searchParams.get('mode') || '');

  // Refs for clicking outside
  const keywordRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  // Effect to handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keywordRef.current && !keywordRef.current.contains(event.target as Node)) {
        setShowKeywordDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update suggestions when typing
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      const suggestions = masterTitles
        .filter(title => title.toLowerCase().includes(query))
        .sort((a, b) => {
          // Prioritize titles starting with the query
          const aStarts = a.toLowerCase().startsWith(query);
          const bStarts = b.toLowerCase().startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.localeCompare(b);
        })
        .slice(0, 10); // Show more suggestions
      setKeywordSuggestions(suggestions);
      setShowKeywordDropdown(suggestions.length > 0);
    } else {
      setKeywordSuggestions([]);
      setShowKeywordDropdown(false);
    }
  }, [searchQuery, masterTitles]);

  useEffect(() => {
    const query = searchLocation.trim().toLowerCase();
    if (query.length > 0) {
      const suggestions = masterLocations
        .filter(loc => loc.toLowerCase().includes(query))
        .sort((a, b) => {
          // Prioritize locations starting with the query (B -> Ba logic)
          const aStarts = a.toLowerCase().startsWith(query);
          const bStarts = b.toLowerCase().startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.localeCompare(b);
        })
        .slice(0, 10);
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(suggestions.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  }, [searchLocation, masterLocations]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await api.get<StudentProfile>('/students/me');
        setProfile(profileRes);

        // Fetch resume (optional, may not exist)
        try {
          const resumeRes = await api.get<Resume>('/students/me/resume');
          setResume(resumeRes);
        } catch {
          // Resume doesn't exist yet, that's ok
        }

        // Fetch all internships once to build master lists for suggestions
        const allInternships = await api.get<Internship[]>('/students/internships?limit=1000');
        setMasterTitles(Array.from(new Set(allInternships.map(i => i.title))));
        setMasterLocations(Array.from(new Set(allInternships.map(i => i.location))));

        // Fetch applications
        const appsRes = await api.get<Application[]>('/students/my-applications');
        setApplications(appsRes);

        // Fetch credit summary
        try {
          const creditsRes = await api.get<CreditSummary>('/credits/summary');
          setCreditSummary(creditsRes);
        } catch {
          // Credits not available yet
        }

        // Fetch recommendations (may fail if profile incomplete)
        try {
          const recsRes = await api.get<RecommendedInternship[]>('/students/recommendations');
          setRecommendations(recsRes);
        } catch {
          // Recommendations not available yet
        }
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || 'Failed to load dashboard data');
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync state with URL params (for back/forward navigation)
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSearchLocation(searchParams.get('location') || '');
    setSearchMode(searchParams.get('mode') || '');
  }, [searchParams]);

  // Fetch internships based on URL params
  useEffect(() => {
    const fetchInternships = async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        const search = searchParams.get('search');
        const location = searchParams.get('location');
        const mode = searchParams.get('mode');

        if (search) params.append('search', search);
        if (location) params.append('location', location);
        if (mode) params.append('mode', mode);
        params.append('limit', '1000');
        
        const internshipsRes = await api.get<Internship[]>(`/students/internships?${params.toString()}`);
        setInternships(internshipsRes);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load internships');
      } finally {
        setSearchLoading(false);
      }
    };
    
    fetchInternships();
  }, [searchParams]);

  // Check if profile is complete
  const isProfileComplete = useCallback(() => {
    if (!profile) return false;
    
    // Basic profile completion check - ensure all required fields are present
    const hasBasicProfile = !!(profile.university_name && profile.department);
    
    // Check if skills are available in profile.skills (comma-separated string)
    const hasSkills = !!(profile.skills && profile.skills.trim() !== '');
    
    // Check if interests are available (comma-separated string)
    const hasInterests = !!(profile.interests && profile.interests.trim() !== '');
    
    // Profile is complete if it has basic info and either skills or interests
    return hasBasicProfile && (hasSkills || hasInterests);
  }, [profile]);

  // Search handler
  const handleSearch = () => {
    setShowRecommendations(false); // Reset recommendations when searching
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (searchLocation) params.location = searchLocation;
    if (searchMode) params.mode = searchMode;
    setSearchParams(params);
  };

  const fetchRecommendations = async () => {
    if (!isProfileComplete()) {
      toast.error('Please complete your profile to get AI recommendations.');
      navigate('/student/setup?mode=edit');
      return;
    }

    setRecommendationLoading(true);
    try {
      const recsRes = await api.get<RecommendedInternship[]>('/students/recommendations');
      setRecommendations(recsRes);
      setShowRecommendations(true);
      if (recsRes.length === 0) {
        toast.info('No recommendations available yet. This could be because there are no internships matching your profile or your profile needs more details.');
      } else {
        toast.success(`Found ${recsRes.length} best matches for your profile!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to get recommendations. Please check your internet connection and try again later.');
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Apply handler
  const handleApply = async (internshipId: number) => {
    if (!isProfileComplete()) {
      toast.error('Please complete your profile to apply for internships.');
      navigate('/student/setup?mode=edit');
      return;
    }

    setApplyingId(internshipId);
    try {
      await api.post('/students/apply', { internship_id: internshipId });
      
      // Record feedback
      await api.post('/students/feedback', { internship_id: internshipId, action: 'apply' }).catch(() => {});
      
      toast.success('Application submitted successfully!');
      
      // Refresh applications
      const appsRes = await api.get<Application[]>('/students/my-applications');
      setApplications(appsRes);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplyingId(null);
    }
  };

  // Record feedback for AI
  const recordFeedback = async (internshipId: number, action: string) => {
    try {
      await api.post('/students/feedback', { internship_id: internshipId, action });
    } catch {
      // Silent fail for feedback
    }
  };

  // Get applied internship IDs
  const appliedIds = new Set(applications.map((a) => a.internship_id));

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (pageLoading) {
    return <PageLoader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 w-full max-w-full mx-auto px-4 sm:px-6 lg:px-12">
      {/* Welcome Message */}
      <div className="mb-8 flex items-center gap-3">
        {/* Back Arrow - Only visible on Mobile */}
        <button 
          onClick={() => navigate(-1)}
          className="sm:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            Hi, {profile?.first_name || profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-sm sm:text-base text-slate-600">Welcome to your dashboard. Here's what's happening today.</p>
        </div>
      </div>

      {/* Profile Incomplete Warning Banner */}
      {!isProfileComplete() && profile && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Attention: You have not completed your profile.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Incomplete profiles are not visible to employers. Please complete your profile to apply for internships.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/setup?mode=edit')}
            className="whitespace-nowrap px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 rounded-lg text-sm font-semibold transition-colors border border-amber-200"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Main Content - Always show */}
      {/* Search Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Internships</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative" ref={keywordRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keyword</label>
                <input
                  type="text"
                  placeholder="e.g. Software Developer"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowKeywordDropdown(true)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {showKeywordDropdown && keywordSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {keywordSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowKeywordDropdown(false);
                          // Optional: Auto-trigger search on select
                          const params: Record<string, string> = {};
                          params.search = suggestion;
                          if (searchLocation) params.location = searchLocation;
                          if (searchMode) params.mode = searchMode;
                          setSearchParams(params);
                        }}
                        className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-none"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={locationRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onFocus={() => searchLocation && setShowLocationDropdown(true)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {showLocationDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSearchLocation(suggestion);
                          setShowLocationDropdown(false);
                          // Optional: Auto-trigger search on select
                          const params: Record<string, string> = {};
                          if (searchQuery) params.search = searchQuery;
                          params.location = suggestion;
                          if (searchMode) params.mode = searchMode;
                          setSearchParams(params);
                        }}
                        className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-50 last:border-none"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">All Modes</option>
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg
                    hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors flex items-center justify-center gap-2"
                >
                  {searchLoading ? <ButtonSpinner /> : null}
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
                <button
                  onClick={fetchRecommendations}
                  disabled={recommendationLoading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg
                    hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {recommendationLoading ? <ButtonSpinner /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {recommendationLoading ? 'Finding Best Matches...' : 'Best Recommendations'}
                </button>
              </div>
            </div>
          </section>

          {/* Internships Grid */}
          <section className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200 w-full flex-grow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${showRecommendations ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                  {showRecommendations ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {showRecommendations ? 'Best Matches For You' : `Available Internships (${internships.length})`}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {showRecommendations 
                      ? 'AI-powered recommendations based on your profile and skills.' 
                      : 'Explore all the latest internship opportunities.'}
                  </p>
                </div>
              </div>

              {showRecommendations && (
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Recommendations
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 md:gap-8 pr-2 custom-scrollbar min-h-[400px]">
              {showRecommendations ? (
                recommendations.map((rec) => {
                  const alreadyApplied = appliedIds.has(rec.internship_id);
                  return (
                    <div
                      key={rec.internship_id}
                      className="group border-2 border-blue-100 rounded-2xl p-6 hover:border-blue-400 hover:shadow-2xl transition-all duration-300 bg-white flex flex-col h-full relative overflow-hidden"
                    >
                      {/* Match Score Badge */}
                      <div className="absolute top-0 right-0">
                        <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {Math.round(rec.match_score)}% MATCH
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                              {rec.company_name?.charAt(0) || 'C'}
                           </div>
                           <div className="min-w-0">
                              <h3
                                className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                                onClick={() => navigate(`/student/internship/${rec.internship_id}`)}
                              >
                                {rec.title}
                              </h3>
                              <p className="text-sm text-slate-500 truncate font-medium">{rec.company_name}</p>
                           </div>
                        </div>

                        {/* Match Explanation */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Why this matches:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rec.matching_skills.slice(0, 5).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                                {skill}
                              </span>
                            ))}
                            {rec.missing_skills.length > 0 && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded-md text-[10px] font-bold">
                                + {rec.missing_skills.length} skills to learn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                        <button
                          onClick={() => {
                            recordFeedback(rec.internship_id, 'click');
                            navigate(`/student/internship/${rec.internship_id}`);
                          }}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleApply(rec.internship_id)}
                          disabled={alreadyApplied || applyingId === rec.internship_id}
                          className={`px-5 py-2 text-sm font-bold rounded-lg transition-all
                            ${alreadyApplied
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                            }
                            disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {applyingId === rec.internship_id && <ButtonSpinner />}
                          {alreadyApplied ? 'Applied' : 'Apply Now'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                internships.map((internship) => {
                  const alreadyApplied = appliedIds.has(internship.id);
                  const skillsList = internship.skills ? internship.skills.split(',').map(s => s.trim()) : [];
                  
                  return (
                    <div
                      key={internship.id}
                      className="group border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white flex flex-col h-full relative"
                    >
                      {/* Company Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-blue-100">
                          {internship.logo_url ? (
                            <img 
                              src={internship.logo_url} 
                              alt={internship.company_name} 
                              className="w-full h-full object-contain" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                    const span = document.createElement('span');
                                    span.className = "text-xl font-bold text-slate-300 group-hover:text-blue-200";
                                    span.innerText = internship.company_name?.charAt(0) || 'C';
                                    parent.appendChild(span);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xl font-bold text-slate-300 group-hover:text-blue-200">
                              {internship.company_name?.charAt(0) || 'C'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer"
                            title={internship.title}
                            onClick={() => {
                              recordFeedback(internship.id, 'click');
                              navigate(`/student/internship/${internship.id}`);
                            }}
                          >
                            {internship.title}
                          </h3>
                          <p className="text-sm sm:text-base text-slate-500 truncate font-medium">{internship.company_name || 'Unknown Company'}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-y-3 gap-x-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="p-1 rounded bg-blue-50 text-blue-600 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                          <span className="truncate" title={internship.location}>{internship.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="p-1 rounded bg-indigo-50 text-indigo-600 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <span className="truncate">{internship.mode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="p-1 rounded bg-purple-50 text-purple-600 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <span className="truncate">{internship.duration_weeks} Weeks</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="p-1 rounded bg-rose-50 text-rose-600 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <span className="truncate">{internship.deadline || 'No Deadline'}</span>
                        </div>
                      </div>

                      {/* Short Description */}
                      {internship.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed italic">
                          "{internship.description}"
                        </p>
                      )}

                      {/* Required Skills */}
                      {skillsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                          {skillsList.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                          {skillsList.length > 3 && (
                            <span className="text-xs text-slate-400 font-medium self-center">
                              +{skillsList.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{internship.created_at ? formatDate(internship.created_at) : 'recently'}</span>
                        </div>
                        <button
                          onClick={() => handleApply(internship.id)}
                          disabled={alreadyApplied || applyingId === internship.id}
                          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all transform active:scale-95
                            flex items-center gap-2
                            ${alreadyApplied
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                            }
                            disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {applyingId === internship.id && <ButtonSpinner />}
                          {alreadyApplied ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                              Applied
                            </>
                          ) : 'Apply Now'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {((!showRecommendations && internships.length === 0) || (showRecommendations && recommendations.length === 0)) && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="font-medium">
                    {showRecommendations 
                      ? 'No recommendations found. Make sure your profile is complete with skills and interests.' 
                      : 'No internships found matching your criteria.'}
                  </p>
                  <p className="text-sm">Try adjusting your filters or keywords.</p>
                </div>
              )}
            </div>
          </section>

          {/* Old Recommendations Section - REMOVED since we integrated it above */}

      {/* End of Main Content */}
    </div>
  );
}

export default StudentDashboard;
