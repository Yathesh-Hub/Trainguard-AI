import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('trainguard_token'))
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(localStorage.getItem('trainguard_theme') || 'light')

  useEffect(() => {
    // Apply dark class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('trainguard_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('trainguard_token')
      const storedUser = localStorage.getItem('trainguard_user')

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser))
          setToken(storedToken)
          // Verify with backend
          const res = await authApi.getMe()
          setUser(res.data)
          localStorage.setItem('trainguard_user', JSON.stringify(res.data))
        } catch (err) {
          console.warn('Session verification failed, logging out:', err)
          logout()
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      // 1. If Supabase is live, sign in through Supabase client as well
      if (isLiveSupabaseConfigured()) {
        try {
          await supabase.auth.signInWithPassword({ email, password })
        } catch (sbErr) {
          console.warn('Supabase JS direct auth warning:', sbErr.message)
        }
      }

      // 2. Authenticate through FastAPI backend (verifies JWT & roles)
      const res = await authApi.login({ email, password })
      const { access_token, user: userData } = res.data

      setToken(access_token)
      setUser(userData)
      localStorage.setItem('trainguard_token', access_token)
      localStorage.setItem('trainguard_user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Login failed'
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (formData) => {
    setLoading(true)
    try {
      if (isLiveSupabaseConfigured()) {
        try {
          await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.full_name,
                role: formData.role
              }
            }
          })
        } catch (sbErr) {
          console.warn('Supabase JS direct signup warning:', sbErr.message)
        }
      }

      const res = await authApi.register(formData)
      const { access_token, user: userData } = res.data

      setToken(access_token)
      setUser(userData)
      localStorage.setItem('trainguard_token', access_token)
      localStorage.setItem('trainguard_user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Registration failed'
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (isLiveSupabaseConfigured()) {
        await supabase.auth.signOut()
      }
    } catch (e) {
      // ignore
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('trainguard_token')
    localStorage.removeItem('trainguard_user')
  }

  const isAdmin = () => user?.role === 'admin'
  const isCentreManager = () => user?.role === 'centre_manager'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        isAdmin,
        isCentreManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
