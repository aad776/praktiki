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
  FiTarget,
  FiUser,
  FiFileText,
  FiX
} from "react-icons/fi";
import { ResumePreview } from "../components/ResumePreview";

interface StudentShort {
  id: number;
  first_name: string | null;
  last_name: string | null;
  university_name: string | null;
  skills: string | null;
  resume_file_path?: string | null;
  resume_filename?: string | null;
  resume_json?: string | null;
}

interface Application {
  id: number;
  internship_id: number;
  status: string;
  applied_at: string;
  student: StudentShort;
  resume_file_path?: string | null;
  resume_json?: string | null;
}

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !id) return;
      
      try {
        setLoading(true);
        const res = await api.get<PageData>(`/employers/internships/${id}`);
        setData(res);
        setError(null);
        
        // Fetch applications for this internship
        setAppsLoading(true);
        const apps = await api.get<Application[]>(`/employers/internships/${id}/applications`);
        setApplications(apps);
      } catch (err: any) {
        console.error("Error fetching internship details:", err);
        setError(err.message || "Failed to load internship details");
      } finally {
        setLoading(false);
        setAppsLoading(false);
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

            {/* Applications Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <FiUsers className="mr-2 text-teal-600" /> Received Applications
                </h2>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                  {applications.length} Total
                </span>
              </div>

              {appsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p>Loading applications...</p>
                </div>
              ) : applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <FiUser size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {app.student?.first_name} {app.student?.last_name}
                            </h4>
                            <p className="text-sm text-slate-500">{app.student?.university_name || 'University not specified'}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {app.student?.skills?.split(',').slice(0, 3).map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] rounded-md">
                                  {skill.trim()}
                                </span>
                              ))}
                              {(app.student?.skills?.split(',').length || 0) > 3 && (
                                <span className="text-[10px] text-slate-400 self-center">
                                  +{(app.student?.skills?.split(',').length || 0) - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {app.status}
                            </span>
                            
                            <div className="flex flex-col gap-1 mt-1">
                              {app.resume_file_path && (
                                <a 
                                  href={`${api.defaults.baseURL}/students/resume/download/${app.resume_file_path.split('/').pop()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-100"
                                >
                                  <FiLink className="mr-1" size={10} /> Uploaded Resume
                                </a>
                              )}
                              
                              {app.resume_json && (
                                <button 
                                  onClick={() => {
                                    try {
                                      const resumeData = JSON.parse(app.resume_json || '{}');
                                      setSelectedResume({
                                        objective: resumeData.career_objective || '',
                                        skills: typeof resumeData.skills_categorized === 'string' 
                                          ? JSON.parse(resumeData.skills_categorized).technical || []
                                          : (resumeData.skills_categorized?.technical || []),
                                        educations: typeof resumeData.education_entries === 'string' ? JSON.parse(resumeData.education_entries) : [],
                                        experiences: typeof resumeData.work_experience === 'string' ? JSON.parse(resumeData.work_experience) : [],
                                        projects: typeof resumeData.projects === 'string' ? JSON.parse(resumeData.projects) : [],
                                        certifications: typeof resumeData.certifications === 'string' ? JSON.parse(resumeData.certifications) : [],
                                        extraCurricular: typeof resumeData.extra_curricular === 'string' ? JSON.parse(resumeData.extra_curricular) : [],
                                      });
                                      setSelectedStudent(app.student);
                                    } catch (e) {
                                      console.error("Error parsing resume data", e);
                                      alert("Error loading resume details");
                                    }
                                  }}
                                  className="flex items-center text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100"
                                >
                                  <FiFileText className="mr-1" size={10} /> Generated Resume
                                </button>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-400 mt-1">
                              Applied on {new Date(app.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FiInfo size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No applications received yet</p>
                  <p className="text-sm text-slate-400">Applications will appear here once students start applying</p>
                </div>
              )}
            </div>

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

      {/* Resume Preview Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col relative">
            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                  <FiUser size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {selectedStudent?.first_name} {selectedStudent?.last_name}'s Resume
                  </h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">System Generated Profile</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <FiFileText size={14} /> Download PDF
                </button>
                <button 
                  onClick={() => {
                    setSelectedResume(null);
                    setSelectedStudent(null);
                  }} 
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-100/50">
               <div className="max-w-[210mm] mx-auto scale-[0.9] origin-top">
                  <ResumePreview 
                    data={{
                      full_name: `${selectedStudent?.first_name} ${selectedStudent?.last_name}`,
                      email: selectedStudent?.email || "N/A",
                      phone: selectedStudent?.phone || "N/A",
                      current_city: selectedStudent?.current_city || "N/A",
                      ...selectedResume
                    }}
                    scale={1}
                  />
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Print only style for resume in modal */}
      <div className="hidden print:block">
        {selectedResume && (
           <ResumePreview 
             isPrintMode={true}
             data={{
               full_name: `${selectedStudent?.first_name} ${selectedStudent?.last_name}`,
               email: selectedStudent?.email || "N/A",
               phone: selectedStudent?.phone || "N/A",
               current_city: selectedStudent?.current_city || "N/A",
               ...selectedResume
             }}
           />
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
