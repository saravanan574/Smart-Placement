import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Shield, Lock, Unlink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const ConnectGmail = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const handleConnectGmail = async () => {
    setIsLoading(true)
    try {
      const response = await authAPI.getGoogleAuthUrl()
      const { url } = response.data.data
      window.location.href = url
    } catch (error) {
      toast.error('Failed to get Google auth URL. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const infoPoints = [
    {
      icon: Shield,
      color: 'text-green-600 bg-green-50',
      title: 'Read-only access',
      description: 'We only read placement-related emails. No sending, no modifying.'
    },
    {
      icon: Lock,
      color: 'text-blue-600 bg-blue-50',
      title: 'Secure & encrypted',
      description: 'Your credentials are never stored. We use OAuth2 tokens only.'
    },
    {
      icon: Unlink,
      color: 'text-purple-600 bg-purple-50',
      title: 'Disconnect anytime',
      description: 'You can disconnect Gmail at any time from your Profile page.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Connect Your Gmail
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              {user?.name
                ? `Hi ${user.name.split(' ')[0]}! Connect Gmail to start detecting placement opportunities automatically.`
                : 'Connect Gmail to start detecting placement opportunities automatically.'}
            </p>
          </div>

          {/* Info points */}
          <div className="space-y-3 mb-8">
            {infoPoints.map((point, index) => {
              const Icon = point.icon
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${point.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {point.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {point.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnectGmail}
            disabled={isLoading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm
                       hover:bg-accent transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to Google...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#ffffff"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connect Gmail Account
              </>
            )}
          </button>

          {/* Skip link */}
          <div className="text-center mt-4">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-600 underline
                         transition-colors duration-150"
            >
              Skip for now, I'll connect later
            </button>
          </div>

          {/* Note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            SPEI uses Gmail API with read-only scope.
            <br />
            We never access your password or send emails on your behalf.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ConnectGmail