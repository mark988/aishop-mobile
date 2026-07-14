import { useState, useEffect, useCallback, useRef } from 'react'
import { getStoredToken } from '../lib/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface Favorite {
  id: string
  userId: string
  productId: string
  createdAt: string
  product?: {
    id: string
    name: string
    price: number
    image: string
    description?: string
  }
}

/**
 * 优化的收藏功能Hook - 批量检查收藏状态，减少API调用次数
 * 解决首页多次调用 /api/favorites/check 的性能问题
 */
export const useFavoritesOptimized = (userId?: string) => {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 缓存机制 - 避免重复请求
  const cacheRef = useRef<{
    favorites: Favorite[]
    favoriteIds: Set<string>
    timestamp: number
  } | null>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 通用API调用函数
  const authApi = async (endpoint: string, options: RequestInit = {}) => {
    const token = getStoredToken()
    if (!token) {
      throw new Error('未登录')
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code !== 200) {
      throw new Error(result.message || 'API调用失败')
    }

    return result
  }

  // 获取用户所有收藏 - 一次性获取，避免多次调用
  const fetchAllFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([])
      setFavoriteProductIds(new Set())
      return
    }

    // 检查缓存
    if (cacheRef.current && 
        Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setFavorites(cacheRef.current.favorites)
      setFavoriteProductIds(cacheRef.current.favoriteIds)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // 获取所有收藏，不分页
      const result = await authApi('/favorites/list?page=1&size=1000')
      
      const favoritesData = result.data?.items || []
      const favoriteIds = new Set(favoritesData.map((fav: Favorite) => fav.productId))

      // 更新缓存
      cacheRef.current = {
        favorites: favoritesData,
        favoriteIds,
        timestamp: Date.now()
      }

      setFavorites(favoritesData)
      setFavoriteProductIds(favoriteIds)
    } catch (err) {
      console.error('获取收藏列表失败:', err)
      setError(err instanceof Error ? err.message : '获取收藏列表失败')
      setFavorites([])
      setFavoriteProductIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 批量检查商品是否被收藏 - 替代多次调用 /api/favorites/check
  const checkFavoriteStatus = useCallback((productIds: string[]): Record<string, boolean> => {
    const result: Record<string, boolean> = {}
    productIds.forEach(productId => {
      result[productId] = favoriteProductIds.has(productId)
    })
    return result
  }, [favoriteProductIds])

  // 单个商品收藏状态检查
  const isFavorite = useCallback((productId: string): boolean => {
    return favoriteProductIds.has(productId)
  }, [favoriteProductIds])

  // 切换收藏状态
  const toggleFavorite = useCallback(async (productId: string) => {
    if (!userId) {
      throw new Error('未登录')
    }

    try {
      const isCurrentlyFavorite = favoriteProductIds.has(productId)
      
      if (isCurrentlyFavorite) {
        // 取消收藏
        await authApi('/favorites/remove', {
          method: 'DELETE',
          body: JSON.stringify({ productId })
        })
        
        // 更新本地状态
        setFavorites(prev => prev.filter(fav => fav.productId !== productId))
        setFavoriteProductIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(productId)
          return newSet
        })

        // 更新缓存
        if (cacheRef.current) {
          cacheRef.current.favorites = cacheRef.current.favorites.filter(fav => fav.productId !== productId)
          cacheRef.current.favoriteIds.delete(productId)
        }

        return { action: 'removed' as const, isFavorite: false }
      } else {
        // 添加收藏
        const result = await authApi('/favorites/add', {
          method: 'POST',
          body: JSON.stringify({ productId })
        })
        
        const newFavorite = result.data
        
        // 更新本地状态
        setFavorites(prev => [...prev, newFavorite])
        setFavoriteProductIds(prev => new Set([...prev, productId]))

        // 更新缓存
        if (cacheRef.current) {
          cacheRef.current.favorites.push(newFavorite)
          cacheRef.current.favoriteIds.add(productId)
        }

        return { action: 'added' as const, isFavorite: true }
      }
    } catch (err) {
      console.error('切换收藏状态失败:', err)
      throw err
    }
  }, [userId, favoriteProductIds])

  // 清除缓存
  const clearCache = useCallback(() => {
    cacheRef.current = null
  }, [])

  // 刷新收藏列表
  const refreshFavorites = useCallback(() => {
    clearCache()
    fetchAllFavorites()
  }, [clearCache, fetchAllFavorites])

  // 初始化时获取收藏列表
  useEffect(() => {
    if (userId) {
      fetchAllFavorites()
    }
  }, [userId, fetchAllFavorites])

  return {
    favorites,
    favoriteProductIds,
    loading,
    error,
    isFavorite,
    checkFavoriteStatus, // 批量检查功能
    toggleFavorite,
    refreshFavorites,
    clearCache
  }
}