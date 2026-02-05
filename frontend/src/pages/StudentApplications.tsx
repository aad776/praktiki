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

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const appsRes = await api.get<Application[]>('/students/my-applications');
        setApplications(appsRes);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [toast]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-500 text-sm">{applications.length} applications total</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-200">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/student/internship/${app.internship_id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-slate-900 text-lg hover:text-brand-600 transition-colors">
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
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                      {app.status}
                    </span>
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
                    <div className="flex items-center gap-1.5 text-slate-400">
                      Applied on {formatDate(app.applied_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
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
          ))}

          {applications.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No applications yet</h3>
              <p className="text-slate-500 max-w-xs mx-auto mb-6">
                You haven't applied to any internships. Browse and find your perfect opportunity!
              </p>
              <button
                onClick={() => navigate('/student')}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold"
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

export default StudentApplications;
