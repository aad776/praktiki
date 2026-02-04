import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api, { ApiError } from '../services/api';
import { ButtonSpinner } from '../components/LoadingSpinner';
import { config } from '../config';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email.trim())}`);
      setSubmitted(true);
      toast.success('Password reset instructions sent to your email.');
    } catch (err) {
      const error = err as ApiError;
      // Don't reveal if email exists or not for security
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{config.app.name}</h1>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-lg">
          {submitted ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h2>
              <p className="text-slate-600 mb-6">
                If an account exists with <strong>{email}</strong>, we've sent password reset instructions.
              </p>
              <Link
                to="/"
                className="inline-block px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 
                  transition-colors font-medium"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Forgot your password?</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Enter your email and we'll send you reset instructions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm 
                      focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white 
                    hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <ButtonSpinner />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Remember your password?{' '}
                  <Link to="/" className="font-medium text-slate-900 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
