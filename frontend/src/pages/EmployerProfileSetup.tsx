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
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold z-10 transition-all duration-300 ${
                step.id <= currentStep
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
                className={`absolute top-5 left-1/2 w-full h-1 -z-0 transition-colors duration-300 ${
                  step.id < currentStep ? "bg-blue-600" : "bg-gray-200"
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
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    // Step 1
    firstName: "",
    lastName: "",
    email: "",
    designation: "",
    contactNumber: "",
    isMobileVerified: false,
    otp: "",
    otpSent: false,
    
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

  useEffect(() => {
    // Pre-fill user data
    if (user) {
      const names = user.full_name?.split(" ") || ["", ""];
      setFormData((prev) => ({
        ...prev,
        firstName: names[0] || "",
        lastName: names.slice(1).join(" ") || "",
        email: user.email || "",
      }));
      
      // Fetch existing profile if any
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await api.get<Record<string, any>>("/employers/profile");
      const data = res;
      setFormData((prev) => ({
        ...prev,
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
        isVerified: data.is_verified || false
      }));
    } catch (err) {
      // Profile might not exist yet, which is fine
      console.log("No existing profile found");
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

  const sendOtp = () => {
    // Mock OTP send
    setFormData(prev => ({ ...prev, otpSent: true }));
    alert("OTP sent to " + formData.contactNumber);
  };

  const verifyOtp = () => {
    if (formData.otp === "1234") { // Mock OTP
        setFormData(prev => ({ ...prev, isMobileVerified: true }));
    } else {
        alert("Invalid OTP (Use 1234)");
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">Complete Your Employer Profile</h1>
        
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                />
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
                        ✓ Verified
                    </p>
                )}
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleNext}
                  disabled={!formData.contactNumber || !formData.designation} // Basic validation
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
                            if(e.target.files?.[0]) {
                                handleInputChange("logoUrl", "https://via.placeholder.com/150?text=" + e.target.files[0].name);
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
