import { useState, useEffect, useCallback } from 'react'
import type { Product } from '../types'
import { authApi } from '../lib/auth'

export interface Favorite {
  id: string
  user_id: string
  product_id: string
  product: Product
  created_at: string
}

export function useFavorites(userId?: string, autoFetch: boolean = true) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 12

  const fetchFavorites = useCallback(async (page?: number) => {
    const targetPage = page || currentPage
    
    try {
      if (!userId) {
        setFavorites([])
        setLoading(false)
        return
      }

      setLoading(true)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No authentication token found, falling back to localStorage')
        // 降级到localStorage
        const favoriteKeys = Object.keys(localStorage)
          .filter(key => key.startsWith(`favorite_${userId}_`))
        
        const favoriteIds = favoriteKeys.map(key => key.replace(`favorite_${userId}_`, ''))
        
        setTotalCount(favoriteIds.length)
        setTotalPages(Math.ceil(favoriteIds.length / pageSize))

        // 模拟分页
        const from = (targetPage - 1) * pageSize
        const to = from + pageSize
        const paginatedIds = favoriteIds.slice(from, to)
        
        // 创建模拟收藏数据
        const mockFavorites: Favorite[] = paginatedIds.map(productId => ({
          id: `fav_${userId}_${productId}`,
          user_id: userId,
          product_id: productId,
          product: {
            id: productId,
            name: 'Product Name',
            description: 'Product Description',
            price: 0,
            images: [],
            category: 'unknown',
            stock: 0,
            brand: 'Unknown',
            sales_count: 0,
            sku: '',
            is_active: true,
            video: '',
            media_type: 'image',
            origin: 'Unknown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Product,
          created_at: new Date().toISOString()
        }))
        
        setFavorites(mockFavorites)
        if (page) {
          setCurrentPage(page)
        }
        return
      }
      
      // 调用Java后端API获取收藏列表
      const result = await authApi(`/favorites/list?page=${targetPage}&size=${pageSize}`, {
        method: 'GET'
      })

      if (result.code === 200) {
        const pageData = result.data
        const favoritesData = pageData.records || []
        
        // 转换数据格式 - 后端已经返回完整的FavoriteDTO对象
        const formattedFavorites: Favorite[] = favoritesData.map((item: any) => ({
          id: item.id,
          user_id: item.userId,
          product_id: item.productId,
          product: {
            id: item.product?.id || item.productId,
            name: item.product?.name || 'Unknown Product',
            description: item.product?.description || '',
            price: item.product?.price || 0,
            images: item.product?.images || [],
            category: item.product?.category || 'unknown',
            stock: item.product?.stock || 0,
            brand: item.product?.brand || 'Unknown',
            sales_count: item.product?.salesCount || 0,
            sku: item.product?.sku || '',
            is_active: item.product?.isActive !== false,
            video: item.product?.video || '',
            media_type: item.product?.mediaType || 'image',
            origin: item.product?.origin || 'Unknown',
            created_at: item.product?.createdAt || new Date().toISOString(),
            updated_at: item.product?.updatedAt || new Date().toISOString()
          } as Product,
          created_at: item.createdAt || new Date().toISOString()
        }))
        
        setFavorites(formattedFavorites)
        setTotalCount(pageData.total || 0)
        setTotalPages(pageData.pages || 1)
        if (page) {
          setCurrentPage(page)
        }
      } else {
        throw new Error(result.message || 'Failed to fetch favorites')
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      // 最终降级到localStorage
      if (userId) {
        const favoriteKeys = Object.keys(localStorage)
          .filter(key => key.startsWith(`favorite_${userId}_`))
        
        const favoriteIds = favoriteKeys.map(key => key.replace(`favorite_${userId}_`, ''))
        setTotalCount(favoriteIds.length)
        setTotalPages(Math.ceil(favoriteIds.length / pageSize))

        const from = (targetPage - 1) * pageSize
        const to = from + pageSize
        const paginatedIds = favoriteIds.slice(from, to)
        
        const mockFavorites: Favorite[] = paginatedIds.map(productId => ({
          id: `fav_${userId}_${productId}`,
          user_id: userId,
          product_id: productId,
          product: {
            id: productId,
            name: 'Product Name',
            description: 'Product Description',
            price: 0,
            images: [],
            category: 'unknown',
            stock: 0,
            brand: 'Unknown',
            sales_count: 0,
            sku: '',
            is_active: true,
            video: '',
            media_type: 'image',
            origin: 'Unknown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Product,
          created_at: new Date().toISOString()
        }))
        
        setFavorites(mockFavorites)
        if (page) {
          setCurrentPage(page)
        }
      } else {
        setFavorites([])
      }
    } finally {
      setLoading(false)
    }
  }, [userId, currentPage, pageSize])

  const addFavorite = useCallback(async (productId: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No authentication token found, using localStorage fallback')
        // 直接使用localStorage
        localStorage.setItem(`favorite_${userId}_${productId}`, 'true')
        await fetchFavorites()
        return { success: true }
      }

      // 调用Java后端API添加收藏
      const result = await authApi('/favorites/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `productId=${encodeURIComponent(productId)}`
      })
      if (result.code === 200) {
        // Refresh favorites list
        await fetchFavorites()
        return { success: true }
      } else {
        throw new Error(result.message || 'Failed to add favorite')
      }
    } catch (error) {
      console.error('Error adding favorite:', error)
      // 最终降级到localStorage
      if (userId && productId) {
        console.warn('Falling back to localStorage due to error')
        localStorage.setItem(`favorite_${userId}_${productId}`, 'true')
        await fetchFavorites()
        return { success: true }
      }
      throw error
    }
  }, [userId, fetchFavorites])

  const removeFavorite = useCallback(async (productId: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No authentication token found, using localStorage fallback')
        // 直接使用localStorage
        localStorage.removeItem(`favorite_${userId}_${productId}`)
        
        // Update local state immediately
        setFavorites(prevFavorites => 
          prevFavorites.filter(favorite => favorite.product_id !== productId)
        )

        // Refresh favorites list to ensure consistency
        await fetchFavorites()
        return
      }

      // 调用Java后端API取消收藏
      const result = await authApi(`/favorites/remove?productId=${encodeURIComponent(productId)}`, {
        method: 'DELETE'
      })
      if (result.code === 200) {
        // Update local state immediately
        setFavorites(prevFavorites => 
          prevFavorites.filter(favorite => favorite.product_id !== productId)
        )

        // Refresh favorites list to ensure consistency
        await fetchFavorites()
      } else {
        throw new Error(result.message || 'Failed to remove favorite')
      }
    } catch (error) {
      console.error('Error removing favorite:', error)
      // 最终降级到localStorage
      if (userId && productId) {
        console.warn('Falling back to localStorage due to error')
        localStorage.removeItem(`favorite_${userId}_${productId}`)
        
        setFavorites(prevFavorites => 
          prevFavorites.filter(favorite => favorite.product_id !== productId)
        )
        await fetchFavorites()
        return
      }
      throw error
    }
  }, [userId, fetchFavorites])

  const isFavorite = useCallback(async (productId: string): Promise<boolean> => {
    try {
      if (!userId) return false

      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No authentication token found')
        return false
      }

      // 调用Java后端API检查收藏状态
      const result = await authApi(`/favorites/check?productId=${encodeURIComponent(productId)}`, {
        method: 'GET'
      })
      if (result.code === 200) {
        return result.data === true
      } else {
        console.error('Error checking favorite status:', result.message)
        return false
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
      // 降级到localStorage检查
      if (userId && productId) {
        const favoriteKey = `favorite_${userId}_${productId}`
        return localStorage.getItem(favoriteKey) === 'true'
      }
      return false
    }
  }, [userId])

  const toggleFavorite = useCallback(async (productId: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No authentication token found, using localStorage fallback')
        // 直接使用localStorage操作
        const favoriteKey = `favorite_${userId}_${productId}`
        const isCurrentlyFavorite = localStorage.getItem(favoriteKey) === 'true'
        
        if (isCurrentlyFavorite) {
          localStorage.removeItem(favoriteKey)
          return { isFavorite: false, action: 'removed' }
        } else {
          localStorage.setItem(favoriteKey, 'true')
          return { isFavorite: true, action: 'added' }
        }
      }

      // 调用Java后端API切换收藏状态
      const result = await authApi('/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `productId=${encodeURIComponent(productId)}`
      })
      if (result.code === 200) {
        const data = result.data
        // Refresh favorites list
        await fetchFavorites()
        return { 
          isFavorite: data.isFavorite, 
          action: data.action 
        }
      } else {
        throw new Error(result.message || 'Failed to toggle favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }, [userId, fetchFavorites])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    fetchFavorites(page)
  }, [fetchFavorites])

  // Initial load
  useEffect(() => {
    if (autoFetch && userId) {
      fetchFavorites(1)
    } else {
      setFavorites([])
      setLoading(false)
    }
  }, [userId, autoFetch]) // 依赖 userId 和 autoFetch

  return { 
    favorites, 
    loading, 
    currentPage,
    totalPages,
    totalCount,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
    goToPage
  }
}