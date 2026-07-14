import { useState, useEffect } from 'react'
import { Product } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

/**
 * AI智能推荐商品Hook
 * 根据用户行为提供个性化推荐
 */
export function useAIRecommendations(limit: number = 8) {
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAIRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)

      // 首先尝试新的AI推荐接口
      try {
        const response = await fetch(`${API_BASE_URL}/api/home/ai-recommendations?limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
          }
        })

        if (response.ok) {
          const result = await response.json()
          // API 返回格式: { code: 200, message: "操作成功", data: [...] }
          if (result.code === 200 || result.success) {
            setRecommendations(result.data || [])
            return
          }
        }
      } catch (newApiError) {
        console.log('New AI recommendations API not available, falling back to existing API')
      }

      // 降级到现有的商品接口
      try {
        const fallbackResponse = await fetch(`${API_BASE_URL}/api/home/products?limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json()
          // API 返回格式: { code: 200, message: "操作成功", data: [...] }
          if (fallbackResult.code === 200 || fallbackResult.success) {
            setRecommendations(fallbackResult.data || [])
            return
          }
        }
      } catch (fallbackError) {
        console.log('Fallback API also not available, using mock data')
      }

      // 最终降级：使用空数组，让组件从其他地方获取数据
      setRecommendations([])
    } catch (err) {
      console.error('Error fetching AI recommendations:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAIRecommendations()
  }, [limit])

  return {
    recommendations,
    loading,
    error,
    refetch: fetchAIRecommendations
  }
}

/**
 * 记录用户行为的Hook
 */
export function useUserBehaviorTracking() {
  const recordProductView = async (productId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/record-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        },
        body: `productId=${encodeURIComponent(productId)}`
      })

      if (response.ok) {
        const result = await response.json()
        return result.success
      }
      return false
    } catch (error) {
      console.error('Error recording product view:', error)
      return false
    }
  }

  const recordAddToCart = async (productId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/record-add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        },
        body: `productId=${encodeURIComponent(productId)}`
      })

      if (response.ok) {
        const result = await response.json()
        return result.success
      }
      return false
    } catch (error) {
      console.error('Error recording add to cart:', error)
      return false
    }
  }

  const recordPurchase = async (productId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/record-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
        },
        body: `productId=${encodeURIComponent(productId)}`
      })

      if (response.ok) {
        const result = await response.json()
        return result.success
      }
      return false
    } catch (error) {
      console.error('Error recording purchase:', error)
      return false
    }
  }

  return {
    recordProductView,
    recordAddToCart,
    recordPurchase
  }
}