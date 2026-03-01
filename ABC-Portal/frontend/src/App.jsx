import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OTPVerify from './pages/OTPVerify';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import CompanyDashboard from './components/CompanyDashboard';
import InstituteDashboard from './components/InstituteDashboard';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './pages/Dashboard'; // Keep for generic /dashboard redirect if needed

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or unauthorized page
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<OTPVerify />} />
      
      {/* Student Routes */}
      <Route 
        path="/student/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6 py-4 flex flex-col items-center w-full">
                 <div className="w-full">
                   <StudentDashboard />
                 </div>
            </div>
          </ProtectedRoute>
        } 
      />

      {/* Company Routes */}
      <Route 
        path="/company/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['company']}>
             <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6 py-4 flex flex-col items-center w-full">
                <div className="w-full">
                  <CompanyDashboard />
                </div>
             </div>
          </ProtectedRoute>
        } 
      />

      {/* Institute Routes */}
      <Route 
        path="/institute/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['institute']}>
             <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6 py-4 flex flex-col items-center w-full">
                <div className="w-full">
                  <InstituteDashboard />
                </div>
             </div>
          </ProtectedRoute>
        } 
      />

      {/* Admin Routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
             <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6 py-4 flex flex-col items-center w-full">
                <div className="w-full">
                  <AdminDashboard />
                </div>
             </div>
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
