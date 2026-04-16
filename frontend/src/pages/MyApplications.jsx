import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, Search, SlidersHorizontal, ArrowRight,
  ChevronDown, Users, CheckCircle, XCircle, Clock,
  Plus, Edit3, MapPin, Calendar, Star
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import { opportunityAPI } from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import SkeletonCard from '../components/ui/SkeletonCard'
import Badge from '../components/ui/Badge'

// ── Stage pipeline ────────────────────────────────────────────────────────────
const PIPELINE = [
  { key: 'applied',             label: 'Applied'    },
  { key: 'shortlisted',         label: 'Shortlisted' },
  { key: 'test_scheduled',      label: 'Test'        },
  { key: 'interview_scheduled', label: 'Interview'   },
  { key: 'offered',             label: 'Offer'       }
]

const StatusPipeline = ({ currentStatus }) => {
  const isRejected = currentStatus === 'rejected'
  const isDeclined = currentStatus === 'declined'
  const idx = PIPELINE.findIndex((s) => s.key === currentStatus)
  return (
    <div className="overflow-x-auto py-1 no-scrollbar">
      <div className="flex items-center min-w-max">
        {PIPELINE.map((stage, i) => {
          const isActive = stage.key === currentStatus
          const isPassed = !isRejected && !isDeclined && i < idx
          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center gap-0.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1'
                  : isPassed ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
                }`}>
                  {isPassed ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] whitespace-nowrap font-medium ${
                  isActive ? 'text-indigo-600' : isPassed ? 'text-green-600' : 'text-gray-400'
                }`}>{stage.label}</span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`h-0.5 w-7 mx-1 ${!isRejected && !isDeclined && i < idx ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
        {isRejected && (
          <div className="flex items-center ml-2">
            <div className="h-0.5 w-6 bg-red-200" />
            <div className="flex flex-col items-center gap-0.5 ml-0">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">✕</div>
              <span className="text-[10px] text-red-500 font-medium">Rejected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Round history timeline ────────────────────────────────────────────────────
const RoundTimeline = ({ roundHistory, currentRound }) => {
  if (!roundHistory || roundHistory.length === 0) return null
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Round History</p>
      <div className="space-y-2">
        {roundHistory.map((round, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
              round.result === 'passed'  ? 'bg-green-100 text-green-600'
              : round.result === 'failed' ? 'bg-red-100 text-red-500'
              : 'bg-gray-100 text-gray-400'
            }`}>
              {round.result === 'passed' ? '✓' : round.result === 'failed' ? '✕' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-800">{round.roundType}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  round.result === 'passed'  ? 'bg-green-50 text-green-600'
                  : round.result === 'failed' ? 'bg-red-50 text-red-500'
                  : 'bg-amber-50 text-amber-600'
                }`}>
                  {round.result === 'pending' ? 'Upcoming' : round.result}
                </span>
                {round.source === 'manual' && (
                  <span className="text-xs text-gray-400 italic">manual</span>
                )}
              </div>
              {round.roundDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  📅 {format(new Date(round.roundDate), 'dd MMM yyyy, hh:mm a')}
                </p>
              )}
              {round.venue && (
                <p className="text-xs text-gray-400">📍 {round.venue}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Manual Round Update Modal ─────────────────────────────────────────────────
const ManualRoundModal = ({ opportunity, onClose, onSave }) => {
  const [form, setForm] = useState({
    roundType: '',
    roundDate: '',
    roundTime: '',
    venue: '',
    result: 'pending',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.roundType) { toast.error('Round type is required'); return }
    setSaving(true)
    try {
      const roundDate = form.roundDate
        ? new Date(`${form.roundDate}${form.roundTime ? 'T' + form.roundTime : 'T00:00'}`)
        : null

      const newRound = {
        roundType:  form.roundType,
        roundDate:  roundDate,
        venue:      form.venue || null,
        result:     form.result,
        notes:      form.notes || null,
        source:     'manual',
        detectedAt: new Date()
      }

      // Update via API — add to roundHistory and update nextRound fields
      const updateData = {
        roundHistory: [...(opportunity.roundHistory || []), newRound],
        currentRound: (opportunity.currentRound || 0) + 1
      }
      if (form.result === 'pending' && roundDate) {
        updateData.nextRoundType  = form.roundType
        updateData.nextRoundDate  = roundDate
        updateData.nextRoundVenue = form.venue || null
      }

      const res = await opportunityAPI.updateStatus(opportunity._id, opportunity.applicationStatus, updateData)
      toast.success('Round added successfully')
      onSave(res.data.data.opportunity)
      onClose()
    } catch (err) {
      toast.error('Failed to save round')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Add Round Manually</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Got round info via WhatsApp or call? Add it here.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Round Type *</label>
            <select value={form.roundType} onChange={(e) => setForm({ ...form, roundType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Select type</option>
              <option>Aptitude Test</option>
              <option>Technical Interview</option>
              <option>HR Interview</option>
              <option>Group Discussion</option>
              <option>Coding Round</option>
              <option>Manager Round</option>
              <option>Final Round</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
              <input type="date" value={form.roundDate} onChange={(e) => setForm({ ...form, roundDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Time</label>
              <input type="time" value={form.roundTime} onChange={(e) => setForm({ ...form, roundTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Venue / Meeting Link</label>
            <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="e.g. Lab 3, Block A or https://meet.google.com/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Result</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="pending">Upcoming / Pending</option>
              <option value="passed">Passed ✓</option>
              <option value="failed">Failed ✕</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional info..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Save Round
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status color map ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  not_applied:          'bg-gray-100 text-gray-600',
  applied:              'bg-blue-100 text-blue-700',
  shortlisted:          'bg-green-100 text-green-700',
  test_scheduled:       'bg-yellow-100 text-yellow-700',
  interview_scheduled:  'bg-orange-100 text-orange-700',
  offered:              'bg-emerald-100 text-emerald-700',
  rejected:             'bg-red-100 text-red-600',
  accepted:             'bg-green-100 text-green-800',
  declined:             'bg-gray-100 text-gray-500'
}

const STATUS_LABELS = {
  not_applied: 'Opted In', applied: 'Applied', shortlisted: 'Shortlisted',
  test_scheduled: 'Test Scheduled', interview_scheduled: 'Interview Scheduled',
  offered: 'Offered', rejected: 'Rejected', accepted: 'Accepted', declined: 'Declined'
}

const ALL_STATUSES = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

// ── Application Card ──────────────────────────────────────────────────────────
const ApplicationCard = ({ opportunity: initialOpp, onUpdate }) => {
  const navigate  = useNavigate()
  const [opp, setOpp]                   = useState(initialOpp)
  const [expanded, setExpanded]         = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [isUpdating, setIsUpdating]     = useState(false)
  const [currentStatus, setCurrentStatus] = useState(initialOpp.applicationStatus)

  const isRejected = currentStatus === 'rejected'
  const isOffered  = currentStatus === 'offered' || currentStatus === 'accepted'
  const isShortlisted = opp.isShortlisted

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setIsUpdating(true)
    try {
      await opportunityAPI.updateStatus(opp._id, newStatus)
      setCurrentStatus(newStatus)
      toast.success('Status updated')
      if (onUpdate) onUpdate(opp._id, newStatus)
    } catch { toast.error('Failed to update status') }
    finally { setIsUpdating(false) }
  }

  const handleRoundSaved = (updatedOpp) => {
    setOpp(updatedOpp)
    if (onUpdate) onUpdate(updatedOpp._id, updatedOpp.applicationStatus)
  }

  const borderColor = isOffered ? 'border-l-emerald-500' : isRejected ? 'border-l-red-400' : isShortlisted ? 'border-l-green-500' : 'border-l-indigo-400'

  return (
    <>
      {showModal && <ManualRoundModal opportunity={opp} onClose={() => setShowModal(false)} onSave={handleRoundSaved} />}

      <div className={`w-full bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow border-l-4 ${borderColor} border-gray-100`}>
        <div className="p-5">

          {/* Top — company name + status badge + type */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900 truncate">{opp.companyName}</h3>
                {opp.isDreamCompany && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">⭐ Dream</span>}
                {isShortlisted && <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">✓ Shortlisted</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{opp.jobRole}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[currentStatus] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[currentStatus] || currentStatus}
              </span>
              <Badge variant={opp.jobType === 'fulltime' ? 'success' : 'info'}>
                {opp.jobType === 'fulltime' ? 'Full Time' : 'Internship'}
              </Badge>
            </div>
          </div>

          {/* Detection source — shown for shortlisted */}
          {opp.detectionSource && (
            <div className="mt-2 mb-2 flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-1.5">
              <span>🎯 Detected via:</span>
              <span className="font-semibold">{opp.detectionSource}</span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2 mb-3">
            {opp.salary   && <span className="text-emerald-600 font-semibold">💰 {opp.salary}</span>}
            {opp.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>}
            {opp.deadline && (
              <span className={`flex items-center gap-1 ${differenceInDays(new Date(opp.deadline), new Date()) <= 3 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                <Calendar className="w-3 h-3" />
                Deadline: {format(new Date(opp.deadline), 'dd MMM yyyy')}
              </span>
            )}
          </div>

          {/* Pipeline */}
          <div className="mb-3 overflow-x-auto">
            <StatusPipeline currentStatus={currentStatus} />
          </div>

          {/* Next round banner */}
          {opp.nextRoundType && (
            <div className="mb-3 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700">
              <span className="font-semibold">Next: </span>{opp.nextRoundType}
              {opp.nextRoundDate && <span> · {format(new Date(opp.nextRoundDate), 'dd MMM yyyy, hh:mm a')}</span>}
              {opp.nextRoundVenue && <span className="text-violet-500"> · {opp.nextRoundVenue}</span>}
            </div>
          )}

          {/* Offer banner */}
          {isOffered && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium">
              🎉 Offer received from {opp.companyName}!
            </div>
          )}

          {/* Rejection banner */}
          {isRejected && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-500">
              ❌ Not selected at this stage. Keep going!
            </div>
          )}

          {/* Expanded: round history */}
          {expanded && (
            <RoundTimeline roundHistory={opp.roundHistory} currentRound={opp.currentRound} />
          )}

          {/* Bottom actions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 mt-3">

            {/* Status updater */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Update:</label>
              <div className="relative flex-1">
                <select value={currentStatus} onChange={handleStatusChange} disabled={isUpdating}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 disabled:opacity-50 cursor-pointer appearance-none pr-7">
                  {ALL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {isUpdating
                  ? <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
                  : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />}
              </div>
            </div>

            {/* Round history toggle */}
            {opp.roundHistory?.length > 0 && (
              <button onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <Clock className="w-3 h-3" />
                {expanded ? 'Hide' : `Rounds (${opp.roundHistory.length})`}
              </button>
            )}

            {/* Add round manually */}
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3 h-3" /> Add Round
            </button>

            {/* Community — only if shortlisted */}
            {isShortlisted && (
              <button onClick={() => navigate('/community')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                <Users className="w-3 h-3" /> Community
              </button>
            )}

            <button onClick={() => navigate(`/opportunity/${opp._id}`)}
              className="ml-auto flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              View Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyApplications = () => {
  const [opportunities, setOpportunities] = useState([])
  const [isLoading, setIsLoading]         = useState(true)
  const [pagination, setPagination]       = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch]               = useState('')
  const [activeSort, setActiveSort]       = useState('latest')
  const [statusFilter, setStatusFilter]   = useState('all')

  const fetchApplications = useCallback(async (page = 1) => {
    try {
      setIsLoading(true)
      const params = {
        isOptedIn: true, page, limit: 20,
        search: search.trim() || undefined,
        sort:   activeSort !== 'latest' ? activeSort : undefined
      }
      if (statusFilter !== 'all') params.applicationStatus = statusFilter

      const res = await opportunityAPI.getAll(params)
      const { opportunities: opps, pagination: pag } = res.data.data
      setOpportunities((prev) => page === 1 ? opps : [...prev, ...opps])
      setPagination(pag)
    } catch { toast.error('Failed to fetch applications') }
    finally { setIsLoading(false) }
  }, [search, activeSort, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => fetchApplications(1), 300)
    return () => clearTimeout(t)
  }, [fetchApplications])

  const handleUpdate = useCallback((id, newStatus) => {
    setOpportunities((prev) => prev.map((o) => o._id === id ? { ...o, applicationStatus: newStatus } : o))
  }, [])

  const sortOptions = [
    { key: 'latest',     label: 'Latest'       },
    { key: 'deadline',   label: 'Deadline'     },
    { key: 'matchScore', label: 'Match Score'  }
  ]

  const statusFilters = [
    { value: 'all',                 label: 'All'         },
    { value: 'applied',             label: 'Applied'     },
    { value: 'shortlisted',         label: 'Shortlisted' },
    { value: 'test_scheduled',      label: 'Test'        },
    { value: 'interview_scheduled', label: 'Interview'   },
    { value: 'offered',             label: 'Offered'     },
    { value: 'rejected',            label: 'Rejected'    }
  ]

  // Section grouping for better UX
  const active  = opportunities.filter((o) => !['offered','accepted','rejected','declined'].includes(o.applicationStatus))
  const offers  = opportunities.filter((o) => ['offered','accepted'].includes(o.applicationStatus))
  const closed  = opportunities.filter((o) => ['rejected','declined'].includes(o.applicationStatus))

  const SectionLabel = ({ label, count, color }) => count > 0 ? (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className={`text-sm font-semibold ${color}`}>{label}</span>
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  ) : null

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track every company — from registration to offer</p>
        </div>
        {pagination.total > 0 && (
          <div className="bg-indigo-600 text-white text-sm font-bold px-3.5 py-1.5 rounded-full">{pagination.total}</div>
        )}
      </div>

      {/* ── STICKY filter bar ── */}
      <div className="sticky top-16 z-30 bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or roles..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-gray-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            {sortOptions.map((opt) => (
              <button key={opt.key} onClick={() => setActiveSort(opt.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${activeSort === opt.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {statusFilters.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${statusFilter === f.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && opportunities.length === 0 ? (
        <div className="space-y-4">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState icon={CheckCircle} title="No applications yet"
            description="Opt in to opportunities from the Dashboard to track your placement journey here."
            actionLabel="Go to Dashboard" onAction={() => (window.location.href = '/dashboard')} />
        </div>
      ) : statusFilter !== 'all' ? (
        // When filter active — flat list
        <div className="space-y-4">
          {opportunities.map((opp) => <ApplicationCard key={opp._id} opportunity={opp} onUpdate={handleUpdate} />)}
        </div>
      ) : (
        // Default — grouped sections
        <div>
          <SectionLabel label="🔵 Active" count={active.length} color="text-indigo-600" />
          {active.map((opp) => <div key={opp._id} className="mb-4"><ApplicationCard opportunity={opp} onUpdate={handleUpdate} /></div>)}

          <SectionLabel label="🟢 Offers" count={offers.length} color="text-emerald-600" />
          {offers.map((opp) => <div key={opp._id} className="mb-4"><ApplicationCard opportunity={opp} onUpdate={handleUpdate} /></div>)}

          <SectionLabel label="⚫ Closed" count={closed.length} color="text-gray-500" />
          <div className={closed.length > 0 ? 'opacity-70' : ''}>
            {closed.map((opp) => <div key={opp._id} className="mb-4"><ApplicationCard opportunity={opp} onUpdate={handleUpdate} /></div>)}
          </div>
        </div>
      )}

      {pagination.page < pagination.pages && (
        <div className="flex justify-center mt-6">
          <button onClick={() => fetchApplications(pagination.page + 1)} disabled={isLoading}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Loading...</> : `Load More (${pagination.total - opportunities.length} remaining)`}
          </button>
        </div>
      )}
      {opportunities.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">Showing {opportunities.length} of {pagination.total} applications</p>
      )}
    </div>
  )
}

export default MyApplications