import React, { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

// Layout
import DashboardLayout from './components/layout/DashboardLayout'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ConnectGmail from './pages/auth/ConnectGmail'

// Public pages
import Home from './pages/Home'
import About from './pages/About'

// Main pages
import Dashboard from './pages/Dashboard'
import MyApplications from './pages/MyApplications'
import Deadlines from './pages/Deadlines'
import Community from './pages/Community'
import Profile from './pages/Profile'

// Opportunity detail page — full extracted mail view
import OpportunityDetail from './pages/OpportunityDetail'

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Google OAuth Callback Handler
const GoogleCallbackHandler = () => {
  const { refreshUser } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search)
      const gmailConnected = params.get('gmail')
      const error = params.get('error')

      if (error) {
        window.location.href = '/connect-gmail?error=' + error
        return
      }

      if (gmailConnected === 'connected') {
        await refreshUser()
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/connect-gmail'
      }
    }
    handleCallback()
  }, [location, refreshUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Connecting Gmail...</p>
        <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
      </div>
    </div>
  )
}

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading SPEI...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route — redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading SPEI...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// NotFound page
const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-gray-600 text-lg mb-6">Page not found</p>
        <a
          href="/dashboard"
          className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

// App Inner
const AppInner = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>

        <Route
          path="/"
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          }
        />

        <Route path="/about" element={<About />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route path="/auth/callback" element={<GoogleCallbackHandler />} />

        <Route
          path="/connect-gmail"
          element={
            <ProtectedRoute>
              <ConnectGmail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Opportunity detail page — full extracted mail view */}
        <Route
          path="/opportunity/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <OpportunityDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/applied"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyApplications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/deadlines"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Deadlines />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Community />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Community />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />

      </Routes>
    </>
  )
}

// Main App
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppInner />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '10px',
                padding: '12px 16px'
              },
              success: {
                duration: 3000,
                iconTheme: { primary: '#16A34A', secondary: '#fff' }
              },
              error: {
                duration: 5000,
                iconTheme: { primary: '#DC2626', secondary: '#fff' }
              }
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </Router>
  )
}

export default App