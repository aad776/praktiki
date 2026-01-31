import { FormEvent, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/auth/forgot-password", 
        { email },
        { headers: { "Content-Type": "application/json" } }
      );
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send password reset request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Forgot Password</h1>
        <p className="text-sm text-slate-600 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending..." : "Send Reset Link"}
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