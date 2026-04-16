import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('spei_token'))
  const [isLoading, setIsLoading] = useState(true)

  const navigate = useNavigate()

  // On mount: if token exists, fetch profile
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('spei_token')
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authAPI.getProfile()
        if (response.data && response.data.data && response.data.data.user) {
          setUser(response.data.data.user)
          setToken(storedToken)
        } else {
          localStorage.removeItem('spei_token')
          localStorage.removeItem('spei_user')
          setToken(null)
          setUser(null)
        }
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('spei_token')
          localStorage.removeItem('spei_user')
          setToken(null)
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Login
  const login = useCallback(async (loginEmail, password) => {
    try {
      const response = await authAPI.login({ loginEmail, password })
      const { token: newToken, user: newUser } = response.data.data

      localStorage.setItem('spei_token', newToken)
      localStorage.setItem('spei_user', JSON.stringify(newUser))

      setToken(newToken)
      setUser(newUser)

      toast.success(`Welcome back, ${newUser.name.split(' ')[0]}!`)

      // Redirect based on Gmail connection status
      if (!newUser.googleAccount || !newUser.googleAccount.isConnected) {
        navigate('/connect-gmail')
      } else {
        navigate('/dashboard')
      }

      return { success: true }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
      return { success: false, message }
    }
  }, [navigate])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('spei_token')
    localStorage.removeItem('spei_user')
    localStorage.removeItem('spei_last_sync')
    setToken(null)
    setUser(null)
    navigate('/login')
    toast.success('Logged out successfully')
  }, [navigate])

  // Update profile
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateProfile(data)
      const updatedUser = response.data.data.user
      setUser(updatedUser)
      localStorage.setItem('spei_user', JSON.stringify(updatedUser))
      return { success: true, user: updatedUser }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
      return { success: false, message }
    }
  }, [])

  // Refresh user profile from server
  const refreshUser = useCallback(async () => {
    try {
      const response = await authAPI.getProfile()
      if (response.data && response.data.data && response.data.data.user) {
        const freshUser = response.data.data.user
        setUser(freshUser)
        localStorage.setItem('spei_user', JSON.stringify(freshUser))
        return freshUser
      }
    } catch (error) {
      console.error('Refresh user error:', error.message)
    }
    return null
  }, [])

  const isAuthenticated = !!token && !!user

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateProfile,
    refreshUser,
    setUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext