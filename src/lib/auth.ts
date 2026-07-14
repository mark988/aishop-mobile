const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface User {
  id: string
  email: string
  name: string
  role?: string
  phone?: string
  address?: string
  avatarUrl?: string
  createdAt?: string
  raw_user_meta_data?: {
    address?: string
    avatar_url?: string
    [key: string]: any
  }
}

export interface AuthResponse {
  user?: User
  token?: string
  error?: { message: string }
}

export interface RegisterData {
  name: string
  emailOrPhone: string
  password: string
}

export interface LoginData {
  username: string
  password: string
}

// 注册用户
export const signUp = async (emailOrPhone: string, password: string, name: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        emailOrPhone,
        password
      }),
    })

    const result = await response.json()

    if (result.code === 200 && result.data) {
      // 转换后端用户数据到前端格式
      const backendUser = result.data.user
      const frontendUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        phone: backendUser.phone,
        address: backendUser.address,
        avatarUrl: backendUser.avatarUrl,
        raw_user_meta_data: backendUser.avatarUrl ? {
          avatar_url: backendUser.avatarUrl,
          address: backendUser.address
        } : undefined
      }

      // 存储token和用户信息
      setStoredToken(result.data.token)
      localStorage.setItem('user', JSON.stringify(frontendUser))

      // 触发认证状态刷新
      if ((window as any).__authRefresh) {
        (window as any).__authRefresh()
      }

      return { user: frontendUser, token: result.data.token }
    } else {
      return { error: { message: result.message || '注册失败' } }
    }
  } catch (error: any) {
    console.error('Registration error:', error)
    return { error: { message: error.message || '注册时发生网络错误' } }
  }
}

// 登录
export const signIn = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    console.log('🚀 Attempting login for:', username)
    const params = new URLSearchParams({
      username,
      password
    })

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await response.json()
    console.log('📤 Login response:', result)
    
    if (result.code === 200 && result.data) {
      // 转换后端用户数据到前端格式
      const backendUser = result.data.user
      const frontendUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        phone: backendUser.phone,
        address: backendUser.address,
        avatarUrl: backendUser.avatarUrl,
        raw_user_meta_data: backendUser.avatarUrl ? {
          avatar_url: backendUser.avatarUrl,
          address: backendUser.address
        } : undefined
      }
      
      // 存储token和用户信息
      console.log('💾 Storing token and user info')
      setStoredToken(result.data.token)
      localStorage.setItem('user', JSON.stringify(frontendUser))
      
      // 触发认证状态刷新
      console.log('🔄 Triggering auth refresh...')
      if ((window as any).__authRefresh) {
        (window as any).__authRefresh()
      }
      
      return { user: frontendUser, token: result.data.token }
    } else {
      console.log('❌ Login failed:', result.message)
      return { error: { message: result.message || '登录失败' } }
    }
  } catch (error: any) {
    console.error('❌ Login error:', error)
    return { error: { message: error.message || '登录时发生网络错误' } }
  }
}

// 用户信息缓存和防重复请求机制
let userProfileCache: { user: User | null; timestamp: number; token: string } | null = null
let pendingProfileRequest: Promise<User | null> | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 获取当前用户 - 优化版本，包含缓存和防重复请求
export const getCurrentUser = async (token?: string): Promise<User | null> => {
  try {
    const authToken = token || getStoredToken()
    if (!authToken) {
      console.log('🚫 No auth token available')
      return null
    }

    // 检查缓存是否有效
    if (userProfileCache && 
        userProfileCache.token === authToken &&
        Date.now() - userProfileCache.timestamp < CACHE_DURATION) {
      console.log('🎯 getCurrentUser: 使用缓存的用户信息')
      return userProfileCache.user
    }

    // 如果有正在进行的请求，返回该请求的Promise
    if (pendingProfileRequest) {
      console.log('⏳ getCurrentUser: 等待正在进行的用户信息请求')
      return await pendingProfileRequest
    }

    // 创建新的请求
    pendingProfileRequest = fetchUserProfile(authToken)
    
    try {
      const user = await pendingProfileRequest
      
      // 缓存结果
      userProfileCache = {
        user,
        timestamp: Date.now(),
        token: authToken
      }
      
      return user
    } finally {
      // 清除pending请求状态
      pendingProfileRequest = null
    }
  } catch (error: any) {
    console.error('❌ getCurrentUser: Error:', error)
    pendingProfileRequest = null
    return null
  }
}

