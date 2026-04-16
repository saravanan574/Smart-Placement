import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star, Users, ExternalLink, Search,
  ArrowRight, Trophy, XCircle, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { opportunityAPI } from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import SkeletonCard from '../components/ui/SkeletonCard'

// ── Section label helper ──────────────────────────────────────────────────────
const sectionFor = (status) => {
  if (['offered', 'accepted'].includes(status)) return 'offered'
  if (status === 'rejected')                    return 'rejected'
  return 'active'
}

// ── Single shortlisted card ───────────────────────────────────────────────────
const ShortlistedCard = ({ opportunity, section }) => {
  const navigate = useNavigate()

  const borderColor =
    section === 'offered'  ? 'border-l-emerald-500'
    : section === 'rejected' ? 'border-l-red-400'
    : 'border-l-green-500'

  const stageBadge = {
    shortlisted:          { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Shortlisted'         },
    test_scheduled:       { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'Test Scheduled'      },
    interview_scheduled:  { bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Interview Scheduled' },
    offered:              { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Offer Received 🎉'   },
    accepted:             { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Accepted ✅'          },
    rejected:             { bg: 'bg-red-100',     text: 'text-red-600',     label: 'Rejected'            }
  }[opportunity.applicationStatus] || { bg: 'bg-gray-100', text: 'text-gray-600', label: opportunity.applicationStatus }

  return (
    <div className={`w-full bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
      <div className="p-5">

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-xl font-bold text-gray-900">{opportunity.companyName}</h3>
              {opportunity.isDreamCompany && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ Dream</span>
              )}
            </div>
            <p className="text-sm text-gray-500">{opportunity.jobRole}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant={opportunity.jobType === 'fulltime' ? 'success' : 'info'}>
              {opportunity.jobType === 'fulltime' ? 'Full Time' : 'Internship'}
            </Badge>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageBadge.bg} ${stageBadge.text}`}>
              {stageBadge.label}
            </span>
          </div>
        </div>

        {/* Shortlist badge */}
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
            <Star className="w-3 h-3 fill-green-500" />
            Shortlisted
          </span>
        </div>

        {/* Detected via */}
        {opportunity.matchedField && (
          <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
            <span className="font-semibold">Detected via:</span> {opportunity.matchedField}
          </div>
        )}

        {/* Next round info */}
        {opportunity.nextRoundType && (
          <div className="mb-3 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-xs text-violet-700">
            <span className="font-semibold">Next Round:</span> {opportunity.nextRoundType}
            {opportunity.nextRoundDate && (
              <span className="ml-2">on {format(new Date(opportunity.nextRoundDate), 'dd MMM yyyy')}</span>
            )}
            {opportunity.nextRoundVenue && (
              <span className="ml-2 text-violet-600">— {opportunity.nextRoundVenue}</span>
            )}
          </div>
        )}

        {/* Rejection message */}
        {section === 'rejected' && (
          <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
            ❌ You were shortlisted but the application did not proceed further. Stay motivated!
          </div>
        )}

        {/* Offer congrats */}
        {section === 'offered' && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 font-semibold">
            🎉 Congratulations! You received an offer from {opportunity.companyName}!
          </div>
        )}

        {/* AI suggestion */}
        {opportunity.applySuggestionReason && (
          <p className="text-xs italic text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            💡 {opportunity.applySuggestionReason}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
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
            🕒 Detected: {format(new Date(opportunity.updatedAt), 'dd MMM yyyy')}
          </span>
        </div>

        {/* Prep links */}
        {opportunity.preparationLinks?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prepare with</p>
            <div className="flex flex-wrap gap-2">
              {opportunity.preparationLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  {link.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Join Community
          </button>

          {opportunity.applyLink && (
            <a
              href={opportunity.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Apply Now
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
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

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count, color }) => (
  <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${color}`}>
    <Icon className="w-5 h-5" />
    <h2 className="text-base font-bold text-gray-800">{title}</h2>
    <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
      {count}
    </span>
  </div>
)

// ── Main Shortlisted page ─────────────────────────────────────────────────────
const Shortlisted = () => {
  const [opportunities, setOpportunities]   = useState([])
  const [isLoading, setIsLoading]           = useState(true)
  const [pagination, setPagination]         = useState({ total: 0, page: 1, pages: 1 })
  const [search, setSearch]                 = useState('')
  const [sectionFilter, setSectionFilter]   = useState('all')

  const fetchShortlisted = useCallback(async (page = 1) => {
    try {
      setIsLoading(true)
      const response = await opportunityAPI.getAll({
        isShortlisted: true,
        page,
        limit: 50,
        search: search.trim() || undefined
      })
      const { opportunities: opps, pagination: pag } = response.data.data
      setOpportunities((prev) => page === 1 ? opps : [...prev, ...opps])
      setPagination(pag)
    } catch {
      toast.error('Failed to fetch shortlisted opportunities')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => fetchShortlisted(1), 300)
    return () => clearTimeout(timer)
  }, [fetchShortlisted])

  // Split into three buckets
  const active   = opportunities.filter((o) => sectionFor(o.applicationStatus) === 'active')
  const offered  = opportunities.filter((o) => sectionFor(o.applicationStatus) === 'offered')
  const rejected = opportunities.filter((o) => sectionFor(o.applicationStatus) === 'rejected')

  const filtered = (list) => {
    if (sectionFilter === 'all') return list
    return list.filter((o) => sectionFor(o.applicationStatus) === sectionFilter)
  }

  const showActive   = sectionFilter === 'all' || sectionFilter === 'active'
  const showOffered  = sectionFilter === 'all' || sectionFilter === 'offered'
  const showRejected = sectionFilter === 'all' || sectionFilter === 'rejected'

  return (
    <div className="w-full max-w-5xl mx-auto px-0">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Shortlisted</h1>
            {pagination.total > 0 && (
              <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                {pagination.total}
              </span>
            )}
          </div>
          {pagination.total > 0 && (
            <p className="text-sm text-green-600 font-medium mt-1">
              🎉 You have been shortlisted at {pagination.total} compan{pagination.total > 1 ? 'ies' : 'y'}!
            </p>
          )}
        </div>
      </div>

      {/* Congrats banner — shown only when there are active shortlists */}
      {active.length > 0 && (
        <div className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="text-3xl">🎉</div>
          <div>
            <p className="font-bold text-green-800">You're doing great!</p>
            <p className="text-sm text-green-700">
              {active.length} active shortlist{active.length > 1 ? 's' : ''}. Join the community to prepare with other shortlisted students.
            </p>
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortlisted companies..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-gray-400"
            />
          </div>

          {/* Section filter chips */}
          <div className="flex gap-1.5">
            {[
              { key: 'all',      label: 'All',          count: opportunities.length },
              { key: 'active',   label: 'Active',       count: active.length        },
              { key: 'offered',  label: 'Offered',      count: offered.length       },
              { key: 'rejected', label: "Didn't Make It", count: rejected.length    }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSectionFilter(f.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  sectionFilter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    sectionFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && opportunities.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            icon={Star}
            title="No shortlists detected yet"
            description="Keep applying! SPEI will automatically detect shortlists from your emails and notify you."
            actionLabel="Go to Dashboard"
            onAction={() => (window.location.href = '/dashboard')}
          />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Active shortlists */}
          {showActive && active.length > 0 && (
            <div>
              <SectionHeader
                icon={Star}
                title="Active Shortlists"
                count={active.length}
                color="border-green-400 text-green-700"
              />
              <div className="space-y-4">
                {filtered(active).map((opp) => (
                  <ShortlistedCard key={opp._id} opportunity={opp} section="active" />
                ))}
              </div>
            </div>
          )}

          {/* Offered */}
          {showOffered && offered.length > 0 && (
            <div>
              <SectionHeader
                icon={Trophy}
                title="Offers Received"
                count={offered.length}
                color="border-emerald-400 text-emerald-700"
              />
              <div className="space-y-4">
                {filtered(offered).map((opp) => (
                  <ShortlistedCard key={opp._id} opportunity={opp} section="offered" />
                ))}
              </div>
            </div>
          )}

          {/* Didn't make it */}
          {showRejected && rejected.length > 0 && (
            <div>
              <SectionHeader
                icon={XCircle}
                title="Didn't Make It"
                count={rejected.length}
                color="border-red-300 text-red-500"
              />
              <div className="space-y-4">
                {filtered(rejected).map((opp) => (
                  <ShortlistedCard key={opp._id} opportunity={opp} section="rejected" />
                ))}
              </div>
            </div>
          )}

          {pagination.page < pagination.pages && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchShortlisted(pagination.page + 1)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading...</>
                  : 'Load More'
                }
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400">
            Showing {opportunities.length} of {pagination.total} shortlisted
          </p>
        </div>
      )}
    </div>
  )
}

export default Shortlisted