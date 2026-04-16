import React, { useState, useEffect } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

const DashboardLayout = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('spei_sidebar_collapsed')
    return stored === 'true'
  })

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('spei_sidebar_collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen((prev) => !prev)
  }

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false)
  }

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <Header onMobileMenuToggle={handleMobileMenuToggle} />

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={handleMobileSidebarClose}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main content area */}
      <main
        className={`pt-16 min-h-screen bg-gray-50 transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'md:ml-16' : 'md:ml-60'}`}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout