import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, Calendar, ArrowRight, Loader2, Star, AlertTriangle } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import toast from 'react-hot-toast'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import { opportunityAPI } from '../../services/api'

const OpportunityCard = ({ opportunity: initialOpportunity, onUpdate }) => {
  const navigate = useNavigate()
  const [opportunity, setOpportunity] = useState(initialOpportunity)
  const [isOptingIn, setIsOptingIn]   = useState(false)

  const { _id, companyName, jobRole, jobType, location, salary, deadline,
    eligibilityResult, matchScore, applySuggestion, isOptedIn,
    isDreamCompany, isShortlisted, roundDetailsMissing } = opportunity

  const isEligible = eligibilityResult?.isEligible ?? false

  const getDeadlineDisplay = () => {
    if (!deadline) return null
    const daysLeft = differenceInDays(new Date(deadline), new Date())
    const formatted = format(new Date(deadline), 'dd MMM yyyy')
    if (daysLeft < 0)   return <span className="text-gray-400 text-xs line-through">{formatted} — Passed</span>
    if (daysLeft === 0) return <span className="text-red-600 font-bold text-xs animate-pulse">Today!</span>
    if (daysLeft <= 2)  return <span className="text-red-600 font-bold text-xs">{formatted} · {daysLeft}d — Urgent!</span>
    if (daysLeft <= 7)  return <span className="text-amber-600 text-xs">{formatted} · {daysLeft}d left</span>
    return <span className="text-gray-500 text-xs">{formatted} · {daysLeft}d left</span>
  }

  const handleOptIn = async (e) => {
    e.stopPropagation()
    if (isOptedIn || isOptingIn || !isEligible) return
    setIsOptingIn(true)
    try {
      const res = await opportunityAPI.optIn(_id)
      const updated = res.data.data.opportunity
      setOpportunity((prev) => ({ ...prev, isOptedIn: updated.isOptedIn, applicationStatus: updated.applicationStatus }))
      toast.success(`Opted in for ${companyName}!`)
      if (onUpdate) onUpdate(updated)
    } catch { toast.error('Failed to opt in. Please try again.') }
    finally { setIsOptingIn(false) }
  }

  const suggestionBadge = applySuggestion
    ? { apply: <Badge variant="success">✓ APPLY</Badge>, maybe: <Badge variant="warning">~ MAYBE</Badge>, skip: <Badge variant="danger">✗ SKIP</Badge> }[applySuggestion]
    : null

  return (
    <div onClick={() => navigate(`/opportunity/${_id}`)}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all duration-200 hover:shadow-md hover:border-indigo-200 cursor-pointer">

      {/* Row 1 — Company + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 truncate">{companyName}</h3>
          {isDreamCompany && (
            <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold shrink-0">
              <Star className="w-2.5 h-2.5" /> Dream
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={jobType === 'fulltime' ? 'success' : 'info'}>
            {jobType === 'fulltime' ? 'Full Time' : 'Internship'}
          </Badge>
          {suggestionBadge}
        </div>
      </div>

      {/* Row 2 — Role + location + salary */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
        {jobRole   && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-gray-400" />{jobRole}</span>}
        {location  && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{location}</span>}
        {salary    && <span className="font-semibold text-emerald-600 text-xs">💰 {salary}</span>}
      </div>

      {/* Row 3 — Deadline */}
      {deadline && (
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {getDeadlineDisplay()}
        </div>
      )}

      {/* Row 4 — Eligibility + Match score */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          {isEligible
            ? <Badge variant="success">✓ Eligible</Badge>
            : (
              <div>
                <Badge variant="danger">✗ Not Eligible</Badge>
                {eligibilityResult?.failedReasons?.[0] && (
                  <p className="text-xs text-red-500 mt-0.5 leading-tight">{eligibilityResult.failedReasons[0]}</p>
                )}
              </div>
            )}
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs text-gray-500 whitespace-nowrap">{matchScore ?? 0}% match</span>
          <ProgressBar value={matchScore ?? 0} max={100} className="w-16" />
        </div>
      </div>
 {roundDetailsMissing && isShortlisted && (
        <div
          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 cursor-pointer hover:bg-amber-100 transition-all"
          onClick={(e) => { e.stopPropagation(); navigate(`/opportunity/${_id}`) }}
        >
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Round details missing — tap to add</p>
        </div>
      )}
      {/* Row 5 — Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        {isEligible ? (
          <button onClick={handleOptIn} disabled={isOptedIn || isOptingIn}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isOptedIn ? 'bg-green-100 text-green-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            }`}>
            {isOptingIn ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Opting...</>
              : isOptedIn ? 'Opted In ✓' : 'Opt In'}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
            <AlertTriangle className="w-3.5 h-3.5" /> Not Eligible
          </span>
        )}
        <button onClick={() => navigate(`/opportunity/${_id}`)}
          className="ml-auto flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
          Details <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default OpportunityCard