import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { 
  FiMapPin, 
  FiClock, 
  FiCalendar, 
  FiDollarSign, 
  FiUsers, 
  FiCheckCircle, 
  FiArrowLeft,
  FiGlobe,
  FiBriefcase,
  FiInfo,
  FiPhone,
  FiMail,
  FiLink,
  FiActivity,
  FiAward,
  FiTarget
} from "react-icons/fi";

interface InternshipDetail {
  id: number;
  title: string;
  description: string | null;
  location: string;
  mode: string;
  duration_weeks: number;
  start_date: string | null;
  end_date: string | null;
  is_flexible_time: boolean;
  stipend_amount: number | null;
  stipend_currency: string;
  stipend_cycle: string;
  deadline: string | null;
  skills_required: string | null;
  qualifications: string | null;
  benefits: string | null;
  openings: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  application_link: string | null;
  application_email: string | null;
}

interface EmployerDetail {
  id: number;
  company_name: string;
  organization_description: string | null;
  city: string | null;
  industry: string | null;
  employee_count: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_verified: boolean;
  contact_number: string | null;
}

interface PageData {
  internship: InternshipDetail;
  employer: EmployerDetail;
}

export function EmployerInternshipDetails() {
  const { token } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !id) return;
      
      try {
        setLoading(true);
        const res = await api.get<PageData>(`/employers/internships/${id}`);
        setData(res);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching internship details:", err);
        setError(err.message || "Failed to load internship details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">Fetching details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <FiInfo size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Something went wrong</h3>
          <p className="text-slate-600">{error || "Internship not found"}</p>
          <button 
            onClick={() => navigate('/employer')}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { internship, employer } = data;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Immediately";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const skills = internship.skills_required ? internship.skills_required.split(',') : [];
  const benefits = internship.benefits ? internship.benefits.split(',') : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/employer')}
          className="flex items-center text-slate-600 hover:text-teal-600 transition-colors font-medium"
        >
          <FiArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold uppercase tracking-wider rounded-full">
                    {internship.mode}
                  </span>
                  {internship.is_flexible_time && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider rounded-full">
                      Flexible Hours
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{internship.title}</h1>
                <div className="flex items-center text-slate-600 font-medium">
                  <span className="mr-2">{employer.company_name}</span>
                  {employer.is_verified && <FiCheckCircle className="text-blue-500" />}
                </div>
              </div>
              {employer.logo_url && (
                <img 
                  src={employer.logo_url} 
                  alt={`${employer.company_name} logo`} 
                  className="w-16 h-16 object-contain rounded-lg border border-slate-100"
                />
              )}
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center text-slate-400 text-sm uppercase tracking-wide font-semibold">
                  <FiMapPin className="mr-1.5" /> Location
                </div>
                <p className="text-slate-800 font-medium">{internship.location}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-slate-400 text-sm uppercase tracking-wide font-semibold">
                  <FiCalendar className="mr-1.5" /> Start Date
                </div>
                <p className="text-slate-800 font-medium">{formatDate(internship.start_date)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-slate-400 text-sm uppercase tracking-wide font-semibold">
                  <FiClock className="mr-1.5" /> Duration
                </div>
                <p className="text-slate-800 font-medium">{internship.duration_weeks} Weeks</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-slate-400 text-sm uppercase tracking-wide font-semibold">
                  <FiDollarSign className="mr-1.5" /> Stipend
                </div>
                <p className="text-slate-800 font-medium">
                  {internship.stipend_amount 
                    ? `${internship.stipend_currency} ${internship.stipend_amount} / ${internship.stipend_cycle}`
                    : "Unpaid"
                  }
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
               <div className="flex items-center">
                 <FiUsers className="mr-2" />
                 <span>{internship.openings} Opening{internship.openings > 1 ? 's' : ''}</span>
               </div>
               <div className="flex items-center">
                 <FiTarget className="mr-2" />
                 <span>Apply by {formatDate(internship.deadline)}</span>
               </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Job Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* About Internship */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <FiBriefcase className="mr-2 text-teal-600" /> About the internship
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-line">
                {internship.description || "No description provided."}
              </div>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <FiActivity className="mr-2 text-teal-600" /> Skills Required
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications */}
            {internship.qualifications && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                 <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <FiCheckCircle className="mr-2 text-teal-600" /> Who can apply
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-line">
                  {internship.qualifications}
                </div>
              </div>
            )}
            
            {/* Perks/Benefits */}
            {benefits.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                  <FiAward className="mr-2 text-teal-600" /> Perks
                </h2>
                <div className="flex flex-wrap gap-2">
                  {benefits.map((benefit, index) => (
                    <span key={index} className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-lg text-sm font-medium">
                      {benefit.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Employer Info & Contact */}
          <div className="space-y-6">
            
            {/* Employer Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">About {employer.company_name}</h3>
              
              {employer.organization_description && (
                <p className="text-slate-600 text-sm mb-6 line-clamp-4">
                  {employer.organization_description}
                </p>
              )}

              <div className="space-y-3">
                {employer.industry && (
                  <div className="flex items-center text-sm text-slate-600">
                    <FiBriefcase className="w-4 h-4 mr-3 text-slate-400" />
                    {employer.industry}
                  </div>
                )}
                {employer.employee_count && (
                  <div className="flex items-center text-sm text-slate-600">
                    <FiUsers className="w-4 h-4 mr-3 text-slate-400" />
                    {employer.employee_count} Employees
                  </div>
                )}
                {employer.city && (
                  <div className="flex items-center text-sm text-slate-600">
                    <FiMapPin className="w-4 h-4 mr-3 text-slate-400" />
                    {employer.city}
                  </div>
                )}
                {employer.website_url && (
                  <a 
                    href={employer.website_url.startsWith('http') ? employer.website_url : `https://${employer.website_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <FiGlobe className="w-4 h-4 mr-3" />
                    Website
                  </a>
                )}
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                {internship.contact_name && (
                   <div className="flex items-start">
                     <div className="mt-1 mr-3 text-slate-400"><FiUsers size={16} /></div>
                     <div>
                       <p className="text-sm font-medium text-slate-900">Contact Person</p>
                       <p className="text-sm text-slate-600">{internship.contact_name}</p>
                     </div>
                   </div>
                )}
                
                {(internship.contact_email || employer.contact_number) && (
                   <div className="pt-2 border-t border-slate-100 space-y-3">
                      {internship.contact_email && (
                        <div className="flex items-center text-sm text-slate-600">
                          <FiMail className="w-4 h-4 mr-3 text-slate-400" />
                          {internship.contact_email}
                        </div>
                      )}
                      {employer.contact_number && (
                        <div className="flex items-center text-sm text-slate-600">
                          <FiPhone className="w-4 h-4 mr-3 text-slate-400" />
                          {employer.contact_number}
                        </div>
                      )}
                   </div>
                )}
              </div>
            </div>
            
            {/* Internal Actions */}
             <div className="bg-teal-50 rounded-xl border border-teal-100 p-6">
              <h3 className="text-teal-900 font-semibold mb-2">Employer Actions</h3>
              <p className="text-teal-700 text-sm mb-4">
                This is how your internship looks to students. You can manage applications or edit details from your dashboard.
              </p>
              <button 
                onClick={() => navigate('/employer')}
                className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
              >
                Manage Internship
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
