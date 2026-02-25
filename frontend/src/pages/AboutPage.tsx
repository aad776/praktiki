import { PublicNavbar } from "../components/PublicNavbar";
import { Users, Target, Award, Rocket, CheckCircle2 } from "lucide-react";

export function AboutPage() {
  const milestones = [
    { year: "2024", title: "Praktiki Launched", description: "Started with a vision to simplify internship hiring." },
    { year: "2024", title: "100+ Companies", description: "Partnered with top tech firms for verified internships." },
    { year: "2025", title: "AI Integration", description: "Launched AI-powered matching and Resume Maker." },
    { year: "2025", title: "10k+ Placements", description: "Successfully helped students land their dream roles." },
  ];

  const team = [
    { name: "Rahul Sharma", role: "Founder & CEO", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" },
    { name: "Priya Patel", role: "Head of Engineering", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
    { name: "Arjun Singh", role: "Product Designer", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" },
    { name: "Ananya Iyer", role: "Student Relations", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-slate-50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 mb-6">
              Bridging the Gap Between <span className="text-brand-600">Learning & Career</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Praktiki is more than just a job portal. We are an ecosystem designed to empower students and streamline hiring for employers through innovation and trust.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-brand-50 rounded-full blur-3xl opacity-50"></div>
      </section>

      {/* Our Vision */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-4">
                <Target size={16} />
                Our Vision
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                Empowering the Next Generation of Professionals
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Our vision is to become the global standard for early-career opportunities. We believe every student deserves a chance to showcase their talent, regardless of their background or location.
              </p>
              <ul className="space-y-4">
                {[
                  "Verified opportunities only",
                  "AI-driven skill matching",
                  "Seamless college integrations",
                  "End-to-end placement tracking"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="text-green-500" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Team working" 
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-xl border border-slate-100 hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                    <Rocket size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">2024</p>
                    <p className="text-sm text-slate-500">Founded with ❤️ in India</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Our Milestones</h2>
            <p className="text-slate-400">The journey of Praktiki from a small idea to a massive platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((m, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <div className="text-brand-400 text-4xl font-bold mb-4">{m.year}</div>
                <h3 className="text-xl font-bold mb-2">{m.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold mb-4">
              <Users size={16} />
              Meet the Team
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">The Minds Behind Praktiki</h2>
            <p className="text-slate-600">A dedicated team of experts working to redefine your career journey.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((t, i) => (
              <div key={i} className="group text-center">
                <div className="relative mb-6 inline-block">
                  <div className="w-48 h-48 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 border-2 border-brand-600/0 group-hover:border-brand-600/100 rounded-2xl transition-all duration-500 -m-2"></div>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t.name}</h3>
                <p className="text-slate-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Ready to join our journey?</h2>
          <div className="flex justify-center gap-4">
            <button className="btn-primary px-8 py-3">Join as Student</button>
            <button className="btn-secondary px-8 py-3">Partner with Us</button>
          </div>
        </div>
      </section>
    </div>
  );
}
