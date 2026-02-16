import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import StudentDashboard from '../components/StudentDashboard';
import CompanyDashboard from '../components/CompanyDashboard';
import InstituteDashboard from '../components/InstituteDashboard';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  const renderDashboard = () => {
    switch(user?.role) {
      case 'student': return <StudentDashboard />;
      case 'company': return <CompanyDashboard />;
      case 'institute': return <InstituteDashboard />;
      case 'admin': return <div className="text-center p-10">Admin Dashboard Coming Soon</div>;
      default: return <div className="text-center p-10">Unknown Role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">ABC Credits Portal</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-gray-600">Welcome, {user?.username} ({user?.role})</span>
              <button 
                onClick={logout}
                className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderDashboard()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
