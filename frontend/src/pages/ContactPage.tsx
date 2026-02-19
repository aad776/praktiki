import { PublicNavbar } from "../components/PublicNavbar";
import { Mail, Phone, MapPin, MessageSquare, GraduationCap, Building2, Send } from "lucide-react";
import { useState } from "react";

export function ContactPage() {
  const [activeTab, setActiveTab] = useState<'student' | 'employer'>('student');

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      
      {/* Header */}
      <section className="bg-slate-900 text-white py-20 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl lg:text-5xl font-extrabold mb-6">How can we help you?</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Our team is here to support your journey. Choose your role below to get personalized assistance.
          </p>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-brand-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 -mt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Contact Info Sidebar */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 flex-shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Email Us</p>
                      <p className="text-slate-900 font-semibold">support@praktiki.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Call Us</p>
                      <p className="text-slate-900 font-semibold">+91 98765 43210</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Office</p>
                      <p className="text-slate-900 font-semibold">Cyber City, Gurugram, India</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-600 p-8 rounded-2xl shadow-lg text-white">
                <h3 className="text-xl font-bold mb-4">Live Chat Support</h3>
                <p className="text-brand-100 mb-6">Average response time: 5 minutes</p>
                <button className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors">
                  <MessageSquare size={20} />
                  Start Chat
                </button>
              </div>
            </div>

            {/* Support Form Container */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Role Switcher */}
                <div className="flex border-b border-slate-100">
                  <button 
                    onClick={() => setActiveTab('student')}
                    className={`flex-1 py-6 flex items-center justify-center gap-3 font-bold transition-all ${activeTab === 'student' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                  >
                    <GraduationCap size={24} />
                    Student Help Section
                  </button>
                  <button 
                    onClick={() => setActiveTab('employer')}
                    className={`flex-1 py-6 flex items-center justify-center gap-3 font-bold transition-all ${activeTab === 'employer' ? 'bg-white text-brand-600 border-b-2 border-brand-600' : 'bg-slate-50 text-slate-500 hover:text-slate-700'}`}
                  >
                    <Building2 size={24} />
                    Employer Help Section
                  </button>
                </div>

                {/* Form */}
                <div className="p-8 lg:p-12">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {activeTab === 'student' ? 'Student Support' : 'Employer Partnership & Support'}
                    </h3>
                    <p className="text-slate-500 mt-2">
                      {activeTab === 'student' 
                        ? 'Need help with your application or profile? Fill out the form below.' 
                        : 'Interested in hiring or have questions about our portal? Let us know.'}
                    </p>
                  </div>

                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Full Name</label>
                        <input type="text" placeholder="John Doe" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Email Address</label>
                        <input type="email" placeholder="john@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Subject</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all appearance-none">
                        {activeTab === 'student' ? (
                          <>
                            <option>Application Status Inquiry</option>
                            <option>Profile Setup Issues</option>
                            <option>Resume Maker Help</option>
                            <option>Other</option>
                          </>
                        ) : (
                          <>
                            <option>Hiring Partnership</option>
                            <option>Technical Integration</option>
                            <option>Billing & Subscription</option>
                            <option>Other</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Message</label>
                      <textarea rows={5} placeholder="How can we help you?" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all resize-none"></textarea>
                    </div>

                    <button type="submit" className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2">
                      <Send size={20} />
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm inline-block">
            <p className="text-slate-600 mb-4 font-medium">Want quick answers?</p>
            <button className="text-brand-600 font-bold hover:underline">Check our Frequently Asked Questions →</button>
          </div>
        </div>
      </section>
    </div>
  );
}
