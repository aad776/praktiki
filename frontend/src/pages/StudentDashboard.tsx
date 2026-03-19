import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Edit2, ShieldCheck } from 'lucide-react';
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
  const { user } = useAuth();
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
  const [showSetupOptions, setShowSetupOptions] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [pageLoading, setPageLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // Suggestions state
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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
        .filter(title => title && typeof title === 'string' && title.toLowerCase().includes(query))
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
        .filter(loc => loc && typeof loc === 'string' && loc.toLowerCase().includes(query))
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

  const fetchDashboardData = useCallback(async () => {
    setPageLoading(true);
    try {
      // Fetch profile
      const profileRes = await api.get<StudentProfile>('/students/me');
      setProfile(profileRes);

      // Fetch resume (optional)
      try {
        const resumeRes = await api.get<Resume>('/students/me/resume');
        setResume(resumeRes);
      } catch {
        // Resume doesn't exist yet
      }

      // Fetch all internships once to build master lists for suggestions
      const allInternships = await api.get<Internship[]>('/students/internships?limit=1000');
      if (Array.isArray(allInternships)) {
        setMasterTitles(Array.from(new Set(allInternships.map(i => i.title).filter(Boolean))));
        setMasterLocations(Array.from(new Set(allInternships.map(i => i.location).filter(Boolean))));
      }

      // Fetch applications
      const appsRes = await api.get<Application[]>('/students/my-applications');
      setApplications(appsRes);

      // Fetch credit summary (optional)
      try {
        const creditsRes = await api.get<CreditSummary>('/credits/summary');
        setCreditSummary(creditsRes);
      } catch {
        // Credits not available yet
      }

      // Fetch recommendations (optional)
      try {
        const recsRes = await api.get<RecommendedInternship[]>('/students/recommendations');
        setRecommendations(recsRes);
      } catch {
        // Recommendations not available yet
      }
    } catch (err) {
      const error = err as ApiError;
      console.error(error);
      // Don't show error for 404 on profile (it means setup is needed)
      if (error.response?.status !== 404) {
        toast.error(error.message || 'Could not load dashboard data');
      }
    } finally {
      setPageLoading(false);
    }
  }, [toast]);

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleParseResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF resume for parsing');
      return;
    }

    setIsParsing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response: any = await api.post('/students/me/parse-resume', formData);

      if (response.success) {
        toast.success("Resume parsed successfully! Let's complete your profile.");
        // Pass parsed data to setup page
        navigate('/student/setup?mode=edit', { state: { parsedData: response.data } });
      }
    } catch (error) {
      console.error('Parsing failed:', error);
      toast.error('Failed to parse resume. Please complete manually.');
      navigate('/student/setup?mode=edit');
    } finally {
      setIsParsing(false);
      setShowSetupOptions(false);
    }
  };

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
    const hasBasicProfile = !!(profile.university_name && profile.department && profile.year && profile.cgpa);
    
    // Check if skills are available in profile.skills (comma-separated string)
    const hasSkills = !!(profile.skills && typeof profile.skills === 'string' && profile.skills.trim() !== '');
    
    // Check if interests are available (comma-separated string)
    const hasInterests = !!(profile.interests && typeof profile.interests === 'string' && profile.interests.trim() !== '');
    
    // Profile is complete if it has basic info and either skills or interests
    return hasBasicProfile && (hasSkills || hasInterests);
  }, [profile]);

  // Search handler
  const handleSearch = () => {
    setShowRecommendations(false); // Reset recommendations when searching
    setCurrentPage(1); // Reset to first page on new search
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
    setCurrentPage(1); // Reset to first page for recommendations
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

  // Pagination Logic
  const totalItems = showRecommendations ? recommendations.length : internships.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedItems = showRecommendations 
    ? recommendations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : internships.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    <div className="min-h-screen bg-slate-50 py-8 md:py-12 lg:py-16">
      <div className="container-wide">
        {/* Welcome Message */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              {/* Back Arrow - Only visible on Mobile */}
              <button 
                onClick={() => navigate(-1)}
                className="md:hidden p-2 -ml-2 hover:bg-slate-200 rounded-2xl transition-all text-slate-600 border border-transparent active:scale-95"
                aria-label="Go back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
              <div className="px-4 py-1.5 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-brand-100 shadow-sm">
                Student Dashboard
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Hi, <span className="text-brand-600">{profile?.first_name || profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student'}!</span> 👋
            </h1>
            <p className="text-lg text-slate-500 font-medium mt-4 max-w-2xl">
              Explore internships tailored to your skills and kickstart your professional journey.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credits</p>
              <p className="text-2xl font-black text-slate-900">{creditSummary?.approved_credits || 0} / {creditSummary?.total_credits || 0}</p>
            </div>
            <div className="h-12 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <button 
              onClick={() => setShowSetupOptions(true)}
              className="btn-secondary group"
            >
              Edit Profile
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile Incomplete Warning Banner */}
        {!isProfileComplete() && profile && (
          <div className="bg-amber-50 border-2 border-amber-100 p-8 mb-12 rounded-[2.5rem] shadow-xl shadow-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 animate-fade-in">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-900 mb-2 uppercase tracking-tight">Complete Your Profile</h3>
                <p className="text-amber-800/70 font-medium max-w-xl">
                  You're missing some key information! Complete your profile to unlock AI-powered internship recommendations and start applying.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSetupOptions(true)}
              className="whitespace-nowrap px-8 py-4 bg-amber-600 text-white hover:bg-amber-700 rounded-2xl text-sm font-black transition-all shadow-lg shadow-amber-600/20 uppercase tracking-widest active:scale-95"
            >
              Complete Now
            </button>
          </div>
        )}

        {/* Setup Options Modal */}
        {showSetupOptions && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in border border-slate-100">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Complete Your Profile</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Choose how you'd like to provide your details</p>
                </div>
                <button 
                  onClick={() => setShowSetupOptions(false)}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manual Option */}
                <div 
                  onClick={() => navigate('/student/setup?mode=edit')}
                  className="group p-8 rounded-[2rem] border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50/30 transition-all cursor-pointer text-center flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-600 transition-all shadow-inner">
                    <Edit2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Fill Manually</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Enter your academic and professional details step by step.</p>
                  </div>
                  <button className="mt-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Select
                  </button>
                </div>

                {/* Resume Parse Option */}
                <div 
                  onClick={() => !isParsing && fileInputRef.current?.click()}
                  className={`group p-8 rounded-[2rem] border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50/30 transition-all cursor-pointer text-center flex flex-col items-center gap-6 ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-600 transition-all shadow-inner">
                    {isParsing ? (
                      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ShieldCheck className="w-10 h-10" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Upload Resume</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">We'll use AI to extract your details from your resume instantly.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf" 
                    onChange={handleParseResume}
                  />
                  <button className="mt-auto px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    {isParsing ? 'Parsing...' : 'Upload PDF'}
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] italic">
                  AI parsing works best with standard PDF resumes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Sidebar / Filters */}
          <aside className="w-full lg:w-80 shrink-0 sticky top-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-0">Filters</h2>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSearchLocation('');
                    setSearchMode('');
                    setSearchParams({});
                  }}
                  className="text-[10px] font-black text-slate-400 hover:text-brand-600 uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-8">
                {/* Keyword Search */}
                <div className="relative" ref={keywordRef}>
                  <label className="label-base">Keyword</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Developer"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery && setShowKeywordDropdown(true)}
                      className="input-base pr-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  {showKeywordDropdown && keywordSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-2">
                      {keywordSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowKeywordDropdown(false);
                            handleSearch();
                          }}
                          className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl cursor-pointer transition-colors font-medium"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Search */}
                <div className="relative" ref={locationRef}>
                  <label className="label-base">Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      onFocus={() => searchLocation && setShowLocationDropdown(true)}
                      className="input-base pr-12"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                  </div>
                  {showLocationDropdown && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar p-2">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setSearchLocation(suggestion);
                            setShowLocationDropdown(false);
                            handleSearch();
                          }}
                          className="px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl cursor-pointer transition-colors font-medium"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode Select */}
                <div>
                  <label className="label-base">Work Mode</label>
                  <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value)}
                    className="input-base appearance-none bg-[right_1.25rem_center] bg-no-repeat"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23cbd5e1' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundSize: '1.25rem' }}
                  >
                    <option value="">All Modes</option>
                    <option value="remote">Remote</option>
                    <option value="onsite">Onsite</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading}
                    className="btn-primary w-full"
                  >
                    {searchLoading ? <ButtonSpinner /> : 'Search Now'}
                  </button>
                  <button
                    onClick={fetchRecommendations}
                    disabled={recommendationLoading}
                    className="btn-brand w-full"
                  >
                    {recommendationLoading ? <ButtonSpinner /> : 'AI Recommendations'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="mt-8 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-900/20 overflow-hidden relative group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
              <h3 className="text-lg font-black uppercase tracking-widest mb-6 text-slate-400">Applications</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-3xl font-black">{applications.length}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Applied</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-black text-emerald-400">{applications.filter(a => a.status === 'accepted').length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ongoing</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-brand-400">{applications.filter(a => a.status === 'completed').length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completed</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate('/student/applications')}
                className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10"
              >
                View All
              </button>
            </div>
          </aside>

          {/* Internships Grid */}
          <main className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${showRecommendations ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                  {showRecommendations ? (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {showRecommendations ? 'AI Best Matches' : 'Available Internships'}
                  </h2>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1">
                    {showRecommendations ? `Found ${recommendations.length} recommendations` : `${internships.length} opportunities listed`}
                  </p>
                </div>
              </div>

              {showRecommendations && (
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="btn-secondary btn-sm"
                >
                  <X className="w-4 h-4" />
                  Clear Results
                </button>
              )}
            </div>

            {searchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="card h-80 animate-pulse bg-slate-100"></div>
                ))}
              </div>
            ) : paginatedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pr-1 min-h-[600px]">
                {showRecommendations ? (
                  paginatedItems.map((recItem) => {
                    const rec = recItem as RecommendedInternship;
                    const alreadyApplied = appliedIds.has(rec.internship_id);
                    return (
                      <div
                        key={rec.internship_id}
                        className="group card-hover p-8 bg-white border-2 border-slate-50 relative flex flex-col h-full"
                      >
                        {/* Match Score Badge */}
                        <div className="absolute top-0 right-0">
                          <div className="bg-brand-600 text-white text-[10px] font-black px-4 py-2 rounded-bl-3xl shadow-lg shadow-brand-600/20 flex items-center gap-2 uppercase tracking-widest">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {Math.round(rec.match_score)}% Match
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-5 mb-6">
                             <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl group-hover:bg-brand-50 group-hover:border-brand-100 group-hover:text-brand-600 transition-all shadow-inner">
                                {rec.company_name?.charAt(0) || 'C'}
                             </div>
                             <div className="min-w-0">
                                <h3
                                  className="text-xl font-black text-slate-900 truncate group-hover:text-brand-600 transition-colors cursor-pointer leading-tight mb-1"
                                  onClick={() => navigate(`/student/internship/${rec.internship_id}`)}
                                >
                                  {rec.title}
                                </h3>
                                <p className="text-sm text-slate-400 truncate font-bold uppercase tracking-widest">{rec.company_name}</p>
                             </div>
                          </div>

                          {/* Match Explanation */}
                          <div className="bg-slate-50/50 rounded-2xl p-5 mb-6 border-2 border-slate-50 group-hover:border-brand-50 group-hover:bg-brand-50/30 transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Top Matching Skills</p>
                            <div className="flex flex-wrap gap-2">
                              {rec.matching_skills.slice(0, 4).map((skill, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white text-emerald-600 rounded-xl text-[11px] font-black flex items-center gap-2 border-2 border-emerald-50 shadow-sm">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                  {skill}
                                </span>
                              ))}
                              {rec.missing_skills.length > 0 && (
                                <span className="px-3 py-1.5 bg-white text-slate-400 rounded-xl text-[11px] font-black border-2 border-slate-50 italic">
                                  + {rec.missing_skills.length} skills to learn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-6 flex items-center justify-between border-t-2 border-slate-50">
                          <button
                            onClick={() => {
                              recordFeedback(rec.internship_id, 'click');
                              navigate(`/student/internship/${rec.internship_id}`);
                            }}
                            className="text-xs font-black text-slate-400 hover:text-brand-600 transition-all uppercase tracking-widest flex items-center gap-2"
                          >
                            Details
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleApply(rec.internship_id)}
                            disabled={alreadyApplied || applyingId === rec.internship_id}
                            className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-widest active:scale-95
                              ${alreadyApplied
                                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-default'
                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20'
                              }
                              disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {applyingId === rec.internship_id ? <ButtonSpinner /> : alreadyApplied ? 'Applied' : 'Apply Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  paginatedItems.map((internshipItem) => {
                    const internship = internshipItem as Internship;
                    const alreadyApplied = appliedIds.has(internship.id);
                    const skillsList = internship.skills ? internship.skills.split(',').map(s => s.trim()) : [];
                    
                    return (
                      <div
                        key={internship.id}
                        className="group card-hover p-8 bg-white border-2 border-slate-50 flex flex-col h-full"
                      >
                        {/* Company Header */}
                        <div className="flex items-start gap-5 mb-6">
                          <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:bg-brand-50 group-hover:border-brand-100 transition-all shadow-inner">
                            {internship.logo_url ? (
                              <img 
                                src={internship.logo_url} 
                                alt={internship.company_name} 
                                className="w-full h-full object-contain p-2" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                      const span = document.createElement('span');
                                      span.className = "text-2xl font-black text-slate-300 group-hover:text-brand-600";
                                      span.innerText = internship.company_name?.charAt(0) || 'C';
                                      parent.appendChild(span);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-2xl font-black text-slate-300 group-hover:text-brand-600">
                                {internship.company_name?.charAt(0) || 'C'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-xl font-black text-slate-900 truncate group-hover:text-brand-600 transition-colors cursor-pointer leading-tight mb-1"
                              title={internship.title}
                              onClick={() => {
                                recordFeedback(internship.id, 'click');
                                navigate(`/student/internship/${internship.id}`);
                              }}
                            >
                              {internship.title}
                            </h3>
                            <p className="text-sm text-slate-400 truncate font-bold uppercase tracking-widest">{internship.company_name || 'Unknown Company'}</p>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                            </div>
                            <span className="truncate">{internship.location}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="truncate capitalize">{internship.mode}</span>
                          </div>
                        </div>

                        {/* Skills */}
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-8 mt-auto">
                            {skillsList.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black border-2 border-slate-50 uppercase tracking-widest group-hover:border-slate-100 transition-all">
                                {skill}
                              </span>
                            ))}
                            {skillsList.length > 3 && (
                              <span className="px-3 py-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                +{skillsList.length - 3} More
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-auto pt-6 border-t-2 border-slate-50">
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            {internship.created_at ? formatDate(internship.created_at) : 'RECENTLY POSTED'}
                          </div>
                          <button
                            onClick={() => handleApply(internship.id)}
                            disabled={alreadyApplied || applyingId === internship.id}
                            className={`px-8 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest active:scale-95
                              ${alreadyApplied
                                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100 cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10'
                              }
                              disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            {applyingId === internship.id ? <ButtonSpinner /> : alreadyApplied ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 px-8 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-300">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No internships found</h3>
                <p className="text-slate-500 font-medium mb-8 text-center max-w-sm">Try adjusting your filters or keyword search to find more opportunities.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSearchLocation('');
                    setSearchMode('');
                    setSearchParams({});
                  }}
                  className="btn-secondary"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-6">
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => prev - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="btn-secondary btn-sm disabled:opacity-30"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page</span>
              <span className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                {currentPage}
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">of {totalPages}</span>
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="btn-secondary btn-sm disabled:opacity-30"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
