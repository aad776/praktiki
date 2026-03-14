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
  credit_request_status?: string;
  credit_status?: string;
  certificate_status?: string;
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

export function StudentApplications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'pending' | 'rejected'>('ongoing');
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
        ongoing: appsRes.filter(app => app.status === 'accepted' && !app.is_credit_requested),
        completed: appsRes.filter(app => app.status === 'completed' || app.is_credit_requested),
        pending: appsRes.filter(app => (app.status === 'pending' || app.status === 'shortlisted' || app.status === 'applied') && !app.is_credit_requested),
        rejected: appsRes.filter(app => app.status === 'rejected' && !app.is_credit_requested)
      };

      if (categorized.ongoing.length === 0) {
        if (categorized.pending.length > 0) setActiveTab('pending');
        else if (categorized.completed.length > 0) setActiveTab('completed');
        else if (categorized.rejected.length > 0) setActiveTab('rejected');
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
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
    completed: applications.filter(app => app.status === 'completed' || app.is_credit_requested),
    pending: applications.filter(app => (app.status === 'pending' || app.status === 'shortlisted' || app.status === 'applied') && !app.is_credit_requested),
    rejected: applications.filter(app => app.status === 'rejected' && !app.is_credit_requested)
  };

  const ApplicationCard = ({ app }: { app: Application }) => {
    // Safety check for invalid application data
    if (!app) return null;

    const internship = app.internship || {
      id: 0,
      title: 'Unknown Internship',
      description: '',
      location: 'N/A',
      mode: 'N/A',
      duration_weeks: 0,
      company_name: 'Unknown Company',
    };

    const creditStatus = app.credit_request_status || app.credit_status;

    return (
    <div
      key={app.id}
      className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0"
      onClick={() => internship.id && navigate(`/student/internship/${app.internship_id}`)}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition-colors">
              {internship.title}
            </h3>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize border
                ${app.status === 'pending' || app.status === 'applied'
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
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border 
                ${app.is_pushed_to_abc
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : creditStatus === 'approved' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : creditStatus === 'rejected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {app.is_pushed_to_abc ? 'Credited in ABC' : 
                 creditStatus === 'approved' ? 'Credits Approved' : 
                 creditStatus === 'rejected' ? 'Credits Rejected' : 'Credit Requested'}
              </span>
            )}
            {app.certificate_status && (
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border 
                ${app.certificate_status === 'VERIFIED' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : app.certificate_status === 'FLAGGED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {app.certificate_status === 'VERIFIED' ? 'Certificate Verified' : 
                 app.certificate_status === 'FLAGGED' ? 'Certificate Flagged' : 'Certificate Submitted'}
              </span>
            )}
          </div>
          <p className="text-slate-600 font-medium mb-2">{internship.company_name}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {internship.location}
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {internship.mode}
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
            {app.status === 'completed' && !app.is_credit_requested && (
              <button 
                className="px-4 py-2 text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors shadow-sm shadow-brand-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/student/certificate-upload?application_id=${app.id}`);
                }}
              >
                Request Credits
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
            <p className="text-slate-500">Track your internship application status and credits</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          {[
            { id: 'ongoing', label: 'Ongoing', count: categorizedApps.ongoing.length },
            { id: 'pending', label: 'Applied/Pending', count: categorizedApps.pending.length },
            { id: 'completed', label: 'Completed/Credits', count: categorizedApps.completed.length },
            { id: 'rejected', label: 'Rejected', count: categorizedApps.rejected.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id 
                  ? 'border-brand-600 text-brand-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {categorizedApps[activeTab].length > 0 ? (
            <div>
              {categorizedApps[activeTab].map(app => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-slate-900 font-bold text-lg mb-1">No applications found</h3>
              <p className="text-slate-500">You don't have any {activeTab} applications at the moment.</p>
              <button 
                onClick={() => navigate('/posted-internships')}
                className="mt-6 px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 transition-colors"
              >
                Browse Internships
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
