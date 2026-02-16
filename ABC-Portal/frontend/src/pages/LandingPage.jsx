import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Building } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const LandingPage = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(`/${user.role}/dashboard`);
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">ABC Credits</h1>
          </div>
          <div>
            <Link 
              to="/login" 
              className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-grow">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-100 z-0"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Simplify Internship Credits</span>
              <span className="block text-blue-600">For Everyone</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A unified portal for Students, Companies, and Institutes to manage, track, and approve internship credits under UGC and AICTE policies.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started <ArrowRight className="ml-2" size={20} />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature Section */}
          <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">For Students</h3>
              <p className="text-gray-500">Track your internship progress, view earned credits, and manage applications in one place.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4">
                <Building size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">For Companies</h3>
              <p className="text-gray-500">Post internships, manage applicants, and submit completion reports seamlessly.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">For Institutes</h3>
              <p className="text-gray-500">Validate credits, generate reports, and ensure compliance with UGC/AICTE norms.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>© 2024 ABC Credits Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
