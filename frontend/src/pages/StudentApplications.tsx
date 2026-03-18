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

interface Certificate {
  id: number;
  internship_title: string;
  organization_name: string;
  student_name?: string;
  duration_in_months?: number;
  performance_remark?: string;
  application_id?: number;
  verification_status: string;
  created_at: string;
  file_url: string;
}

export function StudentApplications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'pending' | 'rejected' | 'external'>('ongoing');
  const [certImageUrls, setCertImageUrls] = useState<Record<number, string>>({});

  const fetchCertImage = async (certId: number) => {
    if (certImageUrls[certId]) return;
    try {
      const response = await api.get(`/certificates/view/${certId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response as Blob);
      setCertImageUrls(prev => ({ ...prev, [certId]: url }));
    } catch (err) {
      console.error('Failed to fetch certificate image:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [appsRes, certsRes] = await Promise.all([
        api.get<Application[]>('/students/my-applications'),
        api.get<Certificate[]>('/certificates')
      ]);
      
      setApplications(appsRes);
      setCertificates(certsRes || []);
      
      // Auto-switch logic
      const categorized = {
        ongoing: appsRes.filter(app => app.status === 'accepted' && !app.is_credit_requested),
        completed: appsRes.filter(app => app.status === 'completed' || app.is_credit_requested),
        pending: appsRes.filter(app => (app.status === 'pending' || app.status === 'shortlisted' || app.status === 'applied') && !app.is_credit_requested),
        rejected: appsRes.filter(app => app.status === 'rejected' && !app.is_credit_requested),
        external: certsRes || []
      };

      if (categorized.ongoing.length === 0) {
        if (categorized.pending.length > 0) setActiveTab('pending');
        else if (categorized.completed.length > 0) setActiveTab('completed');
        else if (categorized.external.length > 0) setActiveTab('external');
        else if (categorized.rejected.length > 0) setActiveTab('rejected');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      const error = err as ApiError;
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <PageLoader label="Loading applications..." />;
  }

  type CategorizedApps = {
    ongoing: Application[];
    completed: Application[];
    pending: Application[];
    rejected: Application[];
    external: Certificate[];
  };

  const categorizedApps: CategorizedApps = {
    ongoing: applications.filter(app => app.status === 'accepted' && !app.is_credit_requested),
    completed: applications.filter(app => app.status === 'completed' || app.is_credit_requested),
    pending: applications.filter(app => (app.status === 'pending' || app.status === 'shortlisted' || app.status === 'applied') && !app.is_credit_requested),
    rejected: applications.filter(app => app.status === 'rejected' && !app.is_credit_requested),
    external: certificates.filter(cert => !cert.application_id)
  };

  // Helper to get consistent credit label
  const getCreditLabel = (app: Application) => {
    const status = app.credit_request_status || app.credit_status;
    if (app.is_pushed_to_abc) return 'Credited in ABC';
    if (status === 'approved') return 'Credits Approved';
    if (status === 'rejected') return 'Credits Rejected';
    return 'Credit Requested';
  };

  const CertificateCard = ({ cert }: { cert: Certificate }) => (
    <div 
      key={cert.id} 
      className="p-8 hover:bg-slate-50/80 transition-all cursor-pointer border-b border-slate-100 last:border-0 group flex items-center justify-between gap-6"
      onClick={() => navigate(`/student/certificate/${cert.id}`)}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-slate-900 text-xl md:text-2xl group-hover:text-brand-600 transition-colors leading-tight mb-2">
          {cert.internship_title || 'External Internship'}
        </h3>
        <p className="text-sm md:text-base text-slate-500 font-bold mb-3">{cert.organization_name || 'Organization Not Specified'}</p>
        <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-widest">
          <span className="text-slate-400">Uploaded on {formatDate(cert.created_at)}</span>
          <span className={`px-3 py-1 rounded-xl border-2 ${
            cert.verification_status === 'VERIFIED' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : cert.verification_status === 'REJECTED'
              ? 'bg-rose-50 text-rose-700 border-rose-100'
              : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}>
            {cert.verification_status}
          </span>
        </div>
      </div>
      <div className="p-4 text-slate-300 group-hover:text-brand-600 transition-all bg-slate-50 group-hover:bg-brand-50 rounded-2xl border border-transparent group-hover:border-brand-100 shrink-0">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );

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

    return (
    <div
      key={app.id}
      className="p-8 hover:bg-slate-50/80 transition-all cursor-pointer group border-b border-slate-100 last:border-0"
      onClick={() => internship.id && navigate(`/student/internship/${app.internship_id}`)}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h3 className="font-black text-slate-900 text-xl md:text-2xl group-hover:text-brand-600 transition-colors leading-tight">
              {internship.title}
            </h3>
            <span
              className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-xl border-2
                ${app.status === 'pending' || app.status === 'applied'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : app.status === 'accepted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : app.status === 'shortlisted'
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : app.status === 'completed'
                  ? 'bg-purple-50 text-purple-700 border-purple-100'
                  : 'bg-red-50 text-red-700 border-red-100'
                }`}
            >
              {app.status}
            </span>
          </div>
          <p className="text-sm md:text-base text-slate-500 font-bold mb-4">{internship.company_name}</p>
          <div className="flex flex-wrap gap-6 text-xs font-black uppercase tracking-widest">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {internship.location}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {internship.mode}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Applied on {formatDate(app.applied_at)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {app.status === 'accepted' && !app.is_credit_requested && (
            <div className="px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-100">
              Ongoing
            </div>
          )}
          {app.status === 'completed' && !app.is_credit_requested && (
            <button 
              className="px-8 py-3.5 text-sm font-black bg-brand-600 text-white hover:bg-brand-700 rounded-2xl transition-all shadow-xl shadow-brand-100 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/student/certificate-upload?application_id=${app.id}`);
              }}
            >
              Request Credits
            </button>
          )}
          <div className="p-4 text-slate-300 group-hover:text-brand-600 transition-all bg-slate-50 group-hover:bg-brand-50 rounded-2xl border border-transparent group-hover:border-brand-100">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="container-wide">
        <div className="flex items-center justify-between mb-10 gap-6 flex-wrap">
          <div>
            <h1>My Applications</h1>
            <p className="text-slate-500 font-medium">Track your internship progress and earn credits</p>
          </div>
          <button 
            onClick={() => navigate('/student/certificate-upload')}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Certificate
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide gap-2">
          {[
            { id: 'ongoing', label: 'Ongoing', count: categorizedApps.ongoing.length },
            { id: 'pending', label: 'Applied', count: categorizedApps.pending.length },
            { id: 'completed', label: 'Completed', count: categorizedApps.completed.length },
            { id: 'external', label: 'External', count: categorizedApps.external.length },
            { id: 'rejected', label: 'Rejected', count: categorizedApps.rejected.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all
                ${activeTab === tab.id 
                  ? 'border-slate-900 text-slate-900' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="card-base overflow-hidden min-h-[400px]">
          {activeTab === 'external' ? (
            <div className="divide-y divide-slate-100">
              {categorizedApps.external.length > 0 ? (
                categorizedApps.external.map(cert => (
                  <CertificateCard key={cert.id} cert={cert} />
                ))
              ) : (
                <EmptyState 
                  icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  title="No external certificates"
                  description="You haven't uploaded any certificates from outside this portal yet."
                  buttonText="Upload Now"
                  onAction={() => navigate('/student/certificate-upload')}
                />
              )}
            </div>
          ) : categorizedApps[activeTab].length > 0 ? (
            <div className="divide-y divide-slate-100">
              {categorizedApps[activeTab].map(app => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              title="Nothing to show"
              description={`You don't have any ${activeTab} applications yet.`}
              buttonText="Browse Internships"
              onAction={() => navigate('/student/dashboard')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const EmptyState = ({ icon, title, description, buttonText, onAction }: any) => (
  <div className="py-24 px-6 text-center">
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
      </svg>
    </div>
    <h3 className="mb-1">{title}</h3>
    <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8 font-medium">{description}</p>
    <button onClick={onAction} className="btn-primary">
      {buttonText}
    </button>
  </div>
);
