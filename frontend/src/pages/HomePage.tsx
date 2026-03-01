import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { PublicNavbar } from "../components/PublicNavbar";
import api from "../services/api";
import { InternshipCard } from "../components/InternshipCard";

interface Internship {
  id: number;
  employer_id: number;
  title: string;
  description?: string;
  location: string;
  mode: string;
  duration_weeks: number;
  deadline?: string;
  skills?: string;
  stipend_amount?: number;
  created_at?: string;
  company_name?: string;
  logo_url?: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();
  const [latestInternships, setLatestInternships] = useState<Internship[]>([]);
  const [loadingInternships, setLoadingInternships] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      navigate(`/${role}`);
    }
  }, [isAuthenticated, role, isLoading, navigate]);

  useEffect(() => {
    const fetchLatestInternships = async () => {
      try {
        setLoadingInternships(true);
        // Fetch latest 10 internships
        const res = await api.get<Internship[]>("/students/internships?limit=10");
        setLatestInternships(res);
      } catch (err) {
        console.error("Failed to fetch latest internships", err);
      } finally {
        setLoadingInternships(false);
      }
    };

    fetchLatestInternships();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    // Scroll functionality disabled for continuous marquee
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="max-w-2xl animate-fadeIn">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6 border border-brand-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                Now Live for 2025 Internships
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                Find Your Dream <br />
                <span className="gradient-text">Internship Today</span>
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                The unified platform connecting ambitious students with top companies and verified by leading colleges. 
                Streamline your hiring journey with AI-powered matching.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <button 
                  onClick={() => navigate("/signup")}
                  className="btn-primary px-8 py-3.5"
                >
                  Get Started
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button 
                  onClick={() => navigate("/posted-internships")}
                  className="btn-secondary px-8 py-3.5"
                >
                  Browse Jobs
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <button 
                  onClick={() => {
            sessionStorage.setItem('auth_redirect', '/resume-maker');
            navigate("/login");
          }}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-50 text-brand-700 font-bold rounded-xl border border-brand-100 hover:bg-brand-100 transition-all group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                  Build Free AI Resume
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden`}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <p className="font-bold text-slate-900">Join 1,200+ students</p>
                  <p className="text-slate-500">already hired via Praktiki</p>
                </div>
              </div>
            </div>

            {/* Right Content - 3D Illustration Placeholder */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-3xl -z-10 transform rotate-3 scale-95 opacity-50"></div>
               <div className="w-full h-full bg-slate-100 rounded-2xl shadow-2xl overflow-hidden relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                    alt="Students collaboration" 
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-8">
                     <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-white w-full">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-sm font-medium text-blue-300">Success Story</span>
                           <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-500/30">Hired</span>
                        </div>
                        <p className="font-medium">"I found my dream internship at TechCorp within 3 days!"</p>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="w-6 h-6 rounded-full bg-white/20"></div>
                            <span className="text-sm text-slate-300">Rahul Kumar, IIT Delhi</span>
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Floating Elements */}
               <div className="absolute -top-6 -right-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      </div>
                      <div>
                          <p className="text-xs text-slate-500">Verification Status</p>
                          <p className="font-bold text-slate-800">APAAR Verified</p>
                      </div>
                  </div>
               </div>

               <div className="absolute -bottom-10 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce" style={{ animationDuration: '4s' }}>
                  <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      </div>
                      <div>
                          <p className="text-xs text-slate-500">New Jobs</p>
                          <p className="font-bold text-slate-800">50+ Added Today</p>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Opportunities Section */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-100 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  Fresh Opportunities
               </div>
               <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Latest Internships</h2>
               <p className="text-slate-600 text-lg leading-relaxed">Handpicked opportunities from top companies, updated daily to help you find the right match.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/posted-internships")}
                className="group flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition-all whitespace-nowrap"
              >
                View All
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </div>

          <div className="relative group/marquee">
            <div 
              ref={scrollRef}
              className="flex gap-8 overflow-x-hidden pb-12 pause-marquee"
            >
              {loadingInternships ? (
                <div className="flex gap-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-none w-[350px] sm:w-[400px] bg-white rounded-3xl p-8 h-[320px] border border-slate-100 animate-pulse flex flex-col gap-6 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="w-2/3 h-8 bg-slate-100 rounded-lg"></div>
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
                        <div className="w-full h-4 bg-slate-100 rounded"></div>
                      </div>
                      <div className="mt-auto flex gap-3">
                        <div className="w-24 h-10 bg-slate-100 rounded-full"></div>
                        <div className="w-24 h-10 bg-slate-100 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : latestInternships.length > 0 ? (
                <div className="animate-marquee flex gap-8">
                  {/* Original Items */}
                  {latestInternships.map((internship) => (
                    <div 
                      key={internship.id} 
                      className="flex-none w-[350px] sm:w-[400px] group/card transition-all duration-500"
                    >
                      <div className="relative p-[1px] rounded-3xl bg-transparent group-hover/card:bg-gradient-to-r group-hover/card:from-blue-400 group-hover/card:to-indigo-500 transition-all duration-500 shadow-sm group-hover/card:shadow-xl group-hover/card:-translate-y-2">
                        <div className="bg-white/95 backdrop-blur-sm rounded-[23px] overflow-hidden">
                          <InternshipCard internship={internship} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Duplicated Items for Seamless Loop */}
                  {latestInternships.map((internship) => (
                    <div 
                      key={`${internship.id}-dup`} 
                      className="flex-none w-[350px] sm:w-[400px] group/card transition-all duration-500"
                    >
                      <div className="relative p-[1px] rounded-3xl bg-transparent group-hover/card:bg-gradient-to-r group-hover/card:from-blue-400 group-hover/card:to-indigo-500 transition-all duration-500 shadow-sm group-hover/card:shadow-xl group-hover/card:-translate-y-2">
                        <div className="bg-white/95 backdrop-blur-sm rounded-[23px] overflow-hidden">
                          <InternshipCard internship={internship} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full text-center py-24 bg-white rounded-3xl border-2 border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">No internships found</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto">Be the first to see new opportunities as they arrive. Check back soon!</p>
                  <button 
                    onClick={() => navigate("/login?role=employer")}
                    className="btn-primary px-8 py-3"
                  >
                    Post an Internship
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
             <h2 className="text-3xl font-bold text-slate-900 mb-4">One Platform, Three Roles</h2>
             <p className="text-slate-600">Designed to streamline the entire hiring ecosystem, connecting every stakeholder seamlessly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Student Card */}
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">For Students</h3>
                <p className="text-slate-600 mb-6">Create a verified profile, get AI-matched internships, and launch your career.</p>
                <ul className="space-y-3 mb-8">
                    {['APAAR ID Verification', 'AI Resume Builder', 'Direct Applications'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                            <svg className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {item}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col gap-3">
                    <Link to="/login?role=student" className="block w-full py-2.5 text-center rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                        Login as Student
                    </Link>
                    <Link to="/resume-maker" className="block w-full py-2.5 text-center rounded-lg bg-brand-50 text-brand-700 font-bold hover:bg-brand-100 transition-colors">
                        Try Resume Maker
                    </Link>
                </div>
             </div>

             {/* Employer Card */}
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Hiring</div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">For Employers</h3>
                <p className="text-slate-600 mb-6">Post internships, manage applications, and find top talent efficiently.</p>
                <ul className="space-y-3 mb-8">
                    {['Post Free Internships', 'Applicant Tracking System', 'Verified Candidates'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                            <svg className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {item}
                        </li>
                    ))}
                </ul>
                <Link to="/login?role=employer" className="block w-full py-2.5 text-center rounded-lg border border-purple-600 text-purple-600 font-medium hover:bg-purple-50 transition-colors">
                    Login as Employer
                </Link>
             </div>

             {/* Institute Card */}
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4h8v4"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">For Institutes</h3>
                <p className="text-slate-600 mb-6">Track student progress, verify profiles, and manage placement records.</p>
                <ul className="space-y-3 mb-8">
                    {['Student Verification', 'Placement Analytics', 'Digital Records'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                            <svg className="text-green-500 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {item}
                        </li>
                    ))}
                </ul>
                <Link to="/login?role=institute" className="block w-full py-2.5 text-center rounded-lg border border-orange-600 text-orange-600 font-medium hover:bg-orange-50 transition-colors">
                    Login as Institute
                </Link>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="col-span-1 md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="bg-brand-600 text-white p-1.5 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        </div>
                        <span className="text-xl font-bold text-white">Praktiki</span>
                    </div>
                    <p className="text-sm">Empowering the next generation of professionals.</p>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Platform</h4>
                    <ul className="space-y-2 text-sm">
                        <li>Browse Internships</li>
                        <li>Student Portal</li>
                        <li>Employer Dashboard</li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm">
                        <li>Blog</li>
                        <li>Success Stories</li>
                        <li>Help Center</li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-bold mb-4">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li>Privacy Policy</li>
                        <li>Terms of Service</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-sm text-center">
                © 2025 Praktiki. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}