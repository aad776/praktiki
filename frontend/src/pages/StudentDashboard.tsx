import { useEffect, useState, FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface StudentProfile {
  id: number;
  user_id: number;
  apaar_id: string | null;
  is_apaar_verified: boolean;
  university_name: string | null;
  department: string | null;
  year: number | null;
  cgpa: string | null;
  skills: string | null;
  projects: string | null;
  phone_number: string | null;
}

interface RecommendedInternship {
  internship_id: number;
  title: string;
  company_name: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: {
    matched_skills: string[];
    missing_skills: string[];
    rule_based_score: number;
    embedding_score: number;
    weights: {
      rule: number;
      embedding: number;
    };
  };
  cross_encoder_score?: number;
}

interface Internship {
  id: number;
  employer_id: number;
  title: string;
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
    description: string | null;
    location: string;
    mode: string;
    duration_weeks: number;
    company_name: string;
  };
}

export function StudentDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [resume, setResume] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<RecommendedInternship[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applyLoadingId, setApplyLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchMode, setSearchMode] = useState("");

  function createClient() {
    return axios.create({
      baseURL: "http://127.0.0.1:8000",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  useEffect(() => {
    if (!token) return;

    const client = createClient();

    client.get("/students/me").then((res) => {
      setProfile(res.data);
    });

    client.get("/students/me/resume").then((res) => {
        setResume(res.data);
    }).catch(err => {
        // It's okay if resume doesn't exist yet, but we should know
        console.log("Resume not found or error", err);
    });

    // Fetch these only if profile is already complete
    client.get("/students/recommendations").then((res) => {
      setRecommendations(res.data);
      // Record 'view' feedback for each recommendation
      if (res.data && res.data.length > 0) {
        res.data.forEach((rec: RecommendedInternship) => {
          recordFeedback(rec.internship_id, "view");
        });
      }
    });
    
    // Fetch all internships initially
    client.get("/students/internships").then((res) => {
      setInternships(res.data);
      setFilteredInternships(res.data);
    });
    
    client.get("/students/my-applications").then((res) => setApplications(res.data));
  }, [token]);

  // Handle AI Feedback
  const recordFeedback = async (internshipId: number, action: string) => {
    if (!token) return;
    try {
      const client = createClient();
      await client.post("/students/feedback", {
        internship_id: internshipId,
        action: action
      });
    } catch (err) {
      console.error("Failed to record feedback:", err);
    }
  };

  // Handle search functionality
  const handleSearch = async () => {
    if (!token) return;
    
    const client = createClient();
    
    // Build search parameters
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (searchLocation) params.append("location", searchLocation);
    if (searchMode) params.append("mode", searchMode);
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const res = await client.get(`/students/internships?${params.toString()}`);
      setFilteredInternships(res.data);
      if (res.data.length === 0) {
        setMessage("No internships found matching your criteria. Try adjusting your search.");
      }
    } catch (err: any) {
      console.error("Search failed:", err);
      const errorMsg = err.response?.data?.detail || "Failed to search internships. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const appliedIds = new Set(applications.map((a) => a.internship_id));

  async function handleApply(internshipId: number) {
    if (!token) return;
    setApplyLoadingId(internshipId);
    setMessage(null);
    setError(null);

    try {
      const client = createClient();
      await client.post("/students/apply", { internship_id: internshipId });
      
      // Record 'apply' feedback
      await recordFeedback(internshipId, "apply");
      
      setMessage("Application submitted successfully!");
      // Update applications list
      const appsRes = await client.get("/students/my-applications");
      setApplications(appsRes.data);
    } catch (err: any) {
      console.error("Application failed:", err);
      let errorMsg = "Could not submit application. Please try again.";
      
      if (err.response?.status === 409) {
        errorMsg = "You have already applied for this internship.";
      } else if (err.response?.status === 403) {
        errorMsg = "You are not eligible to apply for this internship.";
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      
      setError(errorMsg);
    } finally {
      setApplyLoadingId(null);
    }
  }

  function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  // Check if profile exists in database
  const profileExists = () => {
    return profile !== null;
  };

  // Check if profile is complete based on saved data from database
  const isProfileComplete = () => {
    if (!profile) return false;
    
    // Check Profile Basics
    const hasBasicProfile = !!(profile.university_name && profile.department && profile.year && profile.cgpa && profile.skills);
    
    // Check Resume (At least objective or file must exist)
    const hasResume = resume && (resume.career_objective || resume.resume_file_path || resume.work_experience);

    return hasBasicProfile && hasResume;
  };

  // State for profile dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      {/* Profile Completion Banner */}
      {!isProfileComplete() && profile && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm flex flex-col items-center justify-center text-center py-12">
          <div className="mb-4 text-6xl">📝</div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Complete your profile & resume to unlock opportunities</h3>
          <p className="text-blue-700 max-w-lg mb-6">
            You need to complete your profile details and build your resume before you can search and apply for internships.
          </p>
          <button
            onClick={() => navigate("/student/setup")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            Complete Profile Now
          </button>
        </div>
      )}

      {isProfileComplete() && (
        <>
      {/* Search Section */}
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Search Internships
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Keyword
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. Software Developer"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Location
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. Bangalore"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mode
            </label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value)}
            >
              <option value="">All Modes</option>
              <option value="remote">Remote</option>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </section>

      {/* Internships Results Section */}
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Internships ({filteredInternships.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredInternships.map((internship) => {
            const alreadyApplied = appliedIds.has(internship.id);
            return (
              <div
                key={internship.id}
                className="rounded-md border border-slate-200 p-3 text-xs space-y-2 hover:shadow-sm transition-shadow"
              >
                <div>
                  <p 
                    className="font-semibold text-slate-800 cursor-pointer hover:text-blue-600" 
                    onClick={() => {
                      recordFeedback(internship.id, "click");
                      window.location.href = `/student/internship/${internship.id}`;
                    }}
                  >
                    {internship.title}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 text-slate-500">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                    {internship.mode}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-green-50 text-green-800 border border-green-200">
                    {internship.location}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-800 border border-purple-200">
                    {internship.duration_weeks} weeks
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleApply(internship.id)}
                    disabled={alreadyApplied || applyLoadingId === internship.id}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                      alreadyApplied
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {applyLoadingId === internship.id ? (
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></span>
                    ) : null}
                    {alreadyApplied ? "Applied" : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredInternships.length === 0 && (
            <div className="col-span-full py-4 text-center">
              <p className="text-xs text-slate-500">
                {loading ? "Searching..." : "No internships found matching your criteria."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Recommendations Section */}
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Recommended For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {recommendations.map((rec) => {
            return (
              <div
                key={rec.internship_id}
                className="rounded-md border border-slate-200 p-3 text-xs space-y-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p 
                      className="font-semibold text-slate-800 cursor-pointer hover:text-blue-600" 
                      onClick={() => {
                        recordFeedback(rec.internship_id, "click");
                        window.location.href = `/student/internship/${rec.internship_id}`;
                      }}
                    >
                      {rec.title}
                    </p>
                    <p className="text-slate-600 text-[10px]">{rec.company_name}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    {rec.match_score}% match
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rec.matching_skills.map((skill: string, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {skill}
                    </span>
                  ))}
                  {rec.missing_skills.length > 0 && rec.missing_skills.map((skill: string, idx: number) => (
                    <span key={`missing-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                      {skill} (missing)
                    </span>
                  ))}
                </div>
                
                {/* AI Explanation Breakdown */}
                <div className="bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-700">AI Matching Insights:</p>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rule-based:</span>
                      <span className="font-medium text-slate-700">{rec.explanation?.rule_based_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Embedding:</span>
                      <span className="font-medium text-slate-700">{rec.explanation?.embedding_score}%</span>
                    </div>
                    {rec.cross_encoder_score !== undefined && (
                      <div className="flex justify-between col-span-2 border-t border-slate-100 pt-1 mt-1">
                        <span className="text-blue-600 font-medium">AI Reranking Score:</span>
                        <span className="font-bold text-blue-700">{rec.cross_encoder_score}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 italic leading-tight pt-1 border-t border-slate-200 mt-1">
                    Matched {rec.matching_skills.length} skills. 
                    {rec.match_score > 80 ? " Excellent fit for your profile!" : 
                     rec.match_score > 50 ? " Good match based on your skills." : 
                     " Potential match with some skill gaps."}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleApply(rec.internship_id);
                    }}
                    disabled={appliedIds.has(rec.internship_id) || applyLoadingId === rec.internship_id}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                      appliedIds.has(rec.internship_id)
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {applyLoadingId === rec.internship_id ? (
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent mr-1"></span>
                    ) : null}
                    {appliedIds.has(rec.internship_id) ? "Applied" : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
          {recommendations.length === 0 && (
            <div className="col-span-full py-4 text-center">
              <p className="text-xs text-slate-500">
                Complete your profile to get personalized internship recommendations.
              </p>
            </div>
          )}
        </div>
      </section>
      </>
      )}

      {/* Applications Section */}
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          My Applications
        </h2>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {applications.map((app) => {
            return (
              <div
                key={app.id}
                className="rounded-md border border-slate-200 p-3 text-xs space-y-1 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => window.location.href = `/student/internship/${app.internship_id}`}>
                    {app.internship.title}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    app.status === "pending"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : app.status === "accepted"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2">{app.internship.description}</p>
              </div>
            );
          })}
          {applications.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500">
                You have not applied to any internships yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}