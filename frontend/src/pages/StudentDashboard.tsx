import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function StudentDashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  // State
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedInternship[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Loading states
  const [pageLoading, setPageLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchMode, setSearchMode] = useState('');

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

        // Fetch internships
        const internshipsRes = await api.get<Internship[]>('/students/internships');
        setInternships(internshipsRes);

        // Fetch applications
        const appsRes = await api.get<Application[]>('/students/my-applications');
        setApplications(appsRes);

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
  }, [toast]);

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
  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (searchLocation) params.append('location', searchLocation);
      if (searchMode) params.append('mode', searchMode);

      const response = await api.get<Internship[]>(`/students/internships?${params.toString()}`);
      setInternships(response);

      if (response.length === 0) {
        toast.info('No internships found matching your criteria.');
      }
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  // Apply handler
  const handleApply = async (internshipId: number) => {
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
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          Hi, {profile?.first_name || profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-slate-600">Welcome to your dashboard. Here's what's happening today.</p>
      </div>

      {/* Profile Completion Banner */}
      {!isProfileComplete() && profile && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            Complete your profile to unlock opportunities
          </h3>
          <p className="text-blue-700 max-w-lg mx-auto mb-6">
            Build your profile and resume to get personalized internship recommendations.
          </p>
          <button
            onClick={() => navigate('/student/setup')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            Complete Profile Now
          </button>
        </div>
      )}

      {/* Main Content - Only show if profile complete */}
      {isProfileComplete() && (
        <>
          {/* Search Section */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Internships</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keyword</label>
                <input
                  type="text"
                  placeholder="e.g. Software Developer"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
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
              <div className="flex items-end">
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
              </div>
            </div>
          </section>

          {/* Internships Grid */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Internships ({internships.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {internships.map((internship) => {
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
                          onClick={() => {
                            recordFeedback(internship.id, 'click');
                            navigate(`/student/internship/${internship.id}`);
                          }}
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
                        onClick={() => handleApply(internship.id)}
                        disabled={alreadyApplied || applyingId === internship.id}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all transform active:scale-95
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
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                            Applied
                          </>
                        ) : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {internships.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="font-medium">No internships found matching your criteria.</p>
                  <p className="text-sm">Try adjusting your filters or keywords.</p>
                </div>
              )}
            </div>
          </section>

          {/* Recommendations Section */}
          {recommendations.length > 0 && (
            <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Recommended For You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {recommendations.map((rec) => (
                  <div
                    key={rec.internship_id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3
                          className="font-semibold text-slate-900 cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            recordFeedback(rec.internship_id, 'click');
                            navigate(`/student/internship/${rec.internship_id}`);
                          }}
                        >
                          {rec.title}
                        </h3>
                        <p className="text-sm text-slate-600">{rec.company_name}</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {Math.round(rec.match_score)}% match
                      </span>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.matching_skills.slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {rec.missing_skills.slice(0, 2).map((skill, idx) => (
                        <span
                          key={`missing-${idx}`}
                          className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500"
                        >
                          {skill} (missing)
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleApply(rec.internship_id)}
                        disabled={appliedIds.has(rec.internship_id) || applyingId === rec.internship_id}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
                          flex items-center gap-2
                          ${appliedIds.has(rec.internship_id)
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          }
                          disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {applyingId === rec.internship_id && <ButtonSpinner />}
                        {appliedIds.has(rec.internship_id) ? 'Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default StudentDashboard;
