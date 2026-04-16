import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, List, ChevronLeft, ChevronRight, Bell, BellOff,
  CheckCircle, RefreshCw, AlertCircle, Search, ArrowRight
} from 'lucide-react'
import {
  format, differenceInDays, isSameDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isToday
} from 'date-fns'
import toast from 'react-hot-toast'
import { opportunityAPI } from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import SkeletonCard from '../components/ui/SkeletonCard'

const DeadlineBadge = ({ deadline }) => {
  if (!deadline) return null
  const daysLeft = differenceInDays(new Date(deadline), new Date())
  if (daysLeft < 0)
    return <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Expired</span>
  if (daysLeft === 0)
    return <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-bold animate-pulse">Today!</span>
  if (daysLeft <= 2)
    return <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-bold">{daysLeft}d left — Urgent!</span>
  if (daysLeft <= 7)
    return <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">{daysLeft}d left</span>
  return <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{daysLeft}d left</span>
}

const DeadlineItem = ({ opportunity, bellToggles, onBellToggle, onOptIn }) => {
  const navigate = useNavigate()
  const [isOptingIn, setIsOptingIn] = useState(false)
  const isBellOn = bellToggles[opportunity._id] !== false

  const handleOptIn = async () => {
    if (opportunity.isOptedIn) return
    setIsOptingIn(true)
    try {
      await opportunityAPI.optIn(opportunity._id)
      toast.success(`Opted in for ${opportunity.companyName}!`)
      if (onOptIn) onOptIn(opportunity._id)
    } catch (error) {
      toast.error('Failed to opt in')
    } finally {
      setIsOptingIn(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-shadow">
      {/* Left: company + role */}
      <div className="flex-1 min-w-[150px]">
        <p className="font-semibold text-gray-900 text-sm">{opportunity.companyName}</p>
        <p className="text-xs text-gray-500 mt-0.5">{opportunity.jobRole}</p>
        {opportunity.salary && (
          <p className="text-xs text-green-600 font-medium mt-0.5">💰 {opportunity.salary}</p>
        )}
      </div>

      {/* Center: deadline date */}
      <div className="text-sm text-gray-600 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-gray-400" />
        {opportunity.deadline
          ? format(new Date(opportunity.deadline), 'dd MMM yyyy')
          : 'No date'}
      </div>

      {/* Right: badge + actions */}
      <div className="flex items-center gap-2">
        <DeadlineBadge deadline={opportunity.deadline} />

        {/* Bell toggle */}
        <button
          onClick={() => onBellToggle(opportunity._id)}
          className={`p-1.5 rounded-lg transition-colors ${
            isBellOn
              ? 'text-accent bg-blue-50 hover:bg-blue-100'
              : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
          }`}
          title={isBellOn ? 'Mute reminder' : 'Enable reminder'}
        >
          {isBellOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
        </button>

        {/* Opt in */}
        {opportunity.isOptedIn ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Applied
          </span>
        ) : (
          <button
            onClick={handleOptIn}
            disabled={isOptingIn}
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isOptingIn ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            Opt In
          </button>
        )}

        {/* View details */}
        <button
          onClick={() => navigate(`/opportunity/${opportunity._id}`)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          Details <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

const Deadlines = () => {
  const [view, setView] = useState('list')
  const [opportunities, setOpportunities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [bellToggles, setBellToggles] = useState({})
  const [showExpired, setShowExpired] = useState(false)
  const [search, setSearch] = useState('')

  // fetchDeadlines passes search to backend
  // Backend returns eligible + not opted in only (already filtered in controller)
  const fetchDeadlines = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await opportunityAPI.getDeadlines({
        search: search.trim() || undefined
      })
      setOpportunities(response.data.data.opportunities || [])
    } catch (error) {
      toast.error('Failed to fetch deadlines')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => fetchDeadlines(), 300)
    return () => clearTimeout(timer)
  }, [fetchDeadlines])

  const handleBellToggle = (id) => {
    setBellToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleOptIn = (id) => {
    setOpportunities((prev) =>
      prev.map((opp) => (opp._id === id ? { ...opp, isOptedIn: true } : opp))
    )
  }

  const now = new Date()
  const groupOpportunities = () => {
    const today = [], thisWeek = [], nextWeek = [], later = [], expired = []
    opportunities.forEach((opp) => {
      if (!opp.deadline) return
      const d = new Date(opp.deadline)
      const daysLeft = differenceInDays(d, now)
      if (daysLeft < 0) expired.push(opp)
      else if (isSameDay(d, now)) today.push(opp)
      else if (daysLeft <= 7) thisWeek.push(opp)
      else if (daysLeft <= 14) nextWeek.push(opp)
      else later.push(opp)
    })
    return { today, thisWeek, nextWeek, later, expired }
  }

  const groups = groupOpportunities()

  const SectionHeader = ({ title, count, color }) => (
    <div className="flex items-center gap-2 mb-3">
      <h2 className={`text-sm font-semibold ${color}`}>{title}</h2>
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )

  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }

  const getDeadlinesForDate = (date) =>
    opportunities.filter((opp) => opp.deadline && isSameDay(new Date(opp.deadline), date))

  const calendarDays = getCalendarDays()
  const selectedDateOpps = selectedDate ? getDeadlinesForDate(selectedDate) : []

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deadlines</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Eligible opportunities with upcoming deadlines — not yet opted in
          </p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Calendar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies or roles..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white placeholder-gray-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <EmptyState
            icon={Calendar}
            title="No deadlines found"
            description="Eligible opportunities with upcoming deadlines will appear here. Sync your Gmail to get started."
            actionLabel="Go to Dashboard"
            onAction={() => (window.location.href = '/dashboard')}
          />
        </div>
      ) : view === 'list' ? (
        // LIST VIEW
        <div className="space-y-6">
          {groups.today.length > 0 && (
            <div>
              <SectionHeader title="⚡ Due Today" count={groups.today.length} color="text-red-600" />
              <div className="space-y-3">
                {groups.today.map((opp) => (
                  <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                ))}
              </div>
            </div>
          )}
          {groups.thisWeek.length > 0 && (
            <div>
              <SectionHeader title="🔥 This Week" count={groups.thisWeek.length} color="text-amber-600" />
              <div className="space-y-3">
                {groups.thisWeek.map((opp) => (
                  <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                ))}
              </div>
            </div>
          )}
          {groups.nextWeek.length > 0 && (
            <div>
              <SectionHeader title="📅 Next Week" count={groups.nextWeek.length} color="text-blue-600" />
              <div className="space-y-3">
                {groups.nextWeek.map((opp) => (
                  <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                ))}
              </div>
            </div>
          )}
          {groups.later.length > 0 && (
            <div>
              <SectionHeader title="🗓️ Later" count={groups.later.length} color="text-green-600" />
              <div className="space-y-3">
                {groups.later.map((opp) => (
                  <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                ))}
              </div>
            </div>
          )}
          {groups.expired.length > 0 && (
            <div>
              <button
                onClick={() => setShowExpired((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-3"
              >
                <AlertCircle className="w-4 h-4" />
                {showExpired ? 'Hide' : 'Show'} Expired ({groups.expired.length})
                <ChevronRight className={`w-4 h-4 transition-transform ${showExpired ? 'rotate-90' : ''}`} />
              </button>
              {showExpired && (
                <div className="space-y-3 opacity-60">
                  {groups.expired.map((opp) => (
                    <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // CALENDAR VIEW
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h2 className="text-base font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)
                const deadlinesOnDay = getDeadlinesForDate(day)
                const hasDeadline = deadlinesOnDay.length > 0
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(selectedDate && isSameDay(day, selectedDate) ? null : day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all duration-150 p-1 ${
                      !isCurrentMonth ? 'opacity-30' : ''
                    } ${
                      isSelected ? 'bg-primary text-white'
                      : isCurrentDay ? 'bg-accent text-white font-bold'
                      : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-xs font-medium">{format(day, 'd')}</span>
                    {hasDeadline && (
                      <div className="flex gap-0.5 mt-0.5">
                        {deadlinesOnDay.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected || isCurrentDay ? 'bg-white' : 'bg-red-500'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Deadlines on {format(selectedDate, 'dd MMMM yyyy')}
              </h3>
              {selectedDateOpps.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white rounded-xl p-4 border border-gray-100">
                  No deadlines on this date.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateOpps.map((opp) => (
                    <DeadlineItem key={opp._id} opportunity={opp} bellToggles={bellToggles} onBellToggle={handleBellToggle} onOptIn={handleOptIn} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Deadlines