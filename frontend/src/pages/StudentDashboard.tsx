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
  const { refreshUser } = useAuth();
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Internships ({internships.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
              {internships.map((internship) => {
                const alreadyApplied = appliedIds.has(internship.id);
                return (
                  <div
                    key={internship.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3
                      className="font-semibold text-slate-900 cursor-pointer hover:text-blue-600"
                      onClick={() => {
                        recordFeedback(internship.id, 'click');
                        navigate(`/student/internship/${internship.id}`);
                      }}
                    >
                      {internship.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {internship.mode}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">
                        {internship.location}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {internship.duration_weeks} weeks
                      </span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleApply(internship.id)}
                        disabled={alreadyApplied || applyingId === internship.id}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
                          flex items-center gap-2
                          ${alreadyApplied
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                          }
                          disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {applyingId === internship.id && <ButtonSpinner />}
                        {alreadyApplied ? 'Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {internships.length === 0 && (
                <p className="col-span-full text-center text-slate-500 py-8">
                  No internships found. Try adjusting your search.
                </p>
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

      {/* Applications Section - Always visible */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Applications</h2>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {applications.map((app) => (
            <div
              key={app.id}
              className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3
                    className="font-semibold text-slate-900 cursor-pointer hover:text-blue-600"
                    onClick={() => navigate(`/student/internship/${app.internship_id}`)}
                  >
                    {app.internship.title}
                  </h3>
                  <p className="text-sm text-slate-600">{app.internship.company_name}</p>
                  <p className="text-xs text-slate-500 mt-1">Applied {formatDate(app.applied_at)}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full capitalize
                    ${app.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : app.status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : app.status === 'shortlisted'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                  {app.status}
                </span>
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <p className="text-center text-slate-500 py-8">
              You haven't applied to any internships yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default StudentDashboard;
