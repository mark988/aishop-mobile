import { useState, useEffect } from 'react'
import { Product } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

/**
 * 精选商品Hook
 * 获取运营配置的精选商品列表
 */
export function useFeaturedProducts(limit: number = 8) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // 首先尝试新的精选商品接口
      try {
        const response = await fetch(`${API_BASE_URL}/api/home/featured-products?limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          // API 返回格式: { code: 200, message: "操作成功", data: [...] }
          if (result.code === 200 || result.success) {
            setFeaturedProducts(result.data || [])
            return
          }
        }
      } catch (newApiError) {
        console.log('New featured products API not available, falling back to existing API')
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
            setFeaturedProducts(fallbackResult.data || [])
            return
          }
        }
      } catch (fallbackError) {
        console.log('Fallback API also not available, using mock data')
      }

      // 最终降级：使用空数组，让组件从其他地方获取数据
      setFeaturedProducts([])
    } catch (err) {
      console.error('Error fetching featured products:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setFeaturedProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeaturedProducts()
  }, [limit])

  return {
    featuredProducts,
    loading,
    error,
    refetch: fetchFeaturedProducts
  }
}