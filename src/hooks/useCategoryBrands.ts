import { useState, useEffect } from 'react'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

/**
 * 拉取指定分类下的所有品牌（去重，仅含已上架商品）。
 * 与商品分页接口解耦，确保品牌过滤器中能看到该分类下的全部品牌，
 * 不会因为当前页/排序而丢失。
 */
export const useCategoryBrands = (category?: string) => {
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      if (category) queryParams.append('category', category)

      const url = `${API_BASE_URL}/products/brands${
        queryParams.toString() ? `?${queryParams}` : ''
      }`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.code === 200 && Array.isArray(result.data)) {
        setBrands(
          (result.data as string[]).filter(
            (b) => typeof b === 'string' && b.trim() !== ''
          )
        )
      } else {
        setError(result.message || '获取品牌列表失败')
        setBrands([])
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('Error fetching category brands:', err)
      setError(err?.message || '获取品牌列表时发生未知错误')
      setBrands([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchBrands(controller.signal)
    return () => controller.abort()
  }, [category])

  return {
    brands,
    loading,
    error,
    refetch: () => fetchBrands(),
  }
}
