import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { ButtonSpinner } from '../components/LoadingSpinner';

type Role = 'student' | 'employer' | 'institute';

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

const roleConfig = {
  student: {
    icon: '🎓',
    label: 'Student',
    color: 'brand',
    bgClass: 'bg-brand-50 border-brand-200 text-brand-700',
    activeClass: 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/25',
  },
  employer: {
    icon: '🏢',
    label: 'Employer',
    color: 'purple',
    bgClass: 'bg-purple-50 border-purple-200 text-purple-700',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25',
  },
  institute: {
    icon: '🏛️',
    label: 'Institute',
    color: 'orange',
    bgClass: 'bg-orange-50 border-orange-200 text-orange-700',
    activeClass: 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/25',
  },
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apaarId, setApaarId] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role: currentRole } = useAuth();
  const toast = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && currentRole) {
      console.log('LoginPage: Already authenticated', { role: currentRole, locationState: location.state });
      
      let storedRedirect = sessionStorage.getItem('auth_redirect');
      console.log('LoginPage: storedRedirect from sessionStorage:', storedRedirect);
      
      const fromState = (location.state as any)?.from;
      let from = (typeof fromState === 'string' ? fromState : fromState?.pathname);
      console.log('LoginPage: from from location.state:', from);

      if (storedRedirect) {
        console.log('LoginPage: Prioritizing storedRedirect:', storedRedirect);
        from = storedRedirect;
        sessionStorage.removeItem('auth_redirect'); // Consume the redirect
      }

      const finalRedirect = from || `/${currentRole}`;
      console.log('LoginPage: Final redirect path:', finalRedirect);
      navigate(finalRedirect, { replace: true });
    }
  }, [isAuthenticated, currentRole, navigate, location]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    
    if (!password) {
      toast.error('Please enter your password.');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    const cleanApaar = apaarId.replace(/\D/g, '');
    if (role === 'student' && apaarId.trim()) {
      if (cleanApaar.length !== 12) {
        toast.error('APAAR ID must be exactly 12 digits.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        email: email.trim(),
        password,
      };

      if (role === 'student' && cleanApaar) {
        payload.apaar_id = cleanApaar;
      }

      const response = await api.post<LoginResponse>('/auth/login', payload);

      await login(response.access_token, response.role);
      
      toast.success('Welcome back! 🎉');
      
      // Navigation is handled by the useEffect hook which watches isAuthenticated
      
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">Praktiki</span>
          </div>

          {/* Main Content */}
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Your Gateway to
              <span className="block text-brand-200">Dream Internships</span>
            </h1>
            <p className="text-lg text-brand-100 leading-relaxed mb-8">
              Connect with top companies, get AI-powered recommendations, and kickstart your career journey.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-3xl font-bold">1200+</div>
                <div className="text-sm text-brand-200">Students Placed</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm text-brand-200">Companies</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-3xl font-bold">95%</div>
                <div className="text-sm text-brand-200">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=testimonial" 
                alt="User" 
                className="w-12 h-12 rounded-full bg-white/20"
              />
              <div>
                <p className="text-brand-100 italic mb-2">
                  "Praktiki helped me land my dream internship at Google within 2 weeks. The AI matching is incredibly accurate!"
                </p>
                <p className="font-semibold">Priya Sharma</p>
                <p className="text-sm text-brand-200">IIT Delhi, CS '25</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Praktiki</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Sign in to continue your journey</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(roleConfig) as Role[]).map((r) => {
                  const config = roleConfig[r];
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                        ${isActive ? config.activeClass : 'border-slate-200 hover:border-slate-300 bg-white'}
                      `}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-700'}`}>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-12"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
                <Link to="/auth/forgot-password" title="Coming soon" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* APAAR ID (Student Only) - Optional */}
            {role === 'student' && (
              <div className="input-group animate-slide-down">
                <label htmlFor="apaarId" className="label">
                  APAAR ID <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <input
                    id="apaarId"
                    type="text"
                    value={apaarId}
                    onChange={(e) => setApaarId(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="12-digit APAAR ID"
                    className="input pl-12"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Provide your 12-digit APAAR ID to sync your academic credits.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5"
            >
              {loading ? (
                <>
                  <ButtonSpinner />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50 text-slate-500">or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toast.info('Google login coming soon!')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toast.info('LinkedIn login coming soon!')}
              >
                <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>
            </div>

            {/* Signup Link */}
            <p className="text-center text-slate-600 mt-8">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                state={{ from: (location.state as any)?.from }}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
