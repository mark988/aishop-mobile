import { useState, useEffect } from 'react'
import { User, getCurrentUser, getStoredToken, getStoredUser } from '../lib/auth'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refreshAuth = () => {
    console.log('Refreshing auth state...')
    setRefreshTrigger(prev => prev + 1)
  }

  const logout = () => {
    console.log('Logging out user...')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    setUser(null)
    console.log('User logged out successfully')
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        // 首先从本地存储获取用户信息
        const storedUser = getStoredUser()
        const token = getStoredToken()
        
        console.log('Stored user:', storedUser)
        console.log('Token exists:', !!token)
        
        if (token && storedUser) {
          console.log('Validating token with backend...')
          // 验证token是否仍有效并获取最新用户信息
          const currentUser = await getCurrentUser(token)
          console.log('Current user from backend:', currentUser)
          if (currentUser) {
            setUser(currentUser)
            console.log('User authenticated successfully')
          } else {
            console.log('Token validation failed, clearing storage')
            // Token无效，清除本地存储
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            setUser(null)
          }
        } else {
          console.log('No token or stored user found')
          setUser(null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
        console.log('Auth initialization complete')
      }
    }

    initializeAuth()

    // 监听storage变化，实现多标签页同步
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'auth_token') {
        console.log('Storage changed, refreshing auth...')
        setRefreshTrigger(prev => prev + 1)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [refreshTrigger])

  // 暴露刷新方法，这样其他组件可以调用
  // 将refreshAuth暴露给window对象，这样登录后可以直接调用
  useEffect(() => {
    (window as any).__authRefresh = refreshAuth
    return () => {
      delete (window as any).__authRefresh
    }
  }, [])

  const isLoggedIn = Boolean(user)

  return { 
    user, 
    loading, 
    isLoggedIn,
    isLoading: loading,
    refreshAuth,
    logout
  }
}