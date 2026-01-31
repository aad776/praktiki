import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { config } from '../config';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get navigation items based on role
  const getNavItems = () => {
    if (role === 'student') {
      return [
        { path: '/student', label: 'Dashboard' },
        { path: '/student/setup', label: 'Profile' },
      ];
    }
    if (role === 'employer') {
      return [
        { path: '/employer', label: 'Dashboard' },
      ];
    }
    if (role === 'institute') {
      return [
        { path: '/institute', label: 'Dashboard' },
      ];
    }
    return [];
  };

  const navItems = getNavItems();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      {isAuthenticated && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo and Nav Items */}
              <div className="flex items-center">
                <Link to={`/${role}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <span className="font-bold text-slate-900 text-lg hidden sm:block">
                    {config.app.name}
                  </span>
                </Link>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center ml-8 space-x-1">
                  {navItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive(item.path)
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-4">
                {/* User Info */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.full_name || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-600 font-medium">
                      {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-slate-100">
            <div className="px-4 py-2 flex space-x-2 overflow-x-auto">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${isActive(item.path)
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={isAuthenticated ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
