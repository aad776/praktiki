import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "../components/LoadingSpinner";
import { 
  FiUser, 
  FiCalendar, 
  FiBookOpen, 
  FiAward, 
  FiBriefcase, 
  FiFileText,
  FiCheck,
  FiX,
  FiSearch,
  FiFilter,
  FiMapPin
} from "react-icons/fi";

interface Applicant {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  student_name: string;
  internship_title: string;
  university_name?: string;
  course?: string;
  skills?: string;
  resume_url?: string;
}

interface Internship {
  id: number;
  title: string;
  location: string;
  mode: string;
  openings: number;
  deadline: string;
}

export function EmployerApplications() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<Applicant[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Applicant[]>("/employers/applications/all"),
      api.get<Internship[]>("/employers/my-internships")
    ])
      .then(([apps, ints]) => {
        setApplications(apps);
        setInternships(ints);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const internshipStats = useMemo(() => {
    return internships.map(int => ({
      ...int,
      applicantCount: applications.filter(a => a.internship_id === int.id).length,
      pendingCount: applications.filter(a => a.internship_id === int.id && a.status === 'pending').length
    }));
  }, [internships, applications]);

  const filtered = useMemo(() => {
    return applications.filter(a => {
      const matchesInternship = selectedInternshipId === null || a.internship_id === selectedInternshipId;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const name = (a.student_name || "Unknown Student").toLowerCase();
      const internship = (a.internship_title || "").toLowerCase();
      const matchesSearch = !search || 
        name.includes(search.toLowerCase()) || 
        internship.includes(search.toLowerCase());
      return matchesInternship && matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, search, selectedInternshipId]);

  const selectedInternship = useMemo(() => 
    internships.find(i => i.id === selectedInternshipId),
    [internships, selectedInternshipId]
  );

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map(a => a.id));
    }
  };

  const bulkUpdate = async (status: string) => {
    if (!selected.length) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/employers/applications/bulk-status", { application_ids: selected, status });
      const next = applications.map(a => selected.includes(a.id) ? { ...a, status } : a);
      setApplications(next);
      setSelected([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOne = async (id: number, status: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/employers/applications/${id}/status`, { status });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResume = async (app: Applicant) => {
    if (!app.resume_url) return;
    const filename = app.resume_url.split('/').pop();
    try {
      setLoading(true);
      const response = await api.get(`/students/resume/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("Failed to download resume: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && internships.length === 0 && applications.length === 0) {
    return <PageLoader label="Loading applications..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-16 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {/* Back Arrow - Only visible on Mobile */}
            <button 
              onClick={() => window.history.back()}
              className="sm:hidden p-2 -ml-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {selectedInternshipId ? selectedInternship?.title : "Applications Management"}
              </h1>
              <p className="text-slate-500 mt-1">
                {selectedInternshipId 
                  ? `Managing ${filtered.length} applications for this internship` 
                  : "Select an internship to view its applications"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {selectedInternshipId && (
              <button
                onClick={() => setSelectedInternshipId(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-medium flex items-center gap-2"
              >
                <FiX /> Back to Internships
              </button>
            )}
            {selected.length > 0 && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                <button
                  onClick={() => bulkUpdate("accepted")}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-medium"
                >
                  <FiCheck /> Accept Selected ({selected.length})
                </button>
                <button
                  onClick={() => bulkUpdate("rejected")}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-sm font-medium"
                >
                  <FiX /> Reject Selected ({selected.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {!selectedInternshipId ? (
          // Internship List View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internshipStats.map(int => (
              <div 
                key={int.id}
                onClick={() => setSelectedInternshipId(int.id)}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-brand-50 text-brand-700 w-12 h-12 rounded-2xl flex items-center justify-center">
                    <FiBriefcase size={24} />
                  </div>
                  {int.pendingCount > 0 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      {int.pendingCount} New
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-brand-600 transition-colors">
                  {int.title}
                </h3>
                <div className="space-y-2 text-sm text-slate-500 mb-6">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="shrink-0" /> {int.location} ({int.mode})
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUser className="shrink-0" /> {int.applicantCount} Total Applicants
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-brand-600 font-semibold">
                  <span>View Applications</span>
                  <FiCheck className="rotate-[-90deg]" />
                </div>
              </div>
            ))}
            {internships.length === 0 && !loading && (
              <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center shadow-sm">
                <FiBriefcase className="text-slate-300 text-4xl mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No internships posted yet</h3>
                <p className="text-slate-500">Post your first internship to start receiving applications.</p>
              </div>
            )}
          </div>
        ) : (
          // Applications Detail View
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-sm flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search by student name or skills..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-600"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-48">
                  <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none appearance-none bg-white text-slate-600"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <button 
                  onClick={selectAll}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium whitespace-nowrap"
                >
                  {selected.length === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 mb-8 flex items-center gap-3">
                <FiX className="shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(app => (
                <div 
                  key={app.id} 
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden group ${
                    selected.includes(app.id) 
                      ? 'border-brand-500 ring-2 ring-brand-500/10 shadow-md' 
                      : 'border-slate-200 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 shadow-sm'
                  }`}
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => toggle(app.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                            selected.includes(app.id)
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'bg-white border-slate-300 text-transparent hover:border-brand-500'
                          }`}
                        >
                          <FiCheck size={14} strokeWidth={3} className={selected.includes(app.id) ? 'opacity-100' : 'opacity-0'} />
                        </div>
                        <div className="bg-brand-50 text-brand-700 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl">
                          {app.student_name?.[0] || 'S'}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                        app.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-brand-600 transition-colors">
                          {app.student_name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-brand-600 font-semibold text-sm mt-1">
                          <FiBriefcase size={14} />
                          {app.internship_title}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-100 mt-4">
                        <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                          <FiCalendar className="text-slate-400" />
                          <span className="font-medium">Applied:</span> {new Date(app.applied_at).toLocaleDateString('en-GB')}
                        </div>
                        {app.course && (
                          <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                            <FiBookOpen className="text-slate-400" />
                            <span className="font-medium">Course:</span> {app.course}
                          </div>
                        )}
                        {app.university_name && (
                          <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                            <FiAward className="text-slate-400" />
                            <span className="font-medium">University:</span> {app.university_name}
                          </div>
                        )}
                      </div>

                      {app.skills && (
                        <div className="pt-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {app.skills.split(',').map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleDownloadResume(app)}
                      disabled={!app.resume_url}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        app.resume_url 
                          ? 'bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 shadow-sm' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <FiFileText /> Resume
                    </button>

                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateOne(app.id, 'accepted')}
                            className="p-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Accept Application"
                          >
                            <FiCheck size={18} />
                          </button>
                          <button
                            onClick={() => updateOne(app.id, 'rejected')}
                            className="p-2 bg-rose-100 text-rose-700 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Reject Application"
                          >
                            <FiX size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center shadow-sm">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiSearch className="text-slate-300 text-4xl" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No applications found</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  We couldn't find any applications matching your current search or filter criteria for this internship.
                </p>
              </div>
            )}
          </>
        )}
        
        {loading && (
          <div className="fixed bottom-8 right-8 bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-in slide-in-from-bottom-10">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-slate-700">Updating...</p>
          </div>
        )}
      </div>
    </div>
  );
}