// 清除用户缓存（在登出时调用）
export const clearUserCache = () => {
  console.log('🗑️ 清除用户信息缓存')
  userProfileCache = null
  pendingProfileRequest = null
}

// 实际的API调用函数
const fetchUserProfile = async (authToken: string): Promise<User | null> => {
  console.log('🔍 fetchUserProfile: 从API获取用户信息')
  
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  })

  const result = await response.json()
  console.log('👤 fetchUserProfile: Profile response:', result)
  
  if (result.code === 200 && result.data) {
    console.log('✅ fetchUserProfile: Profile fetched successfully')
    // 转换后端用户数据到前端格式
    const backendUser = result.data
    const frontendUser: User = {
      id: backendUser.id,
      email: backendUser.email,
      name: backendUser.name,
      role: backendUser.role,
      phone: backendUser.phone,
      address: backendUser.address,
      avatarUrl: backendUser.avatarUrl,
      raw_user_meta_data: backendUser.avatarUrl ? {
        avatar_url: backendUser.avatarUrl,
        address: backendUser.address
      } : undefined
    }
    return frontendUser
  } else {
    console.log('❌ fetchUserProfile: Profile fetch failed:', result.message)
    // Token可能过期，清除本地存储
    if (result.message?.includes('过期') || result.message?.includes('登录')) {
      removeStoredToken()
      localStorage.removeItem('user')
      clearUserCache()
    }
    return null
  }
}

// 登出
export const signOut = async () => {
  console.log('🚪 signOut: Starting logout process...')
  removeStoredToken()
  localStorage.removeItem('user')
  
  // 清除用户信息缓存
  clearUserCache()
  
  // 触发storage事件以通知AuthContext更新状态
  console.log('📢 signOut: Triggering storage event for auth refresh...')
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'auth_token',
    newValue: null,
    oldValue: localStorage.getItem('auth_token')
  }))
  
  // 也触发user的storage事件
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'user',
    newValue: null,
    oldValue: localStorage.getItem('user')
  }))
  
  console.log('✅ signOut: Logout completed')
  return { error: null }
}

// 本地存储token管理
export const getStoredToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

export const setStoredToken = (token: string): void => {
  localStorage.setItem('auth_token', token)
}

export const removeStoredToken = (): void => {
  localStorage.removeItem('auth_token')
}

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  return !!getStoredToken()
}

// 获取本地存储的用户信息
export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

// 通用的已认证API请求函数
export const authApi = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = getStoredToken()
  
  console.log('🔐 authApi: Making request to:', `${API_BASE_URL}${url}`)
  console.log('🔑 authApi: Token exists:', !!token)
  console.log('🔑 authApi: Token value:', token)
  console.log('🔑 authApi: Authorization header will be:', token ? `Bearer ${token}` : 'empty')
  
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  console.log('🔑 authApi: Final headers:', headers)
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })
  
  console.log('📡 authApi: Response status:', response.status)
  
  const result = await response.json()
  console.log('📤 authApi: Response data:', result)
  
  // Check if token is expired
  if (result.code === 401 || (result.message && result.message.includes('认证失败'))) {
    console.log('🚫 authApi: Token expired, clearing storage')
    removeStoredToken()
    localStorage.removeItem('user')
    throw new Error('认证失败，请重新登录')
  }
  
  return result
}