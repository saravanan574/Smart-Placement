import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Users, RefreshCw, Search,
  SlidersHorizontal, ArrowRight, ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { opportunityAPI } from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import SkeletonCard from '../components/ui/SkeletonCard'

// ── Stage pipeline strip ─────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'applied',             label: 'Applied'    },
  { key: 'shortlisted',         label: 'Shortlisted' },
  { key: 'test_scheduled',      label: 'Test'        },
  { key: 'interview_scheduled', label: 'Interview'   },
  { key: 'offered',             label: 'Offer'       },
  { key: 'accepted',            label: 'Accepted'    }
]

const StatusPipeline = ({ currentStatus }) => {
  const isRejected = currentStatus === 'rejected'
  const isDeclined = currentStatus === 'declined'
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus)

  return (
    <div className="overflow-x-auto py-1">
      <div className="flex items-center min-w-max gap-0">
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive   = stage.key === currentStatus
          const isPassed   = !isRejected && !isDeclined && index < currentIndex
          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1'
                  : isPassed ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
                }`}>
                  {isPassed ? '✓' : index + 1}
                </div>
                <span className={`text-[10px] whitespace-nowrap font-medium ${
                  isActive  ? 'text-indigo-600'
                  : isPassed ? 'text-green-600'
                  : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </div>
              {index < PIPELINE_STAGES.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 ${
                  !isRejected && !isDeclined && index < currentIndex
                    ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}

        {/* Rejection shown inline after pipeline */}
        {isRejected && (
          <div className="flex items-center ml-2">
            <div className="h-0.5 w-8 bg-red-300" />
            <div className="flex flex-col items-center gap-1 ml-0">
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">✕</div>
              <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Rejected</span>
            </div>
          </div>
        )}
        {isDeclined && (
          <div className="flex items-center ml-2">
            <div className="h-0.5 w-8 bg-gray-300" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">–</div>
              <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">Declined</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Status options for dropdown ───────────────────────────────────────────────
const ALL_STATUSES = [
  { value: 'not_applied',         label: 'Opted In'            },
  { value: 'applied',             label: 'Applied'             },
  { value: 'shortlisted',         label: 'Shortlisted'         },
  { value: 'test_scheduled',      label: 'Test Scheduled'      },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'offered',             label: 'Offered'             },
  { value: 'rejected',            label: 'Rejected'            },
  { value: 'accepted',            label: 'Accepted'            },
  { value: 'declined',            label: 'Declined'            }
]

const statusColor = (status) => {
  const map = {
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
  return map[status] || 'bg-gray-100 text-gray-600'
}

// ── Applied card ──────────────────────────────────────────────────────────────
const AppliedCard = ({ opportunity, onStatusUpdate }) => {
  const navigate = useNavigate()
  const [isUpdating, setIsUpdating]     = useState(false)
  const [currentStatus, setCurrentStatus] = useState(opportunity.applicationStatus)
  const [showPipeline, setShowPipeline] = useState(true)

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setIsUpdating(true)
    try {
      await opportunityAPI.updateStatus(opportunity._id, newStatus)
      setCurrentStatus(newStatus)
      toast.success('Status updated')
      if (onStatusUpdate) onStatusUpdate(opportunity._id, newStatus)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const isRejected = currentStatus === 'rejected'
  const isOffered  = currentStatus === 'offered' || currentStatus === 'accepted'

  return (
    <div className={`w-full bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      isOffered  ? 'border-l-4 border-l-emerald-500 border-gray-100'
      : isRejected ? 'border-l-4 border-l-red-400 border-gray-100'
      : 'border-l-4 border-l-indigo-500 border-gray-100'
    }`}>
      <div className="p-5">

        {/* Top row — company + badges */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900 truncate">{opportunity.companyName}</h3>
              {opportunity.isDreamCompany && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ Dream</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{opportunity.jobRole}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(currentStatus)}`}>
              {ALL_STATUSES.find((s) => s.value === currentStatus)?.label || currentStatus}
            </span>
            <Badge variant={opportunity.jobType === 'fulltime' ? 'success' : 'info'}>
              {opportunity.jobType === 'fulltime' ? 'Full Time' : 'Internship'}
            </Badge>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 mt-2">
          {opportunity.salary && (
            <span className="text-emerald-600 font-semibold">💰 {opportunity.salary}</span>
          )}
          {opportunity.location && <span>📍 {opportunity.location}</span>}
          {opportunity.deadline && (
            <span className="text-orange-600 font-medium">
              📅 Deadline: {format(new Date(opportunity.deadline), 'dd MMM yyyy')}
            </span>
          )}
          <span className="text-gray-400">
            🕒 {format(new Date(opportunity.updatedAt), 'dd MMM yyyy, hh:mm a')}
          </span>
        </div>

        {/* Pipeline toggle */}
        <div className="mb-3">
          <button
            onClick={() => setShowPipeline((p) => !p)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPipeline ? 'rotate-180' : ''}`} />
            {showPipeline ? 'Hide' : 'Show'} progress
          </button>
          {showPipeline && (
            <div className="mt-2 overflow-x-auto">
              <StatusPipeline currentStatus={currentStatus} />
            </div>
          )}
        </div>

        {/* Next round info */}
        {opportunity.nextRoundType && (
          <div className="mb-4 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700">
            <span className="font-semibold">Next Round:</span> {opportunity.nextRoundType}
            {opportunity.nextRoundDate && (
              <span className="ml-2">on {format(new Date(opportunity.nextRoundDate), 'dd MMM yyyy')}</span>
            )}
            {opportunity.nextRoundVenue && (
              <span className="ml-2 text-violet-600">— {opportunity.nextRoundVenue}</span>
            )}
          </div>
        )}

        {/* Rejection reason if any */}
        {isRejected && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
            ❌ Application was not successful at this stage. Keep going — more opportunities await!
          </div>
        )}

        {/* Offer congrats */}
        {isOffered && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-medium">
            🎉 Congratulations! You received an offer from {opportunity.companyName}!
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">

          {/* Status updater */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Update:</label>
            <div className="relative flex-1">
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 disabled:opacity-50 cursor-pointer appearance-none pr-8"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {isUpdating
                ? <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-gray-400 pointer-events-none" />
                : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              }
            </div>
          </div>

          {/* Community button if shortlisted */}
          {(currentStatus === 'shortlisted' || opportunity.isShortlisted) && (
            <button
              onClick={() => navigate('/community')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Community
            </button>
          )}

          <button
            onClick={() => navigate(`/opportunity/${opportunity._id}`)}
            className="ml-auto flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
          >
            View Details <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Applied page ─────────────────────────────────────────────────────────
const Applied = () => {
  const [opportunities, setOpportunities] = useState([])
  const [isLoading, setIsLoading]         = useState(true)
  const [pagination, setPagination]       = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch]               = useState('')
  const [activeSort, setActiveSort]       = useState('latest')
  const [statusFilter, setStatusFilter]   = useState('all')

  const sortOptions = [
    { key: 'latest',     label: 'Latest'        },
    { key: 'deadline',   label: 'Deadline Soon'  },
    { key: 'matchScore', label: 'Match Score'    }
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

  const fetchApplied = useCallback(async (page = 1) => {
    try {
      setIsLoading(true)
      const params = {
        isOptedIn: true,
        page,
        limit: 20,
        search: search.trim() || undefined,
        sort:   activeSort !== 'latest' ? activeSort : undefined
      }
      if (statusFilter !== 'all') params.applicationStatus = statusFilter

      const response = await opportunityAPI.getAll(params)
      const { opportunities: opps, pagination: pag } = response.data.data
      setOpportunities((prev) => page === 1 ? opps : [...prev, ...opps])
      setPagination(pag)
    } catch {
      toast.error('Failed to fetch applications')
    } finally {
      setIsLoading(false)
    }
  }, [search, activeSort, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchApplied(1), 300)
    return () => clearTimeout(timer)
  }, [fetchApplied])

  const handleStatusUpdate = useCallback((id, newStatus) => {
    setOpportunities((prev) =>
      prev.map((opp) => opp._id === id ? { ...opp, applicationStatus: newStatus } : opp)
    )
  }, [])

  return (
    <div className="w-full max-w-5xl mx-auto px-0">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all your opted-in opportunities</p>
        </div>
        {pagination.total > 0 && (
          <div className="bg-indigo-600 text-white text-sm font-bold px-3.5 py-1.5 rounded-full">
            {pagination.total}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or roles..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-gray-400"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Sort:</span>
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setActiveSort(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeSort === opt.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                statusFilter === f.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && opportunities.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            icon={ClipboardCheck}
            title="No applications yet"
            description="Opt in to opportunities from the Dashboard to track your journey here."
            actionLabel="Go to Dashboard"
            onAction={() => (window.location.href = '/dashboard')}
          />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <AppliedCard
                key={opp._id}
                opportunity={opp}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>

          {pagination.page < pagination.pages && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => fetchApplied(pagination.page + 1)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</>
                  : `Load More (${pagination.total - opportunities.length} remaining)`
                }
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            Showing {opportunities.length} of {pagination.total} applications
          </p>
        </>
      )}
    </div>
  )
}

export default Applied