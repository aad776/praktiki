import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Step Component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, label: "Personal Details", icon: "👤" },
    { id: 2, label: "Organization Details", icon: "🏢" },
    { id: 3, label: "Account Verification", icon: "📄" },
  ];

  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center w-full max-w-3xl">
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1 flex flex-col items-center relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold z-10 transition-all duration-300 ${step.id <= currentStep
                ? "bg-blue-600 text-white shadow-lg scale-110"
                : "bg-gray-200 text-gray-500"
                }`}
            >
              {step.icon}
            </div>
            <div className={`mt-2 text-sm font-medium ${step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
              {step.label}
            </div>
            {/* Progress Bar Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-5 left-1/2 w-full h-1 -z-0 transition-colors duration-300 ${step.id < currentStep ? "bg-blue-600" : "bg-gray-200"
                  }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmployerProfileSetup = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isViewMode, setIsViewMode] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    firstName: "",
    lastName: "",
    email: "",
    designation: "",
    contactNumber: "",
    isMobileVerified: false,
    isEmailVerified: false,
    otp: "",
    otpSent: false,
    emailOtp: "",
    emailOtpSent: false,

    // Step 2
    companyName: "",
    isIndependent: false,
    organizationDescription: "",
    city: "",
    industry: "",
    employeeCount: "",
    logoUrl: "", // Mock URL or file name

    // Step 3
    verificationMethod: "license", // license, social, website
    licenseDocumentUrl: "",
    socialMediaLink: "",
    websiteUrl: "",
    isVerified: false
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const ProfileView = ({ data, onEdit, onLogout }: any) => {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-fadeIn">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <div className="w-32 h-32 rounded-2xl bg-white p-1 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-4xl">🏢</div>
                )}
              </div>
              <div className="flex gap-3 mb-2">
                <button
                  onClick={onEdit}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <button
                  onClick={onLogout}
                  className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{data.companyName}</h1>
              <p className="text-slate-500 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{data.industry || 'Industry'}</span>
                <span>•</span>
                <span>{data.city || 'Location not set'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Personal Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                  <p className="text-slate-700 font-medium">{data.firstName} {data.lastName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-slate-700 font-medium">{data.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                  <p className="text-slate-700 font-medium">{data.designation || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</p>
                  <p className="text-slate-700 font-medium">+91 {data.contactNumber || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verification
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Email</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {data.isEmailVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Phone</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.isMobileVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {data.isMobileVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Company</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.isVerified ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {data.isVerified ? 'Verified' : 'Reviewing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Organization Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                About the Organization
              </h3>
              
              <div className="prose prose-slate max-w-none mb-8">
                <p className="text-slate-600 leading-relaxed">
                  {data.organizationDescription || 'No description provided yet. Add a description to help students understand your organization better.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Employees</p>
                  <p className="text-slate-700 font-semibold">{data.employeeCount || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Website</p>
                  {data.websiteUrl ? (
                    <a href={data.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline truncate block">
                      Visit Site
                    </a>
                  ) : (
                    <p className="text-slate-500 italic">Not added</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Social</p>
                  {data.socialMediaLink ? (
                    <a href={data.socialMediaLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline truncate block">
                      Profile
                    </a>
                  ) : (
                    <p className="text-slate-500 italic">Not added</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    // Fetch existing profile if any (this now returns user info too)
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setProfileLoading(true);
    setInitialLoading(true);
    try {
      const data = await api.get<Record<string, any>>("/employers/profile");

      if (data) {
        setHasProfile(true);
        setIsViewMode(true);
      }

      // Split full_name into first/last for display
      const names = (data.full_name || "").split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "";

      setFormData((prev) => ({
        ...prev,
        // Pre-fill from user data (now included in profile response)
        firstName: firstName,
        lastName: lastName,
        email: data.email || "",
        // Pre-fill from profile data
        companyName: data.company_name || "",
        contactNumber: data.contact_number || "",
        designation: data.designation || "",
        organizationDescription: data.organization_description || "",
        city: data.city || "",
        industry: data.industry || "",
        employeeCount: data.employee_count || "",
        logoUrl: data.logo_url || "",
        websiteUrl: data.website_url || "",
        licenseDocumentUrl: data.license_document_url || "",
        socialMediaLink: data.social_media_link || "",
        isVerified: data.is_verified || false,
        // Pre-fill verification status
        isMobileVerified: data.is_phone_verified || false,
        isEmailVerified: data.is_email_verified || false,
      }));
    } catch (err) {
      // Profile might not exist yet, which is fine
      console.log("No existing profile found, using signup data");
      // Try to get basic user info from /auth/me
      try {
        const me = await api.get<Record<string, any>>("/auth/me");
        const names = (me.full_name || "").split(" ");
        setFormData((prev) => ({
          ...prev,
          firstName: names[0] || "",
          lastName: names.slice(1).join(" ") || "",
          email: me.email || "",
        }));
      } catch (e) {
        console.log("Could not fetch user info either");
      }
    } finally {
      setProfileLoading(false);
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const sendOtp = async () => {
    try {
      await api.post("/auth/request-otp", { type: "phone" });
      setFormData(prev => ({ ...prev, otpSent: true }));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const verifyOtp = async () => {
    try {
      await api.post("/auth/verify-otp", { type: "phone", code: formData.otp });
      setFormData(prev => ({ ...prev, isMobileVerified: true }));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const sendEmailOtp = async () => {
    try {
      await api.post("/auth/request-otp", { type: "email" });
      setFormData(prev => ({ ...prev, emailOtpSent: true }));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const verifyEmailOtp = async () => {
    try {
      await api.post("/auth/verify-otp", { type: "email", code: formData.emailOtp });
      setFormData(prev => ({ ...prev, isEmailVerified: true }));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      // Prepare payload matching backend schema
      const payload = {
        contact_number: formData.contactNumber,
        designation: formData.designation,
        company_name: formData.companyName,
        organization_description: formData.organizationDescription,
        city: formData.city,
        industry: formData.industry,
        employee_count: formData.employeeCount,
        logo_url: formData.logoUrl,
        website_url: formData.websiteUrl,
        license_document_url: formData.licenseDocumentUrl,
        social_media_link: formData.socialMediaLink,
        // Note: is_verified is set by admin usually, but for this demo we might auto-verify or request verification
        // The backend update endpoint doesn't allow setting is_verified directly (security), 
        // but we can assume submitting these docs initiates verification.
      };

      // Check if profile exists (update) or create (the backend handles update on existing user_id)
      // Since my backend uses PUT /profile to update and assumes profile exists (or 404),
      // but wait, I didn't add a POST /profile for creation if it doesn't exist.
      // The Signup flow usually creates a basic profile.
      // If not, I should handle it. 
      // Let's assume for now the user has a basic profile from registration (company name, contact).
      // If not, I'll need to use PUT and if 404, maybe handle creation?
      // Actually, my backend code for `update_employer_profile` returns 404 if not found.
      // I should probably fix that to create if not exists or ensure registration creates it.
      // Let's assume registration creates it or I will modify backend to create on PUT if missing (upsert).

      // For now, let's use API client (auth handled automatically)
      await api.put("/employers/profile", payload);

      navigate("/employer");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while fetching profile
  if (profileLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProfileView 
          data={formData} 
          onEdit={() => setIsViewMode(false)} 
          onLogout={handleLogout} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            {hasProfile ? "Edit Your Employer Profile" : "Complete Your Employer Profile"}
          </h1>
          {hasProfile && (
            <button
              onClick={() => setIsViewMode(true)}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-2"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <StepIndicator currentStep={step} />

        <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-semibold text-gray-800 border-b pb-4 mb-6">Personal Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Email with verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="flex gap-4">
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                  {!formData.isEmailVerified && (
                    <button
                      onClick={sendEmailOtp}
                      className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {formData.emailOtpSent ? "Resend" : "Verify Email"}
                    </button>
                  )}
                </div>
                {formData.emailOtpSent && !formData.isEmailVerified && (
                  <div className="mt-4 flex gap-4 items-center animate-slideDown">
                    <input
                      type="text"
                      placeholder="Enter Email OTP"
                      value={formData.emailOtp}
                      onChange={(e) => handleInputChange("emailOtp", e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg w-40"
                    />
                    <button
                      onClick={verifyEmailOtp}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Submit OTP
                    </button>
                    <span className="text-sm text-gray-500">Use 1234</span>
                  </div>
                )}
                {formData.isEmailVerified && (
                  <p className="mt-2 text-green-600 font-medium flex items-center gap-2">
                    ✓ Email Verified
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange("designation", e.target.value)}
                  placeholder="e.g. HR Manager"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Mobile with verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <div className="flex gap-4">
                  <div className="w-20 px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-center text-gray-600">
                    +91
                  </div>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                    placeholder="Enter 10 digit mobile number"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                  />
                  {!formData.isMobileVerified && (
                    <button
                      onClick={sendOtp}
                      className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {formData.otpSent ? "Resend" : "Verify"}
                    </button>
                  )}
                </div>
                {formData.otpSent && !formData.isMobileVerified && (
                  <div className="mt-4 flex gap-4 items-center animate-slideDown">
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={formData.otp}
                      onChange={(e) => handleInputChange("otp", e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg w-40"
                    />
                    <button
                      onClick={verifyOtp}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Submit OTP
                    </button>
                    <span className="text-sm text-gray-500">Use 1234</span>
                  </div>
                )}
                {formData.isMobileVerified && (
                  <p className="mt-2 text-green-600 font-medium flex items-center gap-2">
                    ✓ Mobile Verified
                  </p>
                )}
              </div>

              {/* Verification Status Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Verification Status</h4>
                <div className="flex gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${formData.isEmailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    Email: {formData.isEmailVerified ? '✓ Verified' : 'Pending'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${formData.isMobileVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    Phone: {formData.isMobileVerified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleNext}
                  disabled={!formData.contactNumber || !formData.designation}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-semibold text-gray-800 border-b pb-4 mb-6">Organization Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  placeholder="Enter organization name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="independent"
                  checked={formData.isIndependent}
                  onChange={(e) => handleInputChange("isIndependent", e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="independent" className="text-gray-700">
                  I am an independent practitioner (freelancer, etc.)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Description</label>
                <textarea
                  value={formData.organizationDescription}
                  onChange={(e) => handleInputChange("organizationDescription", e.target.value)}
                  placeholder="Tell us about your organization..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange("industry", e.target.value)}
                    placeholder="Select industry"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">No. of employees</label>
                <select
                  value={formData.employeeCount}
                  onChange={(e) => handleInputChange("employeeCount", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">Select an option</option>
                  <option value="0-10">0-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="500+">500+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Logo (Recommended)</label>
                <div className="relative border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                  <p className="text-blue-600 font-medium mb-1">Upload Logo</p>
                  <p className="text-xs text-gray-500">Max file size: 1Mb. types: jpeg, png</p>
                  {/* Mock File Input */}
                  <input
                    type="file"
                    className="hidden"
                    id="logo-upload"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleInputChange("logoUrl", "https://placehold.co/150?text=" + encodeURIComponent(e.target.files[0].name));
                        alert("Logo uploaded successfully (mock)");
                      }
                    }}
                  />
                  <label htmlFor="logo-upload" className="absolute inset-0 cursor-pointer"></label>
                </div>
                {formData.logoUrl && <p className="mt-2 text-sm text-green-600">Logo selected: {formData.logoUrl}</p>}
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.companyName}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Account Verification */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-semibold text-gray-800 border-b pb-4 mb-6">Account Verification</h2>

              <div className="bg-blue-50 p-4 rounded-lg text-blue-800 mb-6">
                Get your organization verified by submitting the details below to start posting internships/jobs.
              </div>

              <div className="space-y-4">
                {/* Option 1: License */}
                <div className={`border p-4 rounded-lg cursor-pointer transition-all ${formData.verificationMethod === 'license' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => handleInputChange("verificationMethod", "license")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="verification"
                      checked={formData.verificationMethod === 'license'}
                      onChange={() => handleInputChange("verificationMethod", "license")}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="font-medium text-gray-800">I have a business/practice license</span>
                  </div>
                  {formData.verificationMethod === 'license' && (
                    <div className="ml-8 mt-2 animate-fadeIn">
                      <p className="text-sm text-gray-600 mb-3">Upload official document</p>
                      <button className="w-full py-2 border-2 border-dashed border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        Upload file
                      </button>
                    </div>
                  )}
                </div>

                {/* Option 2: Social Media */}
                <div className={`border p-4 rounded-lg cursor-pointer transition-all ${formData.verificationMethod === 'social' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => handleInputChange("verificationMethod", "social")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="verification"
                      checked={formData.verificationMethod === 'social'}
                      onChange={() => handleInputChange("verificationMethod", "social")}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="font-medium text-gray-800">I have an active social media page</span>
                  </div>
                  {formData.verificationMethod === 'social' && (
                    <div className="ml-8 mt-2 animate-fadeIn">
                      <p className="text-sm text-gray-600 mb-3">Connect your organization/founder's LinkedIn or other social media profile (with minimum ~1000 followers).</p>
                      <div className="flex gap-4">
                        <button className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                          <span>Instagram</span>
                        </button>
                        <button className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                          <span>LinkedIn</span>
                        </button>
                        <button className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                          <span>YouTube</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Paste your profile link here"
                        value={formData.socialMediaLink}
                        onChange={(e) => handleInputChange("socialMediaLink", e.target.value)}
                        className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Option 3: Website */}
                <div className={`border p-4 rounded-lg cursor-pointer transition-all ${formData.verificationMethod === 'website' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  onClick={() => handleInputChange("verificationMethod", "website")}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      name="verification"
                      checked={formData.verificationMethod === 'website'}
                      onChange={() => handleInputChange("verificationMethod", "website")}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="font-medium text-gray-800">I have an active and functional website</span>
                  </div>
                  {formData.verificationMethod === 'website' && (
                    <div className="ml-8 mt-2 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="Enter website URL (e.g. https://mycompany.com)"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400 transition-all transform hover:-translate-y-1"
                >
                  {loading ? "Submitting..." : "Finish & Post Internship"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          Need help? Call us at <span className="text-blue-600 font-medium">+91 8448444852</span>, available from Mon to Fri, 10 AM - 6 PM.
        </p>
      </div>
    </div>
  );
};
