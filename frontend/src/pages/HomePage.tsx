import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { PublicNavbar } from "../components/PublicNavbar";

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      navigate(`/${role}`);
    }
  }, [isAuthenticated, role, isLoading, navigate]);

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
              
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
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
                  onClick={() => navigate("/browse-internships")}
                  className="btn-secondary px-8 py-3.5"
                >
                  Browse Jobs
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
                <Link to="/login?role=student" className="block w-full py-2.5 text-center rounded-lg border border-blue-600 text-blue-600 font-medium hover:bg-blue-50 transition-colors">
                    Login as Student
                </Link>
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