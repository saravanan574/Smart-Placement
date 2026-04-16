import { useState, useCallback, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import { emailAPI } from '../services/api'
import toast from 'react-hot-toast'

/**
 * useSync — manages manual Gmail sync with live Socket.io progress
 *
 * Emits syncProgress events from backend during processing.
 * Shows a live toast that updates: "Processing 3 of 47 — TCS"
 * On complete: shows summary toast.
 *
 * Usage:
 *   const { isSyncing, syncProgress, triggerSync, getLastSyncedText } = useSync()
 */
const useSync = () => {
  const { socket }                      = useSocket()
  const [isSyncing, setIsSyncing]       = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  // { current, total, company, subject, done }
  const toastIdRef = useRef(null)

  // Returns a human-readable "last synced" string for Header display
  // e.g. "Last synced: 2 mins ago" or "Last synced: just now"
  const getLastSyncedText = useCallback(() => {
    if (!lastSyncedAt) return 'Not synced yet'
    const diffMs  = Date.now() - lastSyncedAt
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1)  return 'Last synced: just now'
    if (diffMin < 60) return `Last synced: ${diffMin} min${diffMin > 1 ? 's' : ''} ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24)  return `Last synced: ${diffHr} hr${diffHr > 1 ? 's' : ''} ago`
    return 'Last synced: over a day ago'
  }, [lastSyncedAt])

  // Subscribe to syncProgress from this socket session
  // Call once on mount from Dashboard
  const subscribeSyncProgress = useCallback(() => {
    if (!socket) return

    socket.on('syncProgress', (data) => {
      // data = { current, total, subject, company, done }
      setSyncProgress(data)

      if (data.done) {
        // Dismiss live toast and show success
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }
        setIsSyncing(false)
        setSyncProgress(null)
        setLastSyncedAt(Date.now())
        return
      }

      const label = data.company
        ? `Processing ${data.current} of ${data.total} — ${data.company}`
        : `Reading emails... ${data.current} of ${data.total}`

      if (toastIdRef.current) {
        toast.loading(label, { id: toastIdRef.current })
      } else {
        toastIdRef.current = toast.loading(label, {
          duration: Infinity,
          position: 'bottom-right'
        })
      }
    })

    return () => {
      socket.off('syncProgress')
    }
  }, [socket])

  // Trigger manual sync
  const triggerSync = useCallback(async (onComplete) => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncProgress(null)

    toastIdRef.current = toast.loading('Starting sync...', {
      duration: Infinity,
      position: 'bottom-right'
    })

    try {
      const response = await emailAPI.sync()
      const result   = response.data?.data || {}

      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }

      setLastSyncedAt(Date.now())

      if (result.saved > 0 || result.shortlisted > 0) {
        let msg = `✅ Sync complete! ${result.saved} new email${result.saved !== 1 ? 's' : ''}`
        if (result.shortlisted > 0) msg += ` · 🎉 ${result.shortlisted} shortlist${result.shortlisted !== 1 ? 's' : ''} detected`
        toast.success(msg, { duration: 5000 })
      } else {
        toast.success('Sync complete — no new placement emails', { duration: 3000 })
      }

      if (onComplete) onComplete(result)
      return result
    } catch (error) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
      const msg = error.response?.data?.message || 'Sync failed'
      toast.error(msg)
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }, [isSyncing])

  // Progress percentage helper
  const progressPercent = syncProgress
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0

  return {
    isSyncing,
    syncProgress,
    progressPercent,
    triggerSync,
    subscribeSyncProgress,
    getLastSyncedText      // ← was missing, now added
  }
}

export default useSync