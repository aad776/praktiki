import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/api';
import { ShieldCheck, RefreshCw } from 'lucide-react';

const OTPVerify = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.verifyOTP(email, otp);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed');
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOTP(email);
      setMessage('OTP resent successfully');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP');
    }
  };

  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg">
          <p className="text-red-500">Email not found. Please sign up again.</p>
          <button onClick={() => navigate('/signup')} className="mt-4 text-blue-500">Go to Signup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-96">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="h-12 w-12 text-blue-500" />
        </div>
        <h3 className="text-2xl font-bold text-center text-gray-800">Verify OTP</h3>
        <p className="text-center text-gray-500 text-sm mt-2">Enter the code sent to {email}</p>
        
        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        {message && <p className="text-green-500 text-sm text-center mt-2">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <input 
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 tracking-widest text-center text-xl"
              type="text" 
              placeholder="ENTER OTP" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </div>
          <div className="flex items-baseline justify-between">
            <button className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 w-full">Verify</button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button 
            onClick={handleResend}
            className="text-sm text-blue-600 hover:underline flex items-center justify-center w-full"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerify;
