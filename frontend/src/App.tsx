import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PageLoader } from './components/LoadingSpinner';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentProfileSetup } from './pages/StudentProfileSetup';
import { EmployerDashboard } from './pages/EmployerDashboard';
import { InstituteDashboard } from './pages/InstituteDashboard';
import { InternshipDetails } from './pages/InternshipDetails';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  const { isLoading } = useAuth();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <PageLoader label="Loading..." />
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/setup"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/internship/:id"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <InternshipDetails />
            </ProtectedRoute>
          }
        />

        {/* Employer Routes */}
        <Route
          path="/employer"
          element={
            <ProtectedRoute allowedRoles={['employer']}>
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Institute Routes */}
        <Route
          path="/institute"
          element={
            <ProtectedRoute allowedRoles={['institute']}>
              <InstituteDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Layout>
  );
}

export default App;
