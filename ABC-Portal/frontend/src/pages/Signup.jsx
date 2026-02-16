import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { Lock, User, Mail, Briefcase, GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';

const INSTITUTES = [
  "Delhi University", "Aligarh Muslim University", "Allahabad University", "IIT Delhi", "IIT Roorkee",
  "UPES", "Graphic Era University", "Jawaharlal Nehru University", "Banaras Hindu University", "Jamia Millia Islamia",
  "IIT Bombay", "IIT Madras", "IIT Kanpur", "IIT Kharagpur", "IIT Guwahati",
  "NIT Trichy", "NIT Warangal", "NIT Surathkal", "BITS Pilani", "VIT Vellore",
  "Manipal Academy of Higher Education", "Amity University", "SRM University", "Thapar Institute", "Anna University",
  "Jadavpur University", "University of Hyderabad", "Calcutta University", "Mumbai University", "Pune University",
  "Panjab University", "Osmania University", "Guru Gobind Singh Indraprastha University", "DTU", "NSUT",
  "IIIT Hyderabad", "IIIT Delhi", "IIIT Bangalore", "Symbiosis International", "Christ University",
  "LPU", "Chandigarh University", "Sharda University", "Galgotias University", "Bennett University",
  "Shiv Nadar University", "Ashoka University", "O.P. Jindal Global University", "Lovely Professional University", "Graphic Era Hill University",
  "Other"
];

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'student',
    password: '',
    confirmPassword: '',
    institute_name: ''
  });
  const [error, setError] = useState('');
  const [showOtherInstitute, setShowOtherInstitute] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'institute_name') {
        setShowOtherInstitute(e.target.value === 'Other');
        if (e.target.value === 'Other') {
            setFormData(prev => ({ ...prev, institute_name: '' }));
        }
    }
  };

  const handleInstituteChange = (e) => {
      const val = e.target.value;
      if (val === 'Other') {
          setShowOtherInstitute(true);
          setFormData(prev => ({ ...prev, institute_name: '' }));
      } else {
          setShowOtherInstitute(false);
          setFormData(prev => ({ ...prev, institute_name: val }));
      }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await authService.register(
        formData.username,
        formData.email,
        formData.role,
        formData.password,
        formData.institute_name
      );
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-900">
        <img 
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
          alt="University library with students studying" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white w-full">
          <h1 className="text-5xl font-bold mb-6 leading-tight">Join Our Community</h1>
          <p className="text-xl max-w-md text-blue-100 leading-relaxed">
            Start your journey with us. Connect with opportunities, learn from the best, and build your future.
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-12 bg-white overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500">Get started with your free account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Username */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                  type="text" 
                  name="username"
                  placeholder="Username" 
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                  type="email" 
                  name="email"
                  placeholder="Email Address" 
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Role */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <select 
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none appearance-none" 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="student">Student</option>
                  <option value="company">Company</option>
                  <option value="institute">Institute</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {/* Institute Selection (Only for Student) */}
              {formData.role === 'student' && (
                <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <GraduationCap className="h-5 w-5 text-gray-400" />
                      </div>
                      <select 
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none appearance-none" 
                        onChange={handleInstituteChange}
                        defaultValue=""
                      >
                        <option value="" disabled>Select Institute</option>
                        {INSTITUTES.map((inst) => (
                            <option key={inst} value={inst}>{inst}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                    
                    {showOtherInstitute && (
                        <div className="relative animate-fadeIn">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <GraduationCap className="h-5 w-5 text-gray-400" />
                          </div>
                          <input 
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                            type="text" 
                            name="institute_name"
                            placeholder="Enter Institute Name" 
                            value={formData.institute_name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                    )}
                </div>
              )}

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  placeholder="Password" 
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 transition-colors bg-gray-50 focus:bg-white outline-none ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 ml-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.01]"
            >
              Create Account
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors inline-flex items-center">
                  Sign in here <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
