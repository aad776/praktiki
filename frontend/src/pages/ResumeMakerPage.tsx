import { PublicNavbar } from "../components/PublicNavbar";
import { ResumeBuilder } from "../components/ResumeBuilder";
import { useAuth } from "../context/AuthContext";
import { 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  Upload, 
  MousePointer2, 
  Zap, 
  CheckCircle2,
  FileSearch,
  Layout,
  Star
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { parseResume } from "../services/students";
import { useToast } from "../context/ToastContext";

export function ResumeMakerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: showError, success } = useToast();
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      showError("Please login to access Resume Builder");
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const handleUploadClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('auth_redirect', '/resume-maker');
      navigate('/login', { state: { from: { pathname: '/resume-maker' } } });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError("File size should be less than 5MB");
      return;
    }

    try {
      setIsParsing(true);
      const parsedData = await parseResume(file);
      
      if (isAuthenticated) {
        navigate('/resume-maker', { state: { parsedData } });
      } else {
        // Save data and redirect to login
        sessionStorage.setItem('pending_resume_data', JSON.stringify(parsedData));
        sessionStorage.setItem('auth_redirect', '/resume-maker');
        success("Resume parsed! Please login to save and edit.");
        navigate('/login');
      }
      
    } catch (error) {
      console.error(error);
      showError("Failed to parse resume. Please try again.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicNavbar />
        <ResumeBuilder />
        {/* Hidden file input for authenticated users to also upload if needed from within builder, 
            but usually builder has its own controls. 
            However, the requirement says "Upload resume" button on landing page should work.
            If authenticated, we show ResumeBuilder. 
            If the user wants to upload a NEW resume to replace current one, they might need a button inside ResumeBuilder.
            Or if they are redirected here with parsedData, ResumeBuilder handles it.
        */}
      </div>
    );
  }

  const steps = [
    { title: "Upload or Start Fresh", description: "Upload your existing resume or build one from scratch using our simple template." },
    { title: "Get Actionable Suggestions", description: "AI analyzes your content and provides real-time improvements." },
    { title: "Optimize for ATS scanning", description: "Ensure your resume passes through Applicant Tracking Systems easily." },
    { title: "Download your resume", description: "Export your professional resume in PDF format, ready to apply." },
    { title: "Find your dream role", description: "Use your new resume to apply for verified internships on Praktiki." }
  ];

  const features = [
    {
      icon: <FileSearch className="text-blue-500" size={32} />,
      title: "Smart Resume Parsing",
      description: "Extracts key sections from PDF and Docx resumes following general resume standards."
    },
    {
      icon: <ShieldCheck className="text-green-500" size={32} />,
      title: "ATS-Optimized Resumes",
      description: "Tailors your resume with relevant keywords for a better job match."
    },
    {
      icon: <Sparkles className="text-purple-500" size={32} />,
      title: "Detailed Actionable Feedback",
      description: "Offers comprehensive and action-specific feedback to improve your resume."
    }
  ];

  const testimonials = [
    {
      name: "Riya Raj",
      text: "I was struggling to update my resume until I found this tool. The AI suggestions were spot-on, and I had a polished resume ready to go in no time!",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riya"
    },
    {
      name: "Rohan Vyas",
      text: "Perfect For Career Changers! Switching industries felt daunting, but the resume builder tailored my resume perfectly. I landed interviews faster than I expected.",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-[#F8FBFF] overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-bold mb-6">
                <Sparkles size={16} />
                AI Powered Resume Builder
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 mb-8 leading-tight">
                Free Online <br />
                <span className="text-brand-600">Resume Maker</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
                AI-powered personalized resume builder and analyzer. Create a professional, ATS-friendly resume in minutes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-slate-900 mb-2">Create your resume</h3>
                  <p className="text-sm text-slate-500 mb-4">Create a beautiful resume quickly with the help of AI.</p>
                  <button onClick={() => {
                    sessionStorage.setItem('auth_redirect', '/resume-maker');
                    navigate('/login', { state: { from: { pathname: '/resume-maker' } } });
                  }} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 transition-colors">
                    Login to Create Resume
                  </button>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-slate-900 mb-2">Or, already have a resume?</h3>
                  <p className="text-sm text-slate-500 mb-4">Upload your resume for an instant score & feedback.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={handleUploadClick}
                    disabled={isParsing}
                    className="w-full border-2 border-brand-200 text-brand-600 font-bold py-3 rounded-xl hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 border-dashed disabled:opacity-50"
                  >
                    {isParsing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Upload resume
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Accepts PDF, DOCX (Max 5MB).</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Resume template" 
                  className="rounded-xl w-full"
                />
                <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  ATS FRIENDLY
                </div>
                <div className="absolute top-1/2 -left-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">AI SCORE: 92/100</p>
                    <p className="text-[10px] text-slate-500">Optimized for Tech roles</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-brand-200 rounded-full blur-[120px] opacity-20 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex items-center gap-8">
              <div className="text-5xl font-extrabold text-brand-600">90%</div>
              <p className="text-lg text-slate-600 font-medium">of tailored resumes get shortlisted faster</p>
            </div>
            <div className="flex items-center gap-8 border-l border-slate-100 pl-12">
              <div className="text-5xl font-extrabold text-red-500">61%</div>
              <p className="text-lg text-slate-600 font-medium">of resumes are rejected due to poor formatting</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-16">How it works</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div 
                  key={i} 
                  onMouseEnter={() => setActiveStep(i)}
                  className={`p-6 rounded-2xl border transition-all cursor-pointer ${activeStep === i ? 'bg-brand-600 border-brand-600 shadow-lg translate-x-2' : 'bg-white border-slate-100 hover:border-brand-200'}`}
                >
                  <h3 className={`font-bold mb-2 ${activeStep === i ? 'text-white' : 'text-slate-900'}`}>
                    Step {i + 1}: {step.title}
                  </h3>
                  {activeStep === i && (
                    <p className="text-brand-50 text-sm leading-relaxed">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="sticky top-32">
              <div className="bg-brand-50 rounded-3xl p-12 aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="bg-white p-6 rounded-xl shadow-xl border border-brand-100 w-64 relative z-10">
                  <div className="w-full h-4 bg-slate-100 rounded mb-4"></div>
                  <div className="w-3/4 h-3 bg-slate-50 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-slate-50 rounded mb-6"></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-2 bg-brand-100 rounded"></div>
                    <div className="h-2 bg-brand-100 rounded"></div>
                    <div className="h-2 bg-brand-100 rounded"></div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10">
                  <Layout className="w-full h-full text-brand-600" />
                </div>
                <p className="absolute bottom-8 text-sm font-medium text-brand-600">
                  {steps[activeStep].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-16">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="mb-6">{f.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Used by <span className="text-brand-600">1 lakh+ students</span> and job seekers
            </h2>
            <p className="text-xl text-slate-500 mb-16">Get hired faster with your best resume yet.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm relative group">
                <div className="absolute top-10 right-10 text-brand-100 group-hover:text-brand-200 transition-colors">
                  <FileText size={80} />
                </div>
                <div className="relative z-10">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className="fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-xl font-medium text-slate-800 mb-8 italic">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full border-2 border-brand-50" />
                    <span className="font-bold text-slate-900">{t.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Informational Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">What is Praktiki Resume Maker?</h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Praktiki Resume Maker is an intelligent, AI-driven platform specifically designed for students and freshers. It helps you convert your academic achievements, projects, and skills into a professional format that recruiters love. Unlike generic builders, it is fine-tuned with data from thousands of successful internship applications.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">Why should we use it?</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "Built for freshers & interns",
                  "Verified by real recruiters",
                  "Real-time AI suggestions",
                  "100% Free forever",
                  "ATS-friendly templates",
                  "Seamless portal integration"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                      <CheckCircle2 size={16} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">Key Features of Praktiki Resume Maker</h2>
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h4 className="font-bold mb-2">AI-Powered Optimization</h4>
                  <p className="text-slate-400">Our AI doesn't just check spelling; it analyzes the impact of your sentences and suggests stronger action verbs and metrics.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <h4 className="font-bold mb-2">Direct Portal Application</h4>
                  <p className="text-slate-400">Once your resume is ready, you can directly use it to apply for internships on Praktiki with a single click.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">How to Create a Resume for Free with Praktiki?</h2>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="text-4xl font-extrabold text-brand-500 mb-4">01</div>
                  <p className="font-bold mb-2">Sign Up</p>
                  <p className="text-slate-400 text-sm">Create your free student account on Praktiki.</p>
                </div>
                <div className="flex-1">
                  <div className="text-4xl font-extrabold text-brand-500 mb-4">02</div>
                  <p className="font-bold mb-2">Input Details</p>
                  <p className="text-slate-400 text-sm">Add your education, skills, and projects.</p>
                </div>
                <div className="flex-1">
                  <div className="text-4xl font-extrabold text-brand-500 mb-4">03</div>
                  <p className="font-bold mb-2">Review & Download</p>
                  <p className="text-slate-400 text-sm">Get AI feedback, polish, and export as PDF.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 text-center border-t border-slate-100">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Ready to build your professional future?</h2>
        <button 
          onClick={() => {
            sessionStorage.setItem('auth_redirect', '/resume-maker');
            navigate('/signup', { state: { from: { pathname: '/resume-maker' } } });
          }} 
          className="btn-primary px-12 py-4 text-lg"
        >
          Start Building Now
        </button>
      </section>
    </div>
  );
}
