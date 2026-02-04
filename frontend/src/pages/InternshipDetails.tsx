import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { PageLoader, ButtonSpinner } from '../components/LoadingSpinner';

interface InternshipDetail {
  id: number;
  title: string;
  description: string;
  location: string;
  mode: string;
  duration_weeks: number;
  employer?: {
    company_name: string;
    contact_number?: string;
  };
}

interface Application {
  id: number;
  internship_id: number;
  status: string;
}

export function InternshipDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Fetch internship details
        const response = await api.get<InternshipDetail>(`/students/internships/${id}`);
        setInternship(response);

        // Fetch user's applications to check if already applied
        const appsRes = await api.get<Application[]>('/students/my-applications');
        setApplications(appsRes);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || 'Failed to load internship details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const hasApplied = applications.some(app => app.internship_id === parseInt(id || '0'));
  const applicationStatus = applications.find(app => app.internship_id === parseInt(id || '0'))?.status;

  const handleApply = async () => {
    if (!id) return;
    
    setApplying(true);
    try {
      await api.post('/students/apply', { internship_id: parseInt(id) });
      
      // Record feedback
      await api.post('/students/feedback', { internship_id: parseInt(id), action: 'apply' }).catch(() => {});
      
      toast.success('Application submitted successfully!');
      
      // Refresh applications
      const appsRes = await api.get<Application[]>('/students/my-applications');
      setApplications(appsRes);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading internship details..." />;
  }

  if (!internship) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Internship Not Found</h2>
        <p className="text-slate-600 mb-4">The internship you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/student')}
          className="text-blue-600 hover:underline font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        ← Back
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{internship.title}</h1>
              {internship.employer && (
                <p className="text-lg text-slate-600">{internship.employer.company_name}</p>
              )}
            </div>
            {hasApplied ? (
              <span
                className={`px-3 py-1.5 text-sm font-medium rounded-full capitalize
                  ${applicationStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : applicationStatus === 'accepted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : applicationStatus === 'shortlisted'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
              >
                {applicationStatus}
              </span>
            ) : null}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {internship.mode}
            </span>
            <span className="px-3 py-1 text-sm rounded-full bg-green-50 text-green-700 border border-green-200">
              {internship.location}
            </span>
            <span className="px-3 py-1 text-sm rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {internship.duration_weeks} weeks
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">About the Role</h2>
          <div className="prose prose-slate prose-sm max-w-none">
            <p className="text-slate-600 whitespace-pre-wrap">{internship.description}</p>
          </div>
        </div>

        {/* Company Info */}
        {internship.employer && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Company Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Company Name</span>
                <p className="font-medium text-slate-900">{internship.employer.company_name}</p>
              </div>
              {internship.employer.contact_number && (
                <div>
                  <span className="text-slate-500">Contact</span>
                  <p className="font-medium text-slate-900">{internship.employer.contact_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="p-6 border-t border-slate-200">
          <button
            onClick={handleApply}
            disabled={hasApplied || applying}
            className={`w-full py-3 rounded-lg font-medium transition-colors
              flex items-center justify-center gap-2
              ${hasApplied
                ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
              }
              disabled:opacity-60`}
          >
            {applying && <ButtonSpinner />}
            {hasApplied ? 'Already Applied' : applying ? 'Submitting...' : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InternshipDetails;
