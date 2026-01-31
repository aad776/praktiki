import { useEffect, useState, FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Internship {
  id: number;
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
  student: {
    id: number;
    user_id: number;
  };
}

interface RecommendedStudent {
  student_id: number;
  student_name: string;
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

export function EmployerDashboard() {
  const { token, logout } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applicationsByInternship, setApplicationsByInternship] = useState<
    Record<number, Application[]>
  >({});
  const [recommendationsByInternship, setRecommendationsByInternship] = useState<
    Record<number, RecommendedStudent[]>
  >({});
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("remote");
  const [duration, setDuration] = useState(8);
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loadingRecsId, setLoadingRecsId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function createClient() {
    return axios.create({
      baseURL: "http://127.0.0.1:8000",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  useEffect(() => {
    if (!token) return;
    const client = createClient();
    client.get("/employers/my-internships").then((res) => setInternships(res.data));
  }, [token]);

  async function handlePostJob(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    // Validate required fields
    if (!title.trim()) {
      setError("Please enter a job title.");
      return;
    }
    
    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const client = createClient();
      const res = await client.post("/employers/internships", {
        title,
        description: "",
        location,
        mode,
        duration_weeks: duration,
        skills: skills.split(",").map(s => s.trim()).filter(s => s !== "")
      });

      setInternships((prev) => [...prev, res.data]);
      // Reset form
      setTitle("");
      setLocation("");
      setMode("remote");
      setDuration(8);
      setSkills("");
      setMessage("Internship posted successfully!");
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to post internship:", err);
      const errorMsg = err.response?.data?.detail || "Could not post internship. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications(internshipId: number) {
    if (!token) return;
    setLoadingId(internshipId);
    setMessage(null);
    setError(null);

    try {
      const client = createClient();
      const res = await client.get(`/employers/internships/${internshipId}/applications`);
      setApplicationsByInternship((prev) => ({
        ...prev,
        [internshipId]: res.data
      }));
    } catch (err: any) {
      console.error("Failed to load applications:", err);
      const errorMsg = err.response?.data?.detail || "Could not load applications. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoadingId(null);
    }
  }

  async function loadRecommendations(internshipId: number) {
    if (!token) return;
    setLoadingRecsId(internshipId);
    setMessage(null);
    setError(null);

    try {
      const client = createClient();
      const res = await client.get(`/employers/internships/${internshipId}/recommended-students`);
      setRecommendationsByInternship((prev) => ({
        ...prev,
        [internshipId]: res.data
      }));
    } catch (err: any) {
      console.error("Failed to load recommendations:", err);
      const errorMsg = err.response?.data?.detail || "Could not load recommendations. Please try again later.";
      setError(errorMsg);
    } finally {
      setLoadingRecsId(null);
    }
  }

  async function updateStatus(applicationId: number, status: string, internshipId: number) {
    if (!token) return;
    setUpdatingStatusId(applicationId);
    setMessage(null);
    setError(null);

    try {
      const client = createClient();
      await client.put(`/employers/applications/${applicationId}/status`, { status });
      setMessage(`Application ${status} successfully!`);
      
      // Refresh applications list
      const res = await client.get(`/employers/internships/${internshipId}/applications`);
      setApplicationsByInternship((prev) => ({
        ...prev,
        [internshipId]: res.data
      }));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to update application status:", err);
      const errorMsg = err.response?.data?.detail || "Could not update status. Please try again later.";
      setError(errorMsg);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  return (
    <div className="mx-auto max-w-5xl py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employer Dashboard</h1>
          <p className="text-sm text-slate-600">
            Post internships and manage applications from verified students.
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          Logout
        </button>
      </header>

      {(message || error) && (
        <div
          className={`rounded-md px-4 py-2 text-xs ${
            error
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">
            Post a Job
          </h2>
          <form className="space-y-3" onSubmit={handlePostJob}>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Job title
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Location
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mode
              </label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="remote">Remote</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Duration (weeks)
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Required Skills (comma separated)
              </label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="e.g. Python, React, SQL"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Posting..." : "Post job"}
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100 md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            My Internships
          </h2>
          <table className="min-w-full text-left text-xs mb-4">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2">Title</th>
                <th className="py-2">Location</th>
                <th className="py-2">Mode</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {internships.map((job) => (
                <tr key={job.id}>
                  <td className="py-2 text-slate-800">{job.title}</td>
                  <td className="py-2 text-slate-700">{job.location}</td>
                  <td className="py-2 text-slate-700">{job.mode}</td>
                  <td className="py-2 text-slate-700">{job.duration_weeks} weeks</td>
                  <td className="py-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadApplications(job.id)}
                      className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                    >
                      {loadingId === job.id ? "Loading..." : "Applications"}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadRecommendations(job.id)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                    >
                      {loadingRecsId === job.id ? "Loading..." : "AI Matches"}
                    </button>
                  </td>
                </tr>
              ))}
              {internships.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    No internships posted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-3 max-h-96 overflow-y-auto mt-4">
            {/* Applications Display */}
            {internships.map((job) => {
              const apps = applicationsByInternship[job.id] || [];
              if (apps.length === 0) return null;
              return (
                <div key={`apps-${job.id}`} className="rounded-md border border-slate-200 p-3 text-xs space-y-2">
                  <p className="font-semibold text-slate-800">Applications for {job.title}</p>
                  {apps.filter(app => app.status === "pending").map((app) => (
                    <div key={app.id} className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                      <div>
                        <p className="text-slate-700">Application #{app.id}</p>
                        <p className="text-slate-500 text-[10px]">Applied: {formatDate(app.applied_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(app.id, "accepted", job.id)} className="bg-emerald-600 px-2 py-1 text-white rounded">Accept</button>
                        <button onClick={() => updateStatus(app.id, "rejected", job.id)} className="bg-red-600 px-2 py-1 text-white rounded">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* AI Recommendations Display */}
            {internships.map((job) => {
              const recs = recommendationsByInternship[job.id] || [];
              if (recs.length === 0) return null;
              return (
                <div key={`recs-${job.id}`} className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs space-y-2">
                  <p className="font-semibold text-blue-900">AI Matches for {job.title}</p>
                  <div className="space-y-3">
                    {recs.map((rec) => (
                      <div key={rec.student_id} className="bg-white p-2 rounded border border-blue-100 space-y-1 shadow-sm">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-slate-800">{rec.student_name}</p>
                          <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">{rec.match_score}% match</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.matching_skills.map((s, i) => (
                            <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px]">{s}</span>
                          ))}
                          {rec.missing_skills.map((s, i) => (
                            <span key={i} className="bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded text-[9px]">{s} (missing)</span>
                          ))}
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded space-y-1">
                          <p className="text-[9px] font-semibold text-slate-700">Matching Insights:</p>
                          <div className="grid grid-cols-2 gap-2 text-[8px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Skills Match:</span>
                              <span className="font-medium text-slate-700">{rec.explanation?.rule_based_score}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">AI Semantic:</span>
                              <span className="font-medium text-slate-700">{rec.explanation?.embedding_score}%</span>
                            </div>
                            {rec.cross_encoder_score !== undefined && (
                              <div className="flex justify-between col-span-2 border-t border-slate-100 pt-1 mt-1">
                                <span className="text-blue-600 font-medium">Deep AI Analysis:</span>
                                <span className="font-bold text-blue-700">{rec.cross_encoder_score}%</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500 italic pt-1 border-t border-slate-100">
                            Candidate has {rec.matching_skills.length} matching skills for this role.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
