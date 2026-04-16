import React, { useState, useEffect } from 'react'
import {
  Lock, Mail, Phone, Bell, Trash2, LogOut,
  Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw,
  Shield, Smartphone, Chrome
} from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, subtitle, children, danger = false }) => (
  <div className={`w-full bg-white rounded-xl border shadow-sm overflow-hidden ${danger ? 'border-red-200' : 'border-gray-100'}`}>
    <div className={`px-6 py-4 border-b ${danger ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-indigo-600'}`} />
        <div>
          <h2 className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-gray-800'}`}>{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
)

// ── Toggle row ────────────────────────────────────────────────────────────────
const ToggleRow = ({ label, description, checked, onChange, disabled = false }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
    <div className="flex-1 pr-4">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
)

// ── Main Settings page ────────────────────────────────────────────────────────
const Settings = () => {
  const { user, logout } = useAuth()

  // Settings state
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Change password
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false })
  const [pwLoading, setPwLoading] = useState(false)

  // Contact
  const [contact, setContact] = useState({ personalEmail: '', whatsappNumber: '' })
  const [contactLoading, setContactLoading] = useState(false)

  // Notification toggles
  const [notifLoading, setNotifLoading] = useState(false)

  // Delete account
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.get()
        const s = res.data.data
        setSettings(s)
        setContact({
          personalEmail:  s.personalEmail  || '',
          whatsappNumber: s.whatsappNumber || ''
        })
      } catch {
        toast.error('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // ── Change password ──────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.new.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setPwLoading(true)
    try {
      await settingsAPI.changePassword({
        currentPassword: passwords.current,
        newPassword:     passwords.new
      })
      toast.success('Password changed successfully')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  // ── Update contact ───────────────────────────────────────────────────────────
  const handleUpdateContact = async (e) => {
    e.preventDefault()
    setContactLoading(true)
    try {
      const res = await settingsAPI.updateContact(contact)
      setSettings((prev) => ({ ...prev, ...contact }))
      toast.success('Contact details updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update contact details')
    } finally {
      setContactLoading(false)
    }
  }

  // ── Notification toggle ──────────────────────────────────────────────────────
  const handleNotifToggle = async (key, value) => {
    setNotifLoading(true)
    const payload = {}

    // Top-level toggles
    if (key === 'notifEmail')    payload.notifEmail    = value
    if (key === 'notifWhatsApp') payload.notifWhatsApp = value
    // Per-event toggles
    if (['shortlist','offer','deadline','rejected','newMatch'].includes(key)) {
      payload[`notif${key.charAt(0).toUpperCase() + key.slice(1)}`] = value
    }

    try {
      await settingsAPI.updateNotifications(payload)
      setSettings((prev) => {
        if (key === 'notifEmail' || key === 'notifWhatsApp') {
          return { ...prev, [key]: value }
        }
        return {
          ...prev,
          notifPreferences: { ...prev.notifPreferences, [key]: value }
        }
      })
    } catch {
      toast.error('Failed to update notification preferences')
    } finally {
      setNotifLoading(false)
    }
  }

  // ── Disconnect Gmail ─────────────────────────────────────────────────────────
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail? This will stop automatic email sync.')) return
    try {
      await settingsAPI.disconnectGmail()
      setSettings((prev) => ({ ...prev, gmail: { isConnected: false, email: null } }))
      toast.success('Gmail disconnected')
    } catch {
      toast.error('Failed to disconnect Gmail')
    }
  }

  // ── Delete account ───────────────────────────────────────────────────────────
  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    if (!deletePassword) {
      toast.error('Enter your password to confirm deletion')
      return
    }
    setDeleteLoading(true)
    try {
      await settingsAPI.deleteAccount({ password: deletePassword })
      toast.success('Account deleted')
      logout()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const prefs = settings?.notifPreferences || {}

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, notifications, and preferences</p>
      </div>

      {/* ── Change Password ──────────────────────────────────────────────── */}
      <Section icon={Lock} title="Change Password" subtitle="Update your login password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { key: 'current', label: 'Current Password',  show: 'current' },
            { key: 'new',     label: 'New Password',       show: 'new'     },
            { key: 'confirm', label: 'Confirm New Password', show: 'new'   }
          ].map(({ key, label, show }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={showPasswords[show] ? 'text' : 'password'}
                  value={passwords[key]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
                {(key === 'current' || key === 'new') && (
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, [show]: !p[show] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords[show] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {pwLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {pwLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* ── Contact Details ──────────────────────────────────────────────── */}
      <Section icon={Mail} title="Contact Details" subtitle="Update your personal email and WhatsApp number">
        <form onSubmit={handleUpdateContact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Personal Email</label>
            <input
              type="email"
              value={contact.personalEmail}
              onChange={(e) => setContact((c) => ({ ...c, personalEmail: e.target.value }))}
              placeholder="your@personal-email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400 mt-1">Used for shortlist detection in emails</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={contact.whatsappNumber}
                onChange={(e) => setContact((c) => ({ ...c, whatsappNumber: e.target.value }))}
                placeholder="+919876543210"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Include country code (e.g. +91 for India)</p>
          </div>

          <button
            type="submit"
            disabled={contactLoading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {contactLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {contactLoading ? 'Saving...' : 'Save Contact Details'}
          </button>
        </form>
      </Section>

      {/* ── Notification Preferences ─────────────────────────────────────── */}
      <Section icon={Bell} title="Notification Preferences" subtitle="Choose how and when you receive alerts">

        {/* Channel toggles */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Notification Channels</p>
          <div className="bg-gray-50 rounded-lg px-4 py-1 divide-y divide-gray-100">
            <ToggleRow
              label="Email Notifications"
              description="Receive alerts to your registered email"
              checked={settings?.notifEmail ?? true}
              onChange={(val) => handleNotifToggle('notifEmail', val)}
              disabled={notifLoading}
            />
            <ToggleRow
              label="WhatsApp Notifications"
              description={settings?.whatsappNumber ? `Alerts to ${settings.whatsappNumber}` : 'Add WhatsApp number in Contact Details first'}
              checked={settings?.notifWhatsApp ?? false}
              onChange={(val) => handleNotifToggle('notifWhatsApp', val)}
              disabled={notifLoading || !settings?.whatsappNumber}
            />
          </div>
        </div>

        {/* Per-event toggles */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Alert Events</p>
          <div className="bg-gray-50 rounded-lg px-4 py-1 divide-y divide-gray-100">
            <ToggleRow
              label="🎉 Shortlisted"
              description="When you're detected as shortlisted at a company"
              checked={prefs.shortlist ?? true}
              onChange={(val) => handleNotifToggle('shortlist', val)}
              disabled={notifLoading}
            />
            <ToggleRow
              label="🏆 Offer Received"
              description="When an offer letter is detected in your email"
              checked={prefs.offer ?? true}
              onChange={(val) => handleNotifToggle('offer', val)}
              disabled={notifLoading}
            />
            <ToggleRow
              label="📅 Deadline Reminder"
              description="1 day before application deadlines"
              checked={prefs.deadline ?? true}
              onChange={(val) => handleNotifToggle('deadline', val)}
              disabled={notifLoading}
            />
            <ToggleRow
              label="❌ Rejection Alert"
              description="When a rejection is detected from a company"
              checked={prefs.rejected ?? true}
              onChange={(val) => handleNotifToggle('rejected', val)}
              disabled={notifLoading}
            />
            <ToggleRow
              label="✨ New Match"
              description="When a new eligible opportunity with ≥70% skill match is found"
              checked={prefs.newMatch ?? false}
              onChange={(val) => handleNotifToggle('newMatch', val)}
              disabled={notifLoading}
            />
          </div>
        </div>
      </Section>

      {/* ── Gmail ────────────────────────────────────────────────────────── */}
      <Section icon={Chrome} title="Gmail Connection" subtitle="Manage your connected Gmail account">
        {settings?.gmail?.isConnected ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Connected</p>
                <p className="text-xs text-gray-500">{settings.gmail.email}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnectGmail}
              className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Gmail
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Not Connected</p>
                <p className="text-xs text-gray-500">Connect Gmail to enable automatic email sync</p>
              </div>
            </div>
            <a
              href="/connect-gmail"
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Chrome className="w-4 h-4" />
              Connect Gmail
            </a>
          </div>
        )}
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <Section icon={Trash2} title="Danger Zone" subtitle="Permanent actions — cannot be undone" danger>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Delete Account</p>
              <p className="text-xs text-gray-500">
                Permanently deletes your account, all emails, opportunities, and data.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              ⚠️ This will permanently delete your account and all associated data. This cannot be undone.
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleteLoading}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword('') }}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  )
}

export default Settings