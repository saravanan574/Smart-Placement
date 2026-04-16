import React from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Brain,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Unlink,
  Database,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Zap,
  Users,
  FileText,
  Key
} from 'lucide-react'

// ── Flow step ─────────────────────────────────────────────────────────────────
const FlowStep = ({ icon: Icon, color, bg, title, description, arrow }) => (
  <div className="flex flex-col items-center text-center relative">
    <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-3 shadow-sm`}>
      <Icon className={`w-7 h-7 ${color}`} />
    </div>
    <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-xs text-gray-500 leading-relaxed max-w-[140px]">{description}</p>
    {arrow && (
      <div className="hidden md:block absolute -right-6 top-5 text-gray-300 text-2xl font-light">
        →
      </div>
    )}
  </div>
)

// ── Data item ─────────────────────────────────────────────────────────────────
const DataItem = ({ icon: Icon, color, title, description, isCollected }) => (
  <div className={`flex items-start gap-4 p-4 rounded-xl border
                   ${isCollected
                     ? 'bg-blue-50 border-blue-200'
                     : 'bg-gray-50 border-gray-200'
                   }`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                     ${isCollected ? 'bg-blue-100' : 'bg-gray-200'}`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div>
      <p className={`text-sm font-semibold mb-0.5
                     ${isCollected ? 'text-blue-900' : 'text-gray-700'}`}>
        {title}
      </p>
      <p className={`text-xs leading-relaxed
                     ${isCollected ? 'text-blue-700' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
    <div className="shrink-0 mt-0.5">
      {isCollected
        ? <CheckCircle className="w-4 h-4 text-blue-500" />
        : <AlertCircle className="w-4 h-4 text-gray-400" />
      }
    </div>
  </div>
)

const About = () => {
  const howItWorksSteps = [
    {
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      title: 'Connect Gmail',
      description: 'You authorize read-only Gmail access via Google OAuth2',
      arrow: true
    },
    {
      icon: Eye,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      title: 'Fetch Emails',
      description: 'SPEI fetches recent emails from your inbox',
      arrow: true
    },
    {
      icon: Brain,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      title: 'AI Analysis',
      description: 'Groq AI reads the email and extracts job details',
      arrow: true
    },
    {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      title: 'Check Eligibility',
      description: 'Your CGPA, backlogs, and department are checked',
      arrow: true
    },
    {
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      title: 'Alert You',
      description: 'You get notified if shortlisted or deadline nears',
      arrow: false
    }
  ]

  const dataWeCollect = [
    {
      icon: FileText,
      color: 'text-blue-600',
      title: 'Academic Details',
      description: 'CGPA, 10th/12th percentage, active backlogs, department, batch year — used only for eligibility checking.',
      isCollected: true
    },
    {
      icon: Key,
      color: 'text-blue-600',
      title: 'Custom Identifiers',
      description: 'Placement ID, roll number, or any custom key-value pair you provide — used to detect your name in shortlist emails.',
      isCollected: true
    },
    {
      icon: Users,
      color: 'text-blue-600',
      title: 'Skills List',
      description: 'Your technical skills (e.g. Python, React) — used for skill matching with job requirements.',
      isCollected: true
    },
    {
      icon: Mail,
      color: 'text-blue-600',
      title: 'Email Content',
      description: 'Only placement-related emails are read and analyzed. Email body text is sent to our AI service for analysis.',
      isCollected: true
    }
  ]

  const dataWeDoNotCollect = [
    {
      icon: Lock,
      color: 'text-gray-500',
      title: 'Your Gmail Password',
      description: 'We never see your password. Google OAuth2 handles authentication directly with Google.',
      isCollected: false
    },
    {
      icon: EyeOff,
      color: 'text-gray-500',
      title: 'Personal Emails',
      description: 'We only read placement-related emails. Personal, social, and other emails are completely ignored.',
      isCollected: false
    },
    {
      icon: Database,
      color: 'text-gray-500',
      title: 'Email Attachments (Contents)',
      description: 'Attachment text is read only when needed for AI analysis. Files are never downloaded or stored on our servers.',
      isCollected: false
    }
  ]

  const privacyPrinciples = [
    {
      icon: Lock,
      title: 'Read-Only Gmail Access',
      description: 'SPEI requests only the gmail.readonly OAuth2 scope. We cannot send, delete, or modify any emails.'
    },
    {
      icon: Shield,
      title: 'Secure Token Storage',
      description: 'Google OAuth2 access tokens and refresh tokens are stored encrypted in our database with select:false — they\'re never sent to the frontend.'
    },
    {
      icon: Unlink,
      title: 'Disconnect Anytime',
      description: 'You can disconnect your Gmail from the Profile page at any time. This removes our access to your email immediately.'
    },
    {
      icon: Database,
      title: 'Your Data, Your Control',
      description: 'All your emails and opportunities stored in SPEI can be deleted using the clear function. We don\'t sell or share your data.'
    }
  ]

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-primary to-blue-800 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 rounded-full
                           px-4 py-1.5 text-xs font-semibold mb-6 border border-white/20">
            About SPEI
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            What is SPEI and{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              how does it protect you?
            </span>
          </h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            SPEI is a Smart Placement Email Intelligence system built for Indian engineering
            college students. It uses AI to automatically scan your Gmail for placement
            opportunities, check eligibility, and detect shortlists — while keeping your
            data completely secure.
          </p>
        </div>
      </section>

      {/* ── WHAT IS SPEI ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                The Problem
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 mb-4">
                Placement emails are overwhelming
              </h2>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  Engineering students receive dozens of placement emails every week —
                  from job postings to shortlist announcements to interview schedules.
                  Most students miss deadlines, miss shortlists, or waste time manually
                  checking eligibility for each company.
                </p>
                <p>
                  Placement portals are often outdated, slow, or inconsistent.
                  Students have to manually track everything in spreadsheets,
                  WhatsApp groups, and inboxes — juggling academics at the same time.
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                The Solution
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 mb-4">
                SPEI does it all automatically
              </h2>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  SPEI connects to your college Gmail and reads placement emails in
                  the background. Using Groq's Llama 3.3 AI, it extracts company name,
                  job role, salary, deadline, eligibility criteria, and required skills
                  from every email — automatically.
                </p>
                <p>
                  When you're shortlisted, SPEI detects your name or ID in the
                  announcement email and notifies you instantly. You're also auto-added
                  to a company-specific chat community to prepare with other shortlisted students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS FLOW ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              The Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 mb-3">
              How SPEI works under the hood
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              From the moment an email arrives in your inbox to the shortlist alert
              on your screen — here's exactly what happens.
            </p>
          </div>

          {/* Flow diagram */}
          <div className="flex flex-col md:flex-row items-start justify-center gap-6 md:gap-12 mb-12">
            {howItWorksSteps.map((step, index) => (
              <FlowStep
                key={step.title}
                {...step}
                arrow={index < howItWorksSteps.length - 1}
              />
            ))}
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                step: '01',
                title: 'Email Fetching',
                detail: 'SPEI uses Gmail API to fetch emails from the last 90 days (or since your last sync). It builds a smart Gmail query filter and fetches up to 50 emails per sync. Email subject, body (text + HTML), and attachment metadata are retrieved.'
              },
              {
                step: '02',
                title: 'Keyword Pre-filter',
                detail: 'Before calling the AI, SPEI applies a fast keyword rule. Emails with spam keywords (newsletter, OTP, fee payment, NPTEL, etc.) are skipped. Only emails with placement keywords (recruitment, shortlisted, offer letter, CTC, etc.) proceed to AI analysis.'
              },
              {
                step: '03',
                title: 'AI Analysis with Groq',
                detail: 'The email text and your student profile are sent to Groq\'s Llama 3.3-70b-versatile model. The AI extracts 20+ fields including company name, job role, salary, deadline, required skills, eligibility criteria, departments, and whether you\'re shortlisted.'
              },
              {
                step: '04',
                title: 'Eligibility & Skill Matching',
                detail: 'Pure Python logic (no AI) checks your CGPA, 10th%, 12th%, active backlogs, and department against extracted criteria. Skill matching uses synonym expansion (e.g. "js" = "javascript", "ml" = "machine learning") for accurate matching scores.'
              },
              {
                step: '05',
                title: 'Shortlist Detection',
                detail: 'The AI specifically scans for your register number, name, placement email, personal email, and all custom detail values you provided (like placement portal ID). If detected, SPEI auto-creates a community for that company and sends you a high-priority notification.'
              },
              {
                step: '06',
                title: 'Preparation Links',
                detail: 'SPEI automatically generates preparation links for every company — GeeksForGeeks company page, LinkedIn company page, AmbitionBox reviews, and a YouTube interview experience search. These are built in Node.js, never by AI.'
              }
            ].map((item) => (
              <div key={item.step}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {item.step}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA WE COLLECT ──────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 mb-3">
              What data we use — and what we don't
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              We believe in complete transparency. Here's exactly what SPEI
              accesses, why we need it, and what we never touch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Data we collect and why
              </h3>
              <div className="space-y-3">
                {dataWeCollect.map((item) => (
                  <DataItem key={item.title} {...item} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Data we never collect
              </h3>
              <div className="space-y-3">
                {dataWeDoNotCollect.map((item) => (
                  <DataItem key={item.title} {...item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY PRINCIPLES ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Privacy & Security
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 mb-3">
              Your privacy is our priority
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              We've designed SPEI from the ground up with security in mind.
              Here are the principles we follow — not just promises.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {privacyPrinciples.map((principle) => {
              const Icon = principle.icon
              return (
                <div key={principle.title}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100
                             hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center
                                  justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Trust banner */}
          <div className="mt-10 bg-white rounded-2xl border border-green-200 p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-800 mb-1">
                We don't sell your data. Ever.
              </h3>
              <p className="text-xs text-green-700 leading-relaxed">
                SPEI is a final year academic project. Your data is used solely to provide
                the placement intelligence features described above. We have no advertisers,
                no data brokers, and no third-party sharing of any kind. Your placement
                journey is yours alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-4">
            Ready to try SPEI?
          </h2>
          <p className="text-white/60 text-base mb-8">
            Free to use. No credit card. Just your college Gmail and your ambition.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-primary text-white font-bold
                         px-8 py-4 rounded-xl hover:bg-accent transition-all duration-200
                         shadow-md hover:shadow-lg text-base"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="text-base font-medium text-white/60 hover:text-white
                         transition-colors underline underline-offset-4"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About