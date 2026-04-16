import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Menu, RefreshCw, Bell, LogOut, User,
  ChevronDown, Mail, CheckCircle, AlertCircle, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { notificationAPI } from '../../services/api'
import useSync from '../../hooks/useSync'

const Header = ({ onMobileMenuToggle }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const { unreadNotificationCount, resetUnreadCount } = useSocket()
  const { isSyncing, getLastSyncedText, triggerSync } = useSync()
  const location = useLocation()
  const navigate = useNavigate()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setShowMobileNav(false)
  }, [location.pathname])

  // Fetch notifications on dropdown open
  useEffect(() => {
    if (showNotifications && isAuthenticated) {
      setLoadingNotifications(true)
      notificationAPI
        .getAll({ limit: 5 })
        .then((res) => {
          setNotifications(res.data.data.notifications || [])
          resetUnreadCount()
        })
        .catch(() => {})
        .finally(() => setLoadingNotifications(false))
    }
  }, [showNotifications, isAuthenticated, resetUnreadCount])

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const priorityColor = (priority) => {
    if (priority === 'high')   return 'border-l-4 border-red-400 bg-red-50'
    if (priority === 'medium') return 'border-l-4 border-blue-400 bg-blue-50'
    return 'border-l-4 border-gray-300 bg-gray-50'
  }

  const publicNavLinks = [
    { path: '/',      label: 'Home' },
    { path: '/about', label: 'About' }
  ]

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 flex items-center px-4 md:px-6">

      {/* ── LEFT: Logo + Sidebar toggle ── */}
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-primary text-lg">SPEI</span>
        </Link>
      </div>

      {/* ── CENTER: Public nav (unauthenticated only) ── */}
      {!isAuthenticated && (
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {publicNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive(link.path)
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {/* ── RIGHT ── */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">

        {!isAuthenticated ? (
          <>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Login
              </Link>
              <Link to="/register" className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                Get Started
              </Link>
            </div>
            <button
              onClick={() => setShowMobileNav((v) => !v)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {showMobileNav && (
              <div className="absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-gray-100 z-50 py-3 md:hidden">
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block px-6 py-3 text-sm font-medium transition-colors
                                ${isActive(link.path) ? 'text-primary bg-primary/5' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2 px-4 flex gap-2">
                  <Link to="/login" className="flex-1 text-center text-sm font-medium text-gray-700 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors">Login</Link>
                  <Link to="/register" className="flex-1 text-center text-sm font-medium bg-primary text-white py-2 rounded-lg hover:bg-accent transition-colors">Get Started</Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Sync indicator */}
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Sync Gmail"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden md:block">{isSyncing ? 'Syncing...' : getLastSyncedText()}</span>
            </button>

            {/* Gmail connection dot */}
            <div className="relative" title={user?.googleAccount?.isConnected ? `Gmail: ${user.googleAccount.email}` : 'Gmail not connected'}>
              <Mail className="w-4 h-4 text-gray-400" />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${user?.googleAccount?.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-0.5 font-medium">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => { navigate('/profile'); setShowNotifications(false) }} className="text-xs text-primary hover:underline">
                      View all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif._id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${priorityColor(notif.priority)}`}>
                          <div className="flex items-start gap-2">
                            {notif.type === 'shortlist'
                              ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              : <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />}
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {getInitials(user?.name)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.loginEmail}</p>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { navigate('/profile'); setShowUserMenu(false) }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button onClick={() => { logout(); setShowUserMenu(false) }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default Header