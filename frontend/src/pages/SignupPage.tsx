import { FormEvent, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { ButtonSpinner } from '../components/LoadingSpinner';

type Role = 'student' | 'employer' | 'institute';

const roleConfig = {
  student: {
    icon: '🎓',
    label: 'Student',
    description: 'Find internships & build your career',
    color: 'brand',
    activeClass: 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/25',
  },
  employer: {
    icon: '🏢',
    label: 'Employer',
    description: 'Post jobs & find top talent',
    color: 'purple',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25',
  },
  institute: {
    icon: '🏛️',
    label: 'Institute',
    description: 'Manage placements & track students',
    color: 'orange',
    activeClass: 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/25',
  },
};

export function SignupPage() {
  const [role, setRole] = useState<Role>('student');
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // We'll treat "step 1" as initial role selection view, and "step 2" as the form filling view
  // But since we want a "big form", we'll just use isRoleSelected to toggle layout
  
  // Common fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Employer specific
  const [companyName, setCompanyName] = useState('');
  const [companyContact, setCompanyContact] = useState('');

  // Institute specific
  const [instituteName, setInstituteName] = useState('');
  const [aisheCode, setAisheCode] = useState('');
  const [instituteContact, setInstituteContact] = useState('');

  // Student specific
  const [apaarId, setApaarId] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const validateForm = (): boolean => {
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return false;
    }
    if (!fullName.trim()) {
      toast.error('Please enter your full name.');
      return false;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return false;
    }

    // Student validation
    if (role === 'student') {
      const cleanApaar = apaarId.trim().replace(/\D/g, '');
      
      // APAAR ID is now mandatory
      if (!apaarId.trim()) {
          toast.error('APAAR ID is mandatory for students.');
          return false;
      }
      if (cleanApaar.length !== 12) {
          toast.error('APAAR ID must be exactly 12 digits.');
          return false;
      }
    }

    if (role === 'employer') {
      if (!companyName.trim()) {
        toast.error('Please enter your company name.');
        return false;
      }
      if (!companyContact.trim() || companyContact.length !== 10) {
        toast.error('Please enter a valid 10-digit contact number.');
        return false;
      }
    }

    if (role === 'institute') {
      if (!instituteName.trim()) {
        toast.error('Please enter your institute name.');
        return false;
      }
      if (!aisheCode.trim()) {
        toast.error('Please enter your AISHE code.');
        return false;
      }
      if (!instituteContact.trim() || instituteContact.length !== 10) {
        toast.error('Please enter a valid 10-digit contact number.');
        return false;
      }
    }

    return true;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      let endpoint = '/auth/signup';
      let payload: Record<string, string> = {
        email: email.trim(),
        full_name: fullName.trim(),
        password,
      };

      if (role === 'student') {
        endpoint = '/auth/signup';
        payload.role = 'student';
        const cleanApaar = apaarId.trim().replace(/\D/g, '');
        payload.apaar_id = cleanApaar;
      } else if (role === 'employer') {
        endpoint = '/auth/signup/employer';
        payload.company_name = companyName.trim();
        payload.contact_number = companyContact.trim();
      } else if (role === 'institute') {
        endpoint = '/auth/signup/institute';
        payload.institute_name = instituteName.trim();
        payload.aishe_code = aisheCode.trim();
        payload.contact_number = instituteContact.trim();
      }

      await api.post(endpoint, payload);

      toast.success('Account created! 🎉 Please login to continue.');
      navigate('/login', { state: { from: (location.state as any)?.from } });

    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-slate-50">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 min-w-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold">Praktiki</span>
          </Link>

          {/* Main Content */}
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Start Your Career
              <span className="block text-brand-400">Journey Today</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              Join thousands of students and companies already using Praktiki to connect and grow.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: '🎯', text: 'AI-powered internship matching' },
                { icon: '✅', text: 'Verified company profiles' },
                { icon: '📊', text: 'Track your applications' },
                { icon: '🏆', text: 'Earn ABC credits for your work' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white/5 backdrop-blur rounded-xl p-4">
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-slate-200">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <img
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700"
                />
              ))}
            </div>
            <div className="text-sm">
              <p className="font-semibold text-white">Trusted by 10,000+ users</p>
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-slate-400 ml-1">4.9/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className={`w-full animate-fade-in ${isRoleSelected ? 'max-w-2xl' : 'max-w-md'}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Praktiki</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {isRoleSelected ? 'Complete your profile' : 'Create your account'}
            </h2>
            <p className="text-slate-500">
              {isRoleSelected ? 'Enter your details below' : 'Choose your role to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection - Compact if selected, Large if not */}
            {!isRoleSelected ? (
              <div className="space-y-3">
                {(Object.keys(roleConfig) as Role[]).map((r) => {
                  const config = roleConfig[r];
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setIsRoleSelected(true);
                      }}
                      className={`
                        w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                        ${isActive ? config.activeClass : 'border-slate-200 hover:border-slate-300 bg-white'}
                      `}
                    >
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <span className={`block font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {config.label}
                        </span>
                        <span className={`text-sm ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                          {config.description}
                        </span>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${isActive ? 'border-white bg-white' : 'border-slate-300'}`}>
                        {isActive && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center gap-4 mb-8">
                {(Object.keys(roleConfig) as Role[]).map((r) => {
                  const config = roleConfig[r];
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium
                        ${isActive 
                          ? 'bg-brand-50 border-brand-200 text-brand-700 ring-2 ring-brand-500 ring-offset-2' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                      `}
                    >
                      <span>{config.icon}</span>
                      {config.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Form Fields - Only show if role is selected */}
            {isRoleSelected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 animate-fade-in">
                {/* Full Name */}
                <div className="input-group">
                  <label htmlFor="fullName" className="label">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="input pl-12"
                      required
                    />
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
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Must be at least 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div className="input-group">
                  <label htmlFor="confirmPassword" className="label">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    required
                  />
                </div>

                {/* Student Specific Fields - APAAR ID (Mandatory) */}
                {role === 'student' && (
                  <div className="input-group md:col-span-2">
                    <label htmlFor="apaarId" className="label">
                      APAAR ID <span className="text-red-500">*</span>
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
                        placeholder="123456789012"
                        className="input pl-12"
                        maxLength={12}
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      12-digit APAAR ID is required for syncing your academic credits.
                      <a href="https://apaar.education.gov.in" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline ml-1">
                        Get your APAAR ID
                      </a>
                    </p>
                  </div>
                )}

                {/* Employer Specific Fields */}
                {role === 'employer' && (
                  <>
                    <div className="input-group">
                      <label htmlFor="companyName" className="label">Company Name</label>
                      <input
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Inc."
                        className="input"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="companyContact" className="label">Contact Number</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 border border-r-0 border-slate-200 rounded-l-xl bg-slate-50 text-slate-500 text-sm font-medium">
                          +91
                        </span>
                        <input
                          id="companyContact"
                          type="tel"
                          value={companyContact}
                          onChange={(e) => setCompanyContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="input rounded-l-none"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Institute Specific Fields */}
                {role === 'institute' && (
                  <>
                    <div className="input-group">
                      <label htmlFor="instituteName" className="label">Institute Name</label>
                      <input
                        id="instituteName"
                        type="text"
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        placeholder="ABC University"
                        className="input"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor="aisheCode" className="label">AISHE Code</label>
                      <input
                        id="aisheCode"
                        type="text"
                        value={aisheCode}
                        onChange={(e) => setAisheCode(e.target.value.toUpperCase())}
                        placeholder="C-12345"
                        className="input"
                        required
                      />
                    </div>
                    <div className="input-group md:col-span-2">
                      <label htmlFor="instituteContact" className="label">Contact Number</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 border border-r-0 border-slate-200 rounded-l-xl bg-slate-50 text-slate-500 text-sm font-medium">
                          +91
                        </span>
                        <input
                          id="instituteContact"
                          type="tel"
                          value={instituteContact}
                          onChange={(e) => setInstituteContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="input rounded-l-none"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Terms - Full Width */}
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500 text-center">
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
                  </p>
                </div>

                {/* Submit Button - Full Width */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3.5"
                  >
                    {loading ? (
                      <>
                        <ButtonSpinner />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create account
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Login Link */}
            <p className="text-center text-slate-600 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SignupPage;
