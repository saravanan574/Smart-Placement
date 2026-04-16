import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Briefcase, Calendar,
  Link2, CheckCircle, XCircle, Star, Users,
  AlertTriangle, RefreshCw, ChevronRight, Mail,
  Tag, FileText, Award, ClipboardCheck, Loader2,
  Clock, Trophy, ChevronDown, ChevronUp
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import { opportunityAPI } from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMatchColor = (score) => {
  if (score >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
  if (score >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-600'   }
  return               { bar: 'bg-red-400',        text: 'text-red-500'     }
}

const InfoRow = ({ label, value, valueClass = 'text-slate-800' }) =>
  value ? (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium w-36 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right flex-1 ${valueClass}`}>{value}</span>
    </div>
  ) : null

const CheckRow = ({ label, required, userValue, passed, suffix = '' }) => {
  // Don't show row if criteria not specified (required is null)
  if (required === null || required === undefined) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">
          Required: <span className="font-medium text-slate-600">{required}{suffix}</span>
        </span>
        <span className="text-xs text-slate-400">
          Yours: <span className="font-medium text-slate-700">
            {userValue !== null && userValue !== undefined ? `${userValue}${suffix}` : '—'}
          </span>
        </span>
        {passed
          ? <CheckCircle size={16} className="text-emerald-500 shrink-0" />
          : <XCircle    size={16} className="text-red-500 shrink-0"     />}
      </div>
    </div>
  )
}

const SkillChip = ({ label, variant }) => {
  const cls = {
    matched: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    missing: 'bg-red-50 text-red-600 border border-red-100',
    good:    'bg-amber-50 text-amber-700 border border-amber-100'
  }[variant] || 'bg-slate-100 text-slate-600'
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
}

// ─── Journey Timeline — only shown when opted in or shortlisted ───────────────
const JourneyTimeline = ({ opp }) => {
  const steps = []

  // Registration — only add if opted in or shortlisted (means they took action)
  if (opp.isOptedIn || opp.isShortlisted) {
    const emailDate = opp.emailId?.date || opp.createdAt
    steps.push({
      key:    'registration',
      icon:   '📧',
      label:  'Registration Email',
      date:   emailDate,
      detail: opp.emailId?.subject || `${opp.companyName} placement drive`,
      status: 'done',
      color:  'bg-blue-500'
    })
  }

  // Opted In
  if (opp.isOptedIn) {
    steps.push({
      key:    'opted',
      icon:   '✋',
      label:  'Opted In',
      date:   null,
      detail: 'You expressed interest in this opportunity',
      status: 'done',
      color:  'bg-indigo-500'
    })
  }

  // Shortlisted
  if (opp.isShortlisted) {
    steps.push({
      key:    'shortlisted',
      icon:   '🎯',
      label:  'Shortlisted!',
      date:   null,
      detail: opp.detectionSource
        ? `Detected via ${opp.detectionSource}`
        : opp.matchedField
        ? `Detected via ${opp.matchedField}`
        : 'Shortlist detected from email',
      status: 'done',
      color:  'bg-green-500'
    })
  }

  // Round history
  if (opp.roundHistory?.length > 0) {
    opp.roundHistory.forEach((round, i) => {
      const s = {
        passed:  { status: 'done',     color: 'bg-green-500',  icon: '✅' },
        failed:  { status: 'failed',   color: 'bg-red-500',    icon: '❌' },
        pending: { status: 'upcoming', color: 'bg-amber-400',  icon: '⏳' }
      }[round.result] || { status: 'upcoming', color: 'bg-amber-400', icon: '⏳' }

      steps.push({
        key:    `round_${i}`,
        icon:   s.icon,
        label:  `Round ${i + 1}: ${round.roundType}`,
        date:   round.roundDate,
        detail: [
          round.venue  ? `📍 ${round.venue}`  : null,
          round.notes  ? `💬 ${round.notes}`  : null,
          round.source === 'manual' ? '✏️ Manually added' : null
        ].filter(Boolean).join(' · ') || null,
        status: s.status,
        color:  s.color,
        result: round.result
      })
    })
  }

  // Upcoming next round (if not already in roundHistory)
  if (opp.nextRoundType && !['offered','accepted','rejected','declined'].includes(opp.applicationStatus)) {
    const alreadyShown = opp.roundHistory?.some(r => r.roundType === opp.nextRoundType && r.result === 'pending')
    if (!alreadyShown) {
      steps.push({
        key:    'next',
        icon:   '📅',
        label:  `Upcoming: ${opp.nextRoundType}`,
        date:   opp.nextRoundDate,
        detail: opp.nextRoundVenue ? `📍 ${opp.nextRoundVenue}` : 'Prepare well!',
        status: 'upcoming',
        color:  'bg-violet-400'
      })
    }
  }

  // Final outcome
  if (['offered','accepted'].includes(opp.applicationStatus)) {
    steps.push({
      key:    'offer',
      icon:   '🎊',
      label:  opp.applicationStatus === 'accepted' ? 'Offer Accepted' : 'Offer Received',
      date:   null,
      detail: opp.salary ? `Package: ${opp.salary}` : 'Congratulations!',
      status: 'done',
      color:  'bg-emerald-500'
    })
  } else if (opp.applicationStatus === 'rejected') {
    steps.push({
      key:    'rejected',
      icon:   '❌',
      label:  'Not Selected',
      date:   null,
      detail: 'Application was not successful at this stage. Keep going!',
      status: 'failed',
      color:  'bg-red-400'
    })
  }

  if (steps.length === 0) return null

  return (
    <div>
      {steps.map((step, idx) => (
        <div key={step.key} className="flex gap-3 mb-0 last:mb-0">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-sm shrink-0`}>
              {step.icon}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-0.5 flex-1 mt-1 min-h-[20px] mb-1 ${
                step.status === 'done' ? 'bg-green-300'
                : step.status === 'failed' ? 'bg-red-200'
                : 'bg-gray-200'
              }`} />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className={`text-sm font-semibold ${
                step.status === 'done'     ? 'text-slate-800'
                : step.status === 'failed'   ? 'text-red-600'
                : step.status === 'upcoming' ? 'text-violet-700'
                : 'text-slate-600'
              }`}>{step.label}</p>
              {step.date && (
                <span className="text-xs text-slate-400">
                  {format(new Date(step.date), 'dd MMM yyyy, hh:mm a')}
                </span>
              )}
            </div>
            {step.detail && (
              <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
            )}
            {step.result === 'passed' && (
              <span className="inline-block mt-1 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">Cleared ✓</span>
            )}
            {step.status === 'upcoming' && step.date && (() => {
              const d = differenceInDays(new Date(step.date), new Date())
              return d >= 0 ? (
                <span className="inline-block mt-1 text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-full">
                  {d === 0 ? 'Today!' : d === 1 ? 'Tomorrow!' : `${d} days away`}
                </span>
              ) : null
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const OpportunityDetail = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [opp, setOpp]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [optingIn, setOptingIn]     = useState(false)
  const [rematching, setRematching] = useState(false)

  useEffect(() => { fetchOpportunity() }, [id])

  const fetchOpportunity = async () => {
    setLoading(true)
    try {
      const res = await opportunityAPI.getById(id)
      setOpp(res.data.data.opportunity)
    } catch {
      toast.error('Failed to load opportunity')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleOptIn = async () => {
    if (opp.isOptedIn) return
    setOptingIn(true)
    try {
      const res = await opportunityAPI.optIn(id)
      setOpp(res.data.data.opportunity)
      toast.success(`Opted in to ${opp.companyName}!`)
    } catch { toast.error('Failed to opt in') }
    finally { setOptingIn(false) }
  }

  const handleRematch = async () => {
    setRematching(true)
    try {
      const res = await opportunityAPI.rematchOne(id)
      setOpp(res.data.data.opportunity)
      toast.success('Skill match recalculated!')
    } catch { toast.error('Rematch failed') }
    finally { setRematching(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
      </div>
    )
  }
  if (!opp) return null

  const matchColors   = getMatchColor(opp.matchScore || 0)
  const isEligible    = opp.eligibilityResult?.isEligible ?? false
  const isShortlisted = opp.isShortlisted
  const isOffered     = ['offered','accepted'].includes(opp.applicationStatus)
  const isRejected    = opp.applicationStatus === 'rejected'
  const email         = opp.emailId || {}

  const deadline      = opp.deadline ? new Date(opp.deadline) : null
  const daysLeft      = deadline ? differenceInDays(deadline, new Date()) : null

  const statusLabel = {
    not_applied: 'Not Applied', applied: 'Applied', shortlisted: 'Shortlisted',
    test_scheduled: 'Test Scheduled', interview_scheduled: 'Interview Scheduled',
    offered: 'Offered', rejected: 'Rejected', accepted: 'Accepted', declined: 'Declined'
  }
  const statusColor = {
    not_applied: 'bg-slate-100 text-slate-600', applied: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-green-100 text-green-700', test_scheduled: 'bg-violet-100 text-violet-700',
    interview_scheduled: 'bg-indigo-100 text-indigo-700', offered: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600', accepted: 'bg-green-100 text-green-800',
    declined: 'bg-gray-100 text-gray-500'
  }

  const hasJourney = opp.isOptedIn || opp.isShortlisted

  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* Back */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 font-medium">
          <ArrowLeft size={16} /> Back
        </button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-sm text-slate-400 truncate">{opp.companyName}</span>
      </div>

      {/* ── HEADER CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">

        {/* Top accent line — green if shortlisted, red if not eligible, blue otherwise */}
        <div className={`h-1 w-full rounded-full mb-5 ${
          isOffered     ? 'bg-gradient-to-r from-emerald-400 to-green-500'
          : isRejected    ? 'bg-red-300'
          : isShortlisted ? 'bg-gradient-to-r from-green-400 to-emerald-500'
          : isEligible    ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
          : 'bg-red-200'
        }`} />

        {/* Company name + badges */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{opp.companyName}</h1>
              {opp.isDreamCompany && (
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Star size={9} /> Dream
                </span>
              )}
              {isShortlisted && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Trophy size={9} /> Shortlisted
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">{opp.jobRole}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 ${statusColor[opp.applicationStatus] || 'bg-slate-100 text-slate-600'}`}>
            {statusLabel[opp.applicationStatus] || opp.applicationStatus}
          </span>
        </div>

        {/* Key info row */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
          {opp.salary && <span className="font-semibold text-emerald-600 text-sm">💰 {opp.salary}</span>}
          {opp.location && <span>📍 {opp.location}</span>}
          {opp.workMode && <span>🏢 {opp.workMode}</span>}
          {opp.jobType && <span className="capitalize">📋 {opp.jobType === 'fulltime' ? 'Full Time' : 'Internship'}</span>}
          {deadline && (
            <span className={daysLeft !== null && daysLeft <= 2 ? 'text-red-500 font-semibold' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-600' : ''}>
              📅 {format(deadline, 'dd MMM yyyy')}
              {daysLeft !== null && daysLeft >= 0 && ` · ${daysLeft === 0 ? 'Today!' : daysLeft + 'd left'}`}
              {daysLeft !== null && daysLeft < 0 && ' · Passed'}
            </span>
          )}
        </div>

        {/* Received from email — single location, no duplicate */}
        {email.date && (
          <div className="flex items-center justify-between flex-wrap gap-2 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail size={12} />
              Received {format(new Date(email.date), 'dd MMM yyyy, hh:mm a')}
              {email.subject && <span className="italic truncate max-w-[200px]">· "{email.subject}"</span>}
            </div>
            {email.messageId && (
              <button
                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`, '_blank')}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <ExternalLink size={11} /> View Email
              </button>
            )}
          </div>
        )}

        {/* Bond warning */}
        {opp.bondYears && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
            <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Bond: </span>
              {opp.bondYears} year{opp.bondYears > 1 ? 's' : ''} required.
              {opp.bondAmount && ` Penalty: ${opp.bondAmount}`}
            </p>
          </div>
        )}

        {/* Offer banner */}
        {isOffered && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 font-medium">
            🎊 Congratulations! You received an offer from {opp.companyName}!
          </div>
        )}

        {/* Eligibility result — prominent, no collapse */}
        <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 ${isEligible ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {isEligible
            ? <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            : <XCircle    size={16} className="text-red-500 shrink-0"     />}
          <span className={`text-sm font-semibold ${isEligible ? 'text-emerald-700' : 'text-red-600'}`}>
            {isEligible ? 'You are Eligible for this role' : 'You are Not Eligible for this role'}
          </span>
          {!isEligible && opp.eligibilityResult?.failedReasons?.[0] && (
            <span className="text-xs text-red-500 ml-1">— {opp.eligibilityResult.failedReasons[0]}</span>
          )}
        </div>

        {/* Single action row — no duplicates */}
        <div className="flex items-center gap-2 mt-4">
          {isEligible ? (
            <button onClick={handleOptIn} disabled={opp.isOptedIn || optingIn}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                opp.isOptedIn
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}>
              {optingIn ? <Loader2 size={14} className="animate-spin" />
                : opp.isOptedIn ? <><CheckCircle size={14} />Opted In</>
                : <><ClipboardCheck size={14} />Opt In</>}
            </button>
          ) : (
            <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
              <AlertTriangle size={14} /> Not Eligible
            </span>
          )}
          {opp.applyLink && (
            <a href={opp.applyLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium transition-all">
              <Link2 size={14} /> Apply Link
            </a>
          )}
          {isShortlisted && (
            <button onClick={() => navigate('/community')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all ml-auto">
              <Users size={14} /> Join Community
            </button>
          )}
        </div>
      </div>

      {/* ── JOURNEY TIMELINE — only if user has taken action ── */}
      {hasJourney && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-50 text-indigo-600"><Clock size={16} /></div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Your Journey</h2>
            </div>
            {opp.currentRound > 0 && (
              <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-full font-semibold">
                Round {opp.currentRound}
              </span>
            )}
          </div>
          <JourneyTimeline opp={opp} />
        </div>
      )}

      {/* ── SHORTLIST DETAILS — only if shortlisted ── */}
      {isShortlisted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-green-600" />
            <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Shortlist Details</h2>
          </div>
          {(opp.detectionSource || opp.matchedField) && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-green-700 font-medium">Detected via:</span>
              <span className="text-xs bg-white border border-green-200 text-green-800 font-semibold px-3 py-1 rounded-full">
                {opp.detectionSource || opp.matchedField}
              </span>
            </div>
          )}
          {opp.nextRoundType && (
            <div className="bg-white border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 font-semibold mb-2">NEXT ROUND</p>
              <p className="text-sm font-bold text-slate-800">{opp.nextRoundType}</p>
              {opp.nextRoundDate && (
                <p className="text-xs text-slate-500 mt-1">
                  📅 {format(new Date(opp.nextRoundDate), 'dd MMM yyyy, hh:mm a')}
                  {(() => {
                    const d = differenceInDays(new Date(opp.nextRoundDate), new Date())
                    return d >= 0 ? <span className="ml-2 font-semibold text-violet-600">({d === 0 ? 'Today!' : d === 1 ? 'Tomorrow!' : `${d} days away`})</span> : null
                  })()}
                </p>
              )}
              {opp.nextRoundVenue && <p className="text-xs text-slate-500 mt-1">📍 {opp.nextRoundVenue}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── JOB DETAILS ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-slate-50 text-indigo-600"><Briefcase size={16} /></div>
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Job Details</h2>
        </div>
        <InfoRow label="Batch Year"      value={opp.batchYear} />
        <InfoRow label="Degree Required" value={opp.degreeRequired} />
        {opp.jobDescription && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-2">Job Description</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{opp.jobDescription}</p>
          </div>
        )}
      </div>

      {/* ── ELIGIBILITY BREAKDOWN ── */}
      {opp.eligibilityResult && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-xl bg-slate-50 ${isEligible ? 'text-emerald-600' : 'text-red-500'}`}>
              {isEligible ? <CheckCircle size={16} /> : <XCircle size={16} />}
            </div>
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Eligibility Breakdown</h2>
          </div>
          <CheckRow label="CGPA"
            required={opp.eligibilityResult.cgpaCheck?.required}
            userValue={opp.eligibilityResult.cgpaCheck?.userValue}
            passed={opp.eligibilityResult.cgpaCheck?.passed ?? true} suffix=" / 10" />
          <CheckRow label="10th %"
            required={opp.eligibilityResult.tenthCheck?.required}
            userValue={opp.eligibilityResult.tenthCheck?.userValue}
            passed={opp.eligibilityResult.tenthCheck?.passed ?? true} suffix="%" />
          <CheckRow label="12th %"
            required={opp.eligibilityResult.twelfthCheck?.required}
            userValue={opp.eligibilityResult.twelfthCheck?.userValue}
            passed={opp.eligibilityResult.twelfthCheck?.passed ?? true} suffix="%" />
          <CheckRow label="Active Backlogs"
            required={opp.eligibilityResult.backlogCheck?.required}
            userValue={opp.eligibilityResult.backlogCheck?.userValue}
            passed={opp.eligibilityResult.backlogCheck?.passed ?? true} />
          {opp.eligibilityResult.departmentCheck?.required?.length > 0 && (
            <CheckRow label="Department"
              required={Array.isArray(opp.eligibilityResult.departmentCheck.required)
                ? opp.eligibilityResult.departmentCheck.required.join(', ')
                : opp.eligibilityResult.departmentCheck.required}
              userValue={opp.eligibilityResult.departmentCheck.userValue}
              passed={opp.eligibilityResult.departmentCheck.passed} />
          )}
          <CheckRow label="Degree"
            required={opp.eligibilityResult.degreeCheck?.required}
            userValue={opp.eligibilityResult.degreeCheck?.userValue}
            passed={opp.eligibilityResult.degreeCheck?.passed ?? true} />
        </div>
      )}

      {/* ── SKILL MATCH ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-50 text-indigo-600"><Tag size={16} /></div>
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Skill Match</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold ${matchColors.text}`}>{opp.matchScore || 0}%</span>
            <button onClick={handleRematch} disabled={rematching}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all">
              {rematching ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Recalculate
            </button>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full ${matchColors.bar} rounded-full`} style={{ width: `${opp.matchScore || 0}%` }} />
        </div>
        {opp.matchedSkills?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 font-medium mb-2">✓ You have these</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.matchedSkills.map(s => <SkillChip key={s} label={s} variant="matched" />)}
            </div>
          </div>
        )}
        {opp.missingSkills?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 font-medium mb-2">✗ Missing skills</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.missingSkills.map(s => <SkillChip key={s} label={s} variant="missing" />)}
            </div>
            <p className="text-xs text-slate-400 mt-2 italic">💡 Learn these to improve your score</p>
          </div>
        )}
        {opp.goodToHaveSkills?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 font-medium mb-2">~ Good to have</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.goodToHaveSkills.map(s => <SkillChip key={s} label={s} variant="good" />)}
            </div>
          </div>
        )}
        {opp.techStack?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">🛠 Tech Stack Mentioned</p>
            <div className="flex flex-wrap gap-1.5">
              {opp.techStack.map(s => <span key={s} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{s}</span>)}
            </div>
          </div>
        )}
        {opp.applySuggestionReason && (
          <p className="text-xs text-slate-500 italic border-l-2 border-indigo-300 pl-3 mt-4">{opp.applySuggestionReason}</p>
        )}
      </div>

      {/* ── PREP LINKS ── */}
      {opp.preparationLinks?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-slate-50 text-indigo-600"><Award size={16} /></div>
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Prepare for This Company</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {opp.preparationLinks.map(link => (
              <a key={link.title} href={link.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 px-3 py-2.5 rounded-xl transition-all">
                <ExternalLink size={12} className="shrink-0" />
                <span className="truncate">{link.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── EMAIL CONTENT — at bottom, no duplicate view button ── */}
      {(email.snippet || email.textBody) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-50 text-indigo-600"><FileText size={16} /></div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Email Content</h2>
            </div>
            {email.messageId && (
              <button
                onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`, '_blank')}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
                <ExternalLink size={11} /> Open in Gmail
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {email.snippet || (email.textBody?.slice(0, 600) + (email.textBody?.length > 600 ? '...' : ''))}
          </p>
        </div>
      )}

    </div>
  )
}

export default OpportunityDetail