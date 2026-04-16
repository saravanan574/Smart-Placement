import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardCheck,
  Calendar, Users, User, LogOut, Settings,
  ChevronLeft, ChevronRight, X, Zap
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard'   },
  { icon: ClipboardCheck,  label: 'My Applications', path: '/applied' },
  { icon: Calendar,        label: 'Deadlines',  path: '/deadlines'   },
  { icon: Users,           label: 'Community',  path: '/community'   }
]

// Bottom nav — Profile + Settings grouped together
const bottomNavItems = [
  { icon: User,     label: 'Profile',  path: '/profile'  },
  { icon: Settings, label: 'Settings', path: '/settings' }
]

// /opportunity/:id is reached from Dashboard — keep Dashboard active
const pathOwnership = {
  '/dashboard': ['/dashboard', '/opportunity']
}

// Tooltip shown only in collapsed state
const Tooltip = ({ label, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                    bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-150 whitespace-nowrap">
      {label}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
    </div>
  </div>
)

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const { logout, user } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const isActive = (path) => {
    if (location.pathname === path) return true
    const owned = pathOwnership[path]
    if (owned) return owned.some((prefix) => location.pathname.startsWith(prefix))
    if (path === '/community') return location.pathname.startsWith('/community')
    return false
  }

  const handleNavClick = (path) => {
    navigate(path)
    if (onClose) onClose()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
    if (onClose) onClose()
  }

  const NavItem = ({ icon: Icon, label, path, onClick, danger = false }) => {
    const active      = path ? isActive(path) : false
    const handleClick = onClick || (() => handleNavClick(path))

    const itemContent = (
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                    transition-colors duration-150
                    ${isCollapsed ? 'justify-center' : ''}
                    ${danger
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      : active
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
          isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'
        }`}>
          {label}
        </span>
      </button>
    )

    return isCollapsed ? <Tooltip label={label}>{itemContent}</Tooltip> : itemContent
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full py-3">

      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-base">SPEI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Desktop: logo + collapse toggle */}
      {!isMobile && (
        <div className={`flex items-center mb-3 px-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-base">SPEI</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* Divider */}
      <div className="my-2 mx-4 border-t border-gray-700" />

      {/* Bottom nav — Profile + Settings */}
      <nav className="flex flex-col gap-0.5 px-2">
        {bottomNavItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        {/* User info strip — hidden when collapsed */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg bg-gray-800/60">
            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.department || user.loginEmail}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="mt-1">
          <NavItem icon={LogOut} label="Logout" path={null} onClick={handleLogout} danger />
        </div>
      </nav>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={`
        hidden md:flex flex-col fixed left-0 top-16 z-40
        h-[calc(100vh-4rem)] bg-sidebar-bg
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}>
        <SidebarContent isMobile={false} />
      </aside>

      {/* ── MOBILE SIDEBAR ── */}
      {/* Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Drawer — transform translate, never display:none */}
      <aside className={`
        md:hidden fixed left-0 top-0 z-50 h-full w-64 bg-sidebar-bg
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent isMobile={true} />
      </aside>
    </>
  )
}

export default Sidebar