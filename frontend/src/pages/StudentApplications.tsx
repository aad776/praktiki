import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader } from '../components/LoadingSpinner';

interface Application {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  hours_worked?: number;
  policy_used?: string;
  is_credit_requested?: boolean;
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

export function StudentApplications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'creditRequested' | 'completed' | 'pending' | 'rejected'>('ongoing');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [creditForm, setCreditForm] = useState({
    hours: '',
    policy: 'UGC'
  });

  const fetchApplications = async () => {
    try {
      const appsRes = await api.get<Application[]>('/students/my-applications');
      setApplications(appsRes);
      
      // Auto-switch to first available section if ongoing is empty
      const categorized = {
        creditRequested: appsRes.filter(app => app.is_credit_requested),
        ongoing: appsRes.filter(app => app.status === 'accepted' && !app.is_credit_requested),
        completed: appsRes.filter(app => app.status === 'completed' && !app.is_credit_requested),
        pending: appsRes.filter(app => (app.status === 'pending' || app.status === 'shortlisted') && !app.is_credit_requested),
        rejected: appsRes.filter(app => app.status === 'rejected' && !app.is_credit_requested)
      };

      if (categorized.ongoing.length === 0) {
        if (categorized.pending.length > 0) setActiveTab('pending');
        else if (categorized.completed.length > 0) setActiveTab('completed');
        else if (categorized.creditRequested.length > 0) setActiveTab('creditRequested');
        else if (categorized.rejected.length > 0) setActiveTab('rejected');
      }
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRequestCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setRequestLoading(true);
    try {
      await api.post('/credits/request', {
        application_id: selectedApp.id,
        hours: parseInt(creditForm.hours),
        policy_type: creditForm.policy
      });
      toast.success('Credit request submitted successfully!');
      setShowCreditModal(false);
      setCreditForm({ hours: '', policy: 'UGC' });
      fetchApplications();
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to submit credit request');
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading applications..." />;
  }

  const categorizedApps = {
    creditRequested: applications.filter(app => app.is_credit_requested),
    ongoing: applications.filter(app => app.status === 'accepted' && !app.is_credit_requested),
    completed: applications.filter(app => app.status === 'completed' && !app.is_credit_requested),
    pending: applications.filter(app => (app.status === 'pending' || app.status === 'shortlisted') && !app.is_credit_requested),
    rejected: applications.filter(app => app.status === 'rejected' && !app.is_credit_requested)
  };

  const ApplicationCard = ({ app }: { app: Application }) => (
    <div
      key={app.id}
      className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0"
      onClick={() => navigate(`/student/internship/${app.internship_id}`)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition-colors">
              {app.internship.title}
            </h3>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize border
                ${app.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : app.status === 'accepted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : app.status === 'shortlisted'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : app.status === 'completed'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                }`}
            >
              {app.status}
            </span>
            {app.is_credit_requested && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Credit Requested
              </span>
            )}
          </div>
          <p className="text-slate-600 font-medium mb-2">{app.internship.company_name}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {app.internship.location}
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {app.internship.mode}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-slate-400">Applied on {formatDate(app.applied_at)}</p>
          <div className="flex items-center gap-2">
            {app.status === 'accepted' && !app.is_credit_requested && (
              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-sm font-medium">
                Ongoing
              </div>
            )}
            <button 
              className="px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/student/internship/${app.internship_id}`);
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const TabButton = ({ id, label, count, colorClass }: { id: typeof activeTab, label: string, count: number, colorClass: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-start p-4 border-b-2 transition-all min-w-[140px] text-left ${
        activeTab === id 
          ? `border-brand-600 bg-brand-50/30` 
          : 'border-transparent hover:bg-slate-50'
      }`}
    >
      <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${
        activeTab === id ? 'text-brand-600' : 'text-slate-400'
      }`}>
        {label}
      </span>
      <span className={`text-2xl font-bold ${
        activeTab === id ? 'text-slate-900' : 'text-slate-500'
      }`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-500 mt-1">Manage your applications and internship status</p>
        </div>
      </div>

      {applications.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 bg-white overflow-x-auto no-scrollbar">
            <TabButton 
              id="ongoing" 
              label="Ongoing" 
              count={categorizedApps.ongoing.length} 
              colorClass="text-emerald-600"
            />
            <TabButton 
              id="pending" 
              label="Pending" 
              count={categorizedApps.pending.length} 
              colorClass="text-amber-600"
            />
            <TabButton 
              id="completed" 
              label="Completed" 
              count={categorizedApps.completed.length} 
              colorClass="text-purple-600"
            />
            <TabButton 
              id="creditRequested" 
              label="Credits" 
              count={categorizedApps.creditRequested.length} 
              colorClass="text-indigo-600"
            />
            <TabButton 
              id="rejected" 
              label="Rejected" 
              count={categorizedApps.rejected.length} 
              colorClass="text-red-600"
            />
          </div>

          {/* Tab Content */}
          <div className="divide-y divide-slate-100 min-h-[400px]">
            {activeTab === 'ongoing' && (
              categorizedApps.ongoing.length > 0 ? (
                categorizedApps.ongoing.map(app => <ApplicationCard key={app.id} app={app} />)
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-medium">No ongoing internships</p>
                </div>
              )
            )}
            
            {activeTab === 'pending' && (
              categorizedApps.pending.length > 0 ? (
                categorizedApps.pending.map(app => <ApplicationCard key={app.id} app={app} />)
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-medium">No pending applications</p>
                </div>
              )
            )}

            {activeTab === 'completed' && (
              categorizedApps.completed.length > 0 ? (
                categorizedApps.completed.map(app => <ApplicationCard key={app.id} app={app} />)
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-medium">No completed internships</p>
                </div>
              )
            )}

            {activeTab === 'creditRequested' && (
              categorizedApps.creditRequested.length > 0 ? (
                categorizedApps.creditRequested.map(app => <ApplicationCard key={app.id} app={app} />)
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-medium">No credit requests found</p>
                </div>
              )
            )}

            {activeTab === 'rejected' && (
              categorizedApps.rejected.length > 0 ? (
                categorizedApps.rejected.map(app => <ApplicationCard key={app.id} app={app} />)
              ) : (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-medium">No rejected applications</p>
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No applications yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            You haven't applied to any internships. Start your journey by browsing available opportunities!
          </p>
          <button
            onClick={() => navigate('/student')}
            className="px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20"
          >
            Browse Internships
          </button>
        </div>
      )}

      {/* Credit Request Modal */}
      {showCreditModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Request Internship Credits</h2>
              <button 
                onClick={() => setShowCreditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleRequestCredits} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 mb-2">
                <p className="text-sm font-medium text-slate-700">{selectedApp.internship.title}</p>
                <p className="text-xs text-slate-500">{selectedApp.internship.company_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Hours Worked</label>
                <input
                  type="number"
                  required
                  readOnly
                  value={creditForm.hours}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm bg-slate-50 text-slate-500 cursor-not-allowed outline-none transition-all"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 italic">
                  * Hours are autofilled based on employer completion report and cannot be edited.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Credit Policy</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreditForm({ ...creditForm, policy: 'UGC' })}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all ${
                      creditForm.policy === 'UGC'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    UGC Policy
                    <span className="block text-[10px] font-normal opacity-70">1 Credit / 30 Hrs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditForm({ ...creditForm, policy: 'AICTE' })}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all ${
                      creditForm.policy === 'AICTE'
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    AICTE Policy
                    <span className="block text-[10px] font-normal opacity-70">1 Credit / 40 Hrs</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="flex-1 px-4 py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                >
                  {requestLoading && (
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentApplications;
