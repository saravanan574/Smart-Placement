import React, { useState, useEffect, useCallback } from 'react'
import {
  LayoutGrid, CheckCircle, ClipboardCheck, Star,
  AlertCircle, Mail, Search, RefreshCw, SlidersHorizontal
} from 'lucide-react'
import { opportunityAPI } from '../services/api'
import useSync from '../hooks/useSync'
import OpportunityCard from '../components/opportunity/OpportunityCard'
import SkeletonCard from '../components/ui/SkeletonCard'
import EmptyState from '../components/ui/EmptyState'

const StatCard = ({ icon: Icon, iconColor, bgColor, value, label }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  </div>
)

const Dashboard = () => {
  const { isSyncing, getLastSyncedText, triggerSync } = useSync()

  const [stats, setStats]                 = useState(null)
  const [opportunities, setOpportunities] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingOpps, setIsLoadingOpps]   = useState(true)
  const [pagination, setPagination]         = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch]                 = useState('')
  const [activeFilter, setActiveFilter]     = useState('all')
  const [activeType, setActiveType]         = useState('all')
  const [activeSort, setActiveSort]         = useState('latest')

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true)
      const res = await opportunityAPI.getStats()
      setStats(res.data.data)
    } catch (e) {
      console.error('Failed to fetch stats:', e.message)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  const fetchOpportunities = useCallback(async (page = 1) => {
    try {
      setIsLoadingOpps(true)
      const params = {
        page, limit: 20,
        sort:   activeSort   !== 'latest' ? activeSort   : undefined,
        type:   activeType   !== 'all'    ? activeType   : undefined,
        search: search.trim() || undefined
      }
      if (activeFilter !== 'all') params.filter = activeFilter

      const res = await opportunityAPI.getAll(params)
      const { opportunities: opps, pagination: pag } = res.data.data
      if (page === 1) setOpportunities(opps)
      else            setOpportunities((prev) => [...prev, ...opps])
      setPagination(pag)
    } catch (e) {
      console.error('Failed to fetch opportunities:', e.message)
    } finally {
      setIsLoadingOpps(false)
    }
  }, [activeFilter, activeType, activeSort, search])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    const t = setTimeout(() => fetchOpportunities(1), 300)
    return () => clearTimeout(t)
  }, [fetchOpportunities])

  const handleSync = async () => {
    const result = await triggerSync()
    if (result) { await fetchStats(); await fetchOpportunities(1) }
  }

  const handleOpportunityUpdate = useCallback((updated) => {
    setOpportunities((prev) => prev.map((o) => o._id === updated._id ? { ...o, ...updated } : o))
    fetchStats()
  }, [fetchStats])

  const filterPills  = [
    { key: 'all', label: 'All' }, { key: 'eligible', label: 'Eligible' },
    { key: 'recommended', label: 'Recommended' }, { key: 'applied', label: 'Applied' }
  ]
  const typePills    = [
    { key: 'all', label: 'All' }, { key: 'internship', label: 'Internship' },
    { key: 'fulltime', label: 'Full Time' }
  ]
  const sortOptions  = [
    { key: 'latest', label: 'Latest' }, { key: 'deadline', label: 'Deadline Soon' },
    { key: 'matchScore', label: 'Match Score' }, { key: 'salary', label: 'Salary' }
  ]
  const statCards = [
    { icon: LayoutGrid,     iconColor: 'text-blue-600',   bgColor: 'bg-blue-50',   value: stats?.total,             label: 'Total Opportunities' },
    { icon: CheckCircle,    iconColor: 'text-green-600',  bgColor: 'bg-green-50',  value: stats?.eligible,          label: 'Eligible'            },
    { icon: ClipboardCheck, iconColor: 'text-indigo-600', bgColor: 'bg-indigo-50', value: stats?.applied,           label: 'Applied'             },
    { icon: Star,           iconColor: 'text-amber-600',  bgColor: 'bg-amber-50',  value: stats?.shortlisted,       label: 'Shortlisted'         },
    { icon: AlertCircle,    iconColor: 'text-red-600',    bgColor: 'bg-red-50',    value: stats?.deadlinesThisWeek, label: 'Deadlines This Week' }
  ]

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            {isSyncing
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />Syncing your Gmail...</>
              : <>{getLastSyncedText()}</>}
          </p>
        </div>
        <button onClick={handleSync} disabled={isSyncing}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:block">Sync Gmail</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {isLoadingStats
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div><div className="h-6 bg-gray-200 rounded w-10 mb-1" /><div className="h-3 bg-gray-200 rounded w-20" /></div>
                </div>
              </div>
            ))
          : statCards.map((card, i) => <StatCard key={i} {...card} />)}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or roles..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         bg-white placeholder-gray-400" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterPills.map((pill) => (
              <button key={pill.key} onClick={() => setActiveFilter(pill.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                            ${activeFilter === pill.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {pill.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Type:</span>
            <div className="flex gap-1">
              {typePills.map((pill) => (
                <button key={pill.key} onClick={() => setActiveType(pill.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                              ${activeType === pill.key ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Sort:</span>
            <div className="flex gap-1 flex-wrap">
              {sortOptions.map((opt) => (
                <button key={opt.key} onClick={() => setActiveSort(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                              ${activeSort === opt.key ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities — SINGLE COLUMN always */}
      {isLoadingOpps && opportunities.length === 0 ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <EmptyState icon={Mail} title="No opportunities yet"
            description="Sync your Gmail to automatically find and analyze placement opportunities."
            actionLabel="Sync Now" onAction={handleSync} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp._id} opportunity={opp} onUpdate={handleOpportunityUpdate} />
            ))}
          </div>
          {pagination.page < pagination.pages && (
            <div className="flex justify-center mt-6">
              <button onClick={() => fetchOpportunities(pagination.page + 1)} disabled={isLoadingOpps}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700
                           px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                {isLoadingOpps
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Loading...</>
                  : `Load More (${pagination.total - opportunities.length} remaining)`}
              </button>
            </div>
          )}
          <p className="text-center text-xs text-gray-400 mt-4">
            Showing {opportunities.length} of {pagination.total} opportunities
          </p>
        </>
      )}
    </div>
  )
}

export default Dashboard