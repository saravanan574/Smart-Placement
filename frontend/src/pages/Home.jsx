import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Brain,
  CheckCircle,
  Users,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Star,
  Calendar,
  Target
} from 'lucide-react'
import Header from '../components/layout/Header'

const useCountUp = (target, duration = 2000) => {
  const [count, setCount] = React.useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const step = target / (duration / 16)
          const timer = setInterval(() => {
            start += step
            if (start >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start))
            }
          }, 16)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return [count, ref]
}

const FeatureCard = ({ icon: Icon, color, bg, title, description }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
  </div>
)

const StepCard = ({ number, title, description, isLast }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
        {number}
      </div>
      {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-2" />}
    </div>
    <div className="pb-8">
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
)

const Home = () => {
  const [emails, emailsRef] = useCountUp(10000)
  const [students, studentsRef] = useCountUp(500)
  const [companies, companiesRef] = useCountUp(120)

  const features = [
    { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Smart Gmail Sync', description: 'Connect your college Gmail once. SPEI reads and categorizes all placement-related emails automatically — no manual effort needed.' },
    { icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50', title: 'AI-Powered Analysis', description: "Powered by Groq's Llama 3.3 model, SPEI extracts company name, role, salary, eligibility criteria, and deadlines from every email." },
    { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', title: 'Eligibility Checking', description: 'SPEI instantly checks if you qualify for each opportunity based on your CGPA, backlogs, department, and academic percentages.' },
    { icon: Target, color: 'text-red-500', bg: 'bg-red-50', title: 'Shortlist Detection', description: 'SPEI scans announcement emails and auto-detects if your name, register number, or ID appears — alerting you before you even open the email.' },
    { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'Placement Community', description: 'Get auto-added to company-specific chat rooms when shortlisted. Connect, prepare, and discuss with fellow shortlisted students in real time.' },
    { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Deadline Tracker', description: 'Never miss an application deadline. View all deadlines in a clean list or calendar view with urgency indicators and reminders.' },
    { icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50', title: 'Application Dashboard', description: 'Track every opportunity from opt-in to offer in a visual pipeline. Update status, view match scores, and monitor your placement journey.' },
    { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-100', title: 'Privacy First', description: "We only read placement-related emails using Gmail's read-only OAuth scope. Your password is never accessed. Disconnect anytime." }
  ]

  const steps = [
    { number: '1', title: 'Create your account', description: 'Register with your college placement email, add your CGPA, department, skills, and custom details like your placement ID or roll number.' },
    { number: '2', title: 'Connect your Gmail', description: 'Authorize SPEI to read your Gmail using Google OAuth2 with read-only access. We never modify or send emails on your behalf.' },
    { number: '3', title: 'Auto-sync and analyze', description: 'SPEI fetches your emails, runs them through our AI, extracts job details, checks your eligibility, and matches your skills — all in seconds.' },
    { number: '4', title: 'Get shortlist alerts', description: 'When a shortlist email arrives, SPEI scans it for your name, register number, and custom IDs. If detected, you get an instant notification.' },
    { number: '5', title: 'Track and prepare', description: 'Opt in to opportunities, update your application status, join company communities, and use preparation links to ace your interviews.' }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <section className="relative pt-24 pb-20 px-4 overflow-hidden bg-gradient-to-br from-slate-900 via-primary to-blue-800">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1.5 text-xs font-semibold mb-6 backdrop-blur-sm border border-white/20">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            AI-Powered Placement Intelligence for Engineering Students
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Never Miss a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Placement
            </span>{' '}
            Opportunity Again
          </h1>

          <p className="text-lg text-white/75 max-w-2xl mx-auto mb-8 leading-relaxed">
            SPEI connects to your college Gmail, automatically detects placement emails,
            checks your eligibility, matches your skills, and alerts you the moment
            you're shortlisted — all powered by Groq AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/about" className="flex items-center gap-2 bg-white/10 text-white font-medium px-8 py-4 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/30 backdrop-blur-sm text-base">
              How it Works
            </Link>
          </div>

          <p className="text-white/40 text-xs mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Read-only Gmail access · No spam · Disconnect anytime
          </p>
        </div>

        {/* Hero preview card */}
        <div className="relative max-w-3xl mx-auto mt-16 px-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white/10 rounded-lg h-5 text-center text-white/40 text-xs leading-5">
                SPEI Dashboard
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Opportunities', val: '24', color: 'bg-blue-500/20 text-blue-300' },
                { label: 'Eligible', val: '18', color: 'bg-green-500/20 text-green-300' },
                { label: 'Applied', val: '7', color: 'bg-indigo-500/20 text-indigo-300' },
                { label: 'Shortlisted', val: '2', color: 'bg-amber-500/20 text-amber-300' }
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-lg p-2 text-center`}>
                  <p className="text-lg font-black">{s.val}</p>
                  <p className="text-xs opacity-75">{s.label}</p>
                </div>
              ))}
            </div>

            {[
              { company: 'TCS', role: 'Software Engineer', badge: '✓ ELIGIBLE', badgeColor: 'bg-green-500/20 text-green-300', match: '92%' },
              { company: 'Infosys', role: 'Systems Engineer', badge: '✓ APPLY', badgeColor: 'bg-green-500/20 text-green-300', match: '78%' },
              { company: 'Wipro', role: 'Project Engineer', badge: '~ MAYBE', badgeColor: 'bg-amber-500/20 text-amber-300', match: '61%' }
            ].map((opp) => (
              <div key={opp.company} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded text-white text-xs flex items-center justify-center font-bold">
                    {opp.company[0]}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{opp.company}</p>
                    <p className="text-white/50 text-xs">{opp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opp.badgeColor}`}>{opp.badge}</span>
                  <span className="text-white/50 text-xs">{opp.match}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 divide-x divide-gray-200">
            <div ref={emailsRef} className="text-center">
              <p className="text-4xl font-black text-primary">{emails.toLocaleString()}+</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Emails Analyzed</p>
            </div>
            <div ref={studentsRef} className="text-center">
              <p className="text-4xl font-black text-primary">{students}+</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Students Helped</p>
            </div>
            <div ref={companiesRef} className="text-center">
              <p className="text-4xl font-black text-primary">{companies}+</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">Companies Detected</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Features</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 mb-4">Everything you need to land your dream job</h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto">SPEI handles the entire placement workflow — from email detection to shortlist alerts — so you can focus on preparation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 mb-4">Up and running in minutes</h2>
            <p className="text-gray-500 text-base">One-time setup, then sit back and let SPEI do the work.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {steps.map((step, index) => (
              <StepCard key={step.number} {...step} isLast={index === steps.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary to-accent rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-xl sm:text-2xl font-bold mb-6 max-w-2xl mx-auto leading-relaxed">
                "I got shortlisted at TCS and SPEI notified me before I even checked my email. I joined the community and we prepared together. Got the offer!"
              </p>
              <p className="text-white/70 text-sm font-medium">— Engineering Student, CSE 2025 Batch</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Ready to take control of your placement?</h2>
          <p className="text-gray-500 text-base mb-8">Join hundreds of engineering students who never miss an opportunity. Free to use. No credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-xl hover:bg-accent transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 text-base">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="text-base font-medium text-gray-600 hover:text-primary transition-colors underline underline-offset-4">
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white/60 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-semibold text-white">SPEI</span>
            <span>— Smart Placement Email Intelligence</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
          <p className="text-xs">© 2026 SPEI · Final Year Project</p>
        </div>
      </footer>
    </div>
  )
}

export default Home