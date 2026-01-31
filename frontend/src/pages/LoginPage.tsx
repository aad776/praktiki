import { FormEvent, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "student" | "employer" | "institute";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [apaarId, setApaarId] = useState("");
  const [aisheCode, setAisheCode] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (mode === "signup" && !fullName.trim()) {
        throw new Error("Please enter your full name.");
      }
      
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      
      if (role === "student" && mode === "login" && apaarId && apaarId.length !== 12) {
        throw new Error("APAAR ID must be 12 digits if provided.");
      }

      const baseUrl = "http://127.0.0.1:8000";
      const headers = { "Content-Type": "application/json" };

      if (mode === "login") {
        const payload: any = {
          email,
          password
        };
        // Only include apaar_id if it has a value
        if (role === "student" && apaarId) {
          payload.apaar_id = apaarId;
        }

        console.log("Login Payload:", payload); // Debug
        const res = await axios.post(`${baseUrl}/auth/login`, payload, { headers });
        const data = res.data as { access_token: string; role: Role };

        login(data.access_token, data.role);

        if (data.role === "student") navigate("/student");
        else if (data.role === "employer") navigate("/employer");
        else if (data.role === "institute") navigate("/institute");
      } else {
        if (role === "student") {
          await axios.post(`${baseUrl}/auth/signup`, {
            email,
            full_name: fullName,
            password,
            role: "student"
          }, { headers });
        } else if (role === "employer") {
          await axios.post(`${baseUrl}/auth/signup/employer`, {
            email,
            full_name: fullName,
            password,
            company_name: "My Company",
            contact_number: "0000000000"
          }, { headers });
        } else if (role === "institute") {
          await axios.post(`${baseUrl}/auth/signup/institute`, {
            email,
            full_name: fullName,
            password,
            institute_name: "My Institute",
            aishe_code: aisheCode,
            contact_number: "0000000000"
          }, { headers });
        }

        setMode("login");
        setError(null);
        // Show success message
        const successEl = document.createElement('div');
        successEl.className = 'fixed top-4 right-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-md text-sm z-50 shadow-lg';
        successEl.textContent = 'Signup successful! Please login now.';
        document.body.appendChild(successEl);
        setTimeout(() => successEl.remove(), 3000);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let errorMsg = err.message || "An unexpected error occurred. Please try again.";
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = "Invalid email or password.";
          if (err.response.data?.detail?.includes("verify")) {
            errorMsg = "Please verify your email before logging in.";
          }
        } else if (err.response.status === 400) {
          errorMsg = err.response.data.detail || "Invalid input.";
        } else if (err.response.status === 422) {
          // Validation error from FastAPI
          const details = err.response.data.detail;
          if (Array.isArray(details)) {
             errorMsg = details.map((d: any) => d.msg).join(", ");
          } else {
             errorMsg = "Validation failed. Please check your inputs.";
          }
        }
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg space-y-4"
      >
        <div className="flex justify-between mb-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Praktiki {mode === "login" ? "Login" : "Signup"}
          </h1>
          <button
            type="button"
            className="text-xs text-slate-600 underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create account" : "Have an account? Login"}
          </button>
        </div>

        <div className="flex gap-2">
          {["student", "employer", "institute"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r as Role)}
              className={`flex-1 rounded-full border px-3 py-1 text-sm ${
                role === r
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

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

        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {role === "student" && mode === "login" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              APAAR ID (Optional)
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={apaarId}
              onChange={(e) => setApaarId(e.target.value)}
              placeholder="12-digit ID"
            />
          </div>
        )}
        
        {role === "institute" && mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              AISHE Code
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={aisheCode}
              onChange={(e) => setAisheCode(e.target.value)}
              placeholder="Enter your AISHE code"
              required
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {loading ? "Please wait..." : (mode === "login" ? "Login" : "Signup")}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="w-full mt-2 text-center text-xs text-slate-600 underline hover:text-slate-800"
          >
            Forgot Password?
          </button>
        )}
      </form>
    </main>
  );
}
