import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InternshipMegaMenu } from './InternshipMegaMenu';
import axios from 'axios';

interface Notification {
  id: number;
  message: string;
  created_at: string;
  is_read: number;
}

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  external?: boolean;
}

interface RoleConfig {
  color: string;
  icon: string;
  navItems: NavItem[];
}

const roleNavConfig: Record<string, RoleConfig> = {
  student: {
    color: 'brand',
    icon: '🎓',
    navItems: [
      { path: '/student', label: 'Dashboard', icon: 'home' },
      { path: '/student/applications', label: 'My Applications', icon: 'fileText' },
      { path: 'http://localhost:5174', label: 'ABC Status', icon: 'star', external: true },
      { path: '/student/setup', label: 'Profile', icon: 'user' },
    ],
  },
  employer: {
    color: 'purple',
    icon: '🏢',
    navItems: [
      { path: '/employer', label: 'Dashboard', icon: 'home' },
      { path: '/employer/status', label: 'Company Status', icon: 'building' },
      { path: '/employer/applications', label: 'Applications', icon: 'users' },
      { path: '/employer/managed-internships', label: 'Managed Internships', icon: 'briefcase' },
      { path: '/employer/setup', label: 'Profile', icon: 'user' },
    ],
  },
  institute: {
    color: 'orange',
    icon: '🏛️',
    navItems: [
      { path: '/institute', label: 'Dashboard', icon: 'home' },
      { path: '/institute/students', label: 'Students', icon: 'users' },
      { path: 'http://localhost:5174', label: 'ABC Status', icon: 'star', external: true },
    ],
  },
};

const icons: Record<string, JSX.Element> = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  fileText: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
};

export function Layout({ children }: LayoutProps) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('praktiki_token');
      const res = await axios.get('http://localhost:8000/notifications/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('praktiki_token');
      await axios.post('http://localhost:8000/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const config = role ? roleNavConfig[role] : null;
  const navItems = config?.navItems || [];
  const isActive = (path: string) => location.pathname === path;

  // Get auth token for SSO
  const getSSOUrl = (basePath: string) => {
    console.log('Generating SSO URL for:', basePath);
    if (!basePath.includes('localhost:5174') && !basePath.includes('127.0.0.1:5174')) {
      console.log('Not an ABC Portal URL, returning as is');
      return basePath;
    }
    
    const token = localStorage.getItem('praktiki_token');
    console.log('Praktiki token found:', !!token);
    
    if (!token) return basePath;
    
    try {
      const url = new URL(basePath);
      url.searchParams.set('sso_token', token);
      url.searchParams.set('sso_role', role || '');
      const finalUrl = url.toString();
      console.log('Generated SSO URL:', finalUrl);
      return finalUrl;
    } catch (e) {
      console.error('Error generating SSO URL:', e);
      return basePath;
    }
  };

  // Get user initials
  const getInitials = () => {
    const name = user?.full_name || user?.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Authenticated Navbar */}
      {isAuthenticated && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo and Nav Items */}
              <div className="flex items-center">
                <Link to={`/${role}`} className="flex items-center gap-2.5 group">
                  <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-900 text-lg hidden sm:block">Praktiki</span>
                </Link>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex items-center ml-8 gap-1">
                  {/* Internship Mega Menu for Students */}
                  {role === 'student' && <InternshipMegaMenu />}

                  {navItems.map(item => (
                    item.external ? (
                      <a
                        key={item.path}
                        href={getSSOUrl(item.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                          ${item.label === 'ABC Status' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                      >
                        {icons[item.icon]}
                        {item.label}
                        {item.label === 'ABC Status' && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                      </a>
                    ) : (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                          ${isActive(item.path)
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }
                        `}
                      >
                        {icons[item.icon]}
                        {item.label}
                      </Link>
                    )
                  ))}
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className={`relative p-2 rounded-xl transition-colors ${notifOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in-up">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                className={`p-4 transition-colors ${notif.is_read === 0 ? 'bg-brand-50/30' : 'hover:bg-slate-50'}`}
                              >
                                <p className={`text-sm ${notif.is_read === 0 ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                  {notif.message}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                            <p className="text-sm text-slate-500">No notifications yet</p>
                          </div>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                          <button className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                            View all activity
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                {role !== 'student' && role !== 'employer' && (
                  <button
                    onClick={handleLogout}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                )}

                {/* User Info */}
                <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.full_name || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize flex items-center justify-end gap-1">
                      <span>{config?.icon}</span>
                      {role}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                    <span className="text-white font-semibold text-sm">{getInitials()}</span>
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileNavOpen(!mobileNavOpen)}
                  className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileNavOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileNavOpen && (
            <div className="md:hidden border-t border-slate-100 bg-white animate-fade-in-down">
              {/* User Info Mobile */}
              <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                  <span className="text-white font-semibold">{getInitials()}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {user?.full_name || user?.email || 'User'}
                  </p>
                  <p className="text-sm text-slate-500 capitalize flex items-center gap-1">
                    <span>{config?.icon}</span>
                    {role}
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="px-2 py-3 space-y-1">
                {/* Mobile version of Internship Link for students */}
                {role === 'student' && (
                  <Link
                    to="/posted-internships"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Internships
                  </Link>
                )}

                {navItems.map(item => (
                  item.external ? (
                    <a
                      key={item.path}
                      href={getSSOUrl(item.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileNavOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors
                        ${item.label === 'ABC Status' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'text-slate-600 hover:bg-slate-50'}
                      `}
                    >
                      {icons[item.icon]}
                      <div className="flex items-center justify-between w-full">
                        {item.label}
                        {item.label === 'ABC Status' && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                      </div>
                    </a>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileNavOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors
                        ${isActive(item.path)
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-600 hover:bg-slate-50'
                        }
                      `}
                    >
                      {icons[item.icon]}
                      {item.label}
                    </Link>
                  )
                ))}

                {/* Mobile Logout (Hidden for students and employers) */}
                {role !== 'student' && role !== 'employer' && (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                )}
              </div>
            </div>
          )}
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
