import { Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { StudentProfileSetup } from "./pages/StudentProfileSetup";
import { EmployerDashboard } from "./pages/EmployerDashboard";
import { InstituteDashboard } from "./pages/InstituteDashboard";
import { InternshipDetails } from "./pages/InternshipDetails";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/student/setup"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentProfileSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/internship/:id"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <InternshipDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employer"
        element={
          <ProtectedRoute allowedRoles={["employer"]}>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/institute"
        element={
          <ProtectedRoute allowedRoles={["institute"]}>
            <InstituteDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

