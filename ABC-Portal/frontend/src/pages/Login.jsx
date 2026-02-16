import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('student');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Sending email as username to the login function which uses standard OAuth2 form
      const data = await login(email, password);
      // Redirect based on role
      switch(data.role) {
        case 'student': navigate('/student/dashboard'); break;
        case 'company': navigate('/company/dashboard'); break;
        case 'institute': navigate('/institute/dashboard'); break;
        case 'admin': navigate('/admin/dashboard'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-900">
        <img 
          src="https://images.unsplash.com/photo-1497294815431-9365093b7331?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
          alt="Modern office workspace with natural light" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white w-full">
          <h1 className="text-5xl font-bold mb-6 leading-tight">Welcome Back!</h1>
          <p className="text-xl max-w-md text-blue-100 leading-relaxed">
            Access your dashboard to manage internships, applications, and connect with top talent.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-24 bg-white">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
            <p className="text-gray-500">Please enter your details to continue</p>
          </div>

          {/* Role Selector */}
          <div className="flex justify-center mb-8 bg-gray-100 p-1.5 rounded-xl">
             {['student', 'company', 'institute', 'admin'].map((role) => (
               <button 
                 key={role}
                 type="button"
                 onClick={() => setActiveTab(role)}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                   activeTab === role 
                   ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                   : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                 }`}
               >
                 {role}
               </button>
             ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white outline-none" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <div className="flex items-center justify-end">
              <span className="text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer transition-colors">
                Forgot Password?
              </span>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.01]"
            >
              Sign In
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors inline-flex items-center">
                  Sign up now <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
