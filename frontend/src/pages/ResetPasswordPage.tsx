import { FormEvent, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid or missing reset token");
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/auth/reset-password", 
        { token, new_password: password },
        { headers: { "Content-Type": "application/json" } }
      );
      setMessage(res.data.message);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!tokenValid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-slate-600 mb-6">
            The password reset link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Request New Link
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-sm text-slate-600 mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {(message || error) && (
            <p className={`text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>
              {error || message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}