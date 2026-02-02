import { Link } from 'react-router-dom';

export function PublicNavbar() {
  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-teal-600 text-white p-1.5 rounded-lg">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Praktiki</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/browse-internships" 
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Browse Jobs
            </Link>
            <Link 
              to="/about" 
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900 transition-colors"
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default PublicNavbar;
