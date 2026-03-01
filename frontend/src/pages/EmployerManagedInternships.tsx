import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/LoadingSpinner';
import { FiCheckCircle, FiClock, FiMapPin, FiBriefcase, FiUser, FiX } from 'react-icons/fi';

interface ManagedApplication {
  id: number;
  student_id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  student_name: string;
  internship_title: string;
  university_name?: string;
  course?: string;
  skills?: string;
}

interface Internship {
  id: number;
  title: string;
  location: string;
  mode: string;
  openings: number;
}

export function EmployerManagedInternships() {
  const [applications, setApplications] = useState<ManagedApplication[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [apps, ints] = await Promise.all([
        api.get<ManagedApplication[]>('/employers/applications/accepted'),
        api.get<Internship[]>('/employers/my-internships')
      ]);
      setApplications(apps);
      setInternships(ints);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const internshipStats = internships.map(int => ({
    ...int,
    ongoingCount: applications.filter(a => a.internship_id === int.id).length
  })).filter(int => int.ongoingCount > 0);

  const filteredApplications = applications.filter(a => 
    selectedInternshipId === null || a.internship_id === selectedInternshipId
  );

  const selectedInternship = internships.find(i => i.id === selectedInternshipId);

  const handleMarkAsCompleted = async (appId: number) => {
    // For now, we'll use a simple prompt for hours and policy
    const hoursStr = prompt("Enter total hours worked (e.g., 150):");
    if (!hoursStr) return;
    
    const hours = parseInt(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }

    const policy = confirm("Use UGC Policy? (Cancel for AICTE)") ? "UGC" : "AICTE";

    setCompletingId(appId);
    try {
      await api.put(`/employers/applications/${appId}/complete`, {
        hours_worked: hours,
        policy_type: policy
      });
      setApplications(prev => prev.filter(app => app.id !== appId));
      toast.success('Internship marked as completed successfully!');
      fetchData();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to complete internship');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <PageLoader label="Loading internships..." />;

  return (
    <div className="space-y-6 w-full max-w-full mx-auto px-4 sm:px-8 lg:px-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedInternshipId ? selectedInternship?.title : "Managed Internships"}
            </h1>
            <p className="text-slate-500 mt-1">
              {selectedInternshipId 
                ? `Managing ${filteredApplications.length} ongoing interns` 
                : "Track and manage active internship programs"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedInternshipId && (
            <button
              onClick={() => setSelectedInternshipId(null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-medium flex items-center gap-2"
            >
              <FiX /> Back to List
            </button>
          )}
          <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-100">
            {applications.length} Total Ongoing
          </span>
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
                <div className="bg-purple-50 text-purple-700 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <FiBriefcase size={24} />
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                  {int.ongoingCount} Active
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-brand-600 transition-colors">
                {int.title}
              </h3>
              <div className="space-y-2 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-2">
                  <FiMapPin className="shrink-0" /> {int.location}
                </div>
                <div className="flex items-center gap-2">
                  <FiUser className="shrink-0" /> {int.ongoingCount} Ongoing Interns
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-brand-600 font-semibold">
                <span>Manage Interns</span>
                <FiCheckCircle className="text-brand-500" />
              </div>
            </div>
          ))}
          {internshipStats.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiBriefcase className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No active internships</h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                Once you accept student applications, they will appear here for management and completion.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Managed Interns Detail View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                    {app.student_name.charAt(0)}
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
                    Active
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-lg mb-1">{app.student_name}</h3>
                <p className="text-brand-600 font-medium text-sm mb-4">{app.internship_title}</p>

                <div className="space-y-2.5 text-sm text-slate-600 mb-6">
                  <div className="flex items-center gap-2">
                    <FiClock className="text-slate-400" />
                    <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                  </div>
                  {app.university_name && (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-slate-400" />
                      <span className="truncate">{app.university_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => handleMarkAsCompleted(app.id)}
                  disabled={completingId === app.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold shadow-sm disabled:opacity-50"
                >
                  {completingId === app.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      Mark as Completed
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
