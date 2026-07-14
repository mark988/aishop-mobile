import { useState, useEffect } from 'react'
import { Product } from '../types'
import { apiService } from '../services/api'

export interface FeaturedProductsListParams {
  page: number
  size: number
  sortBy?: 'created_at' | 'name' | 'price' | 'salesCount' | 'rating'
  sortOrder?: 'ASC' | 'DESC'
}

export interface FeaturedProductsListResult {
  products: Product[]
  loading: boolean
  error: string | null
  pagination: {
    current: number
    totalPages: number
    totalElements: number
    size: number
  } | null
  refetch: () => void
}

export function useFeaturedProductsList(params: FeaturedProductsListParams): FeaturedProductsListResult {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    current: number
    totalPages: number
    totalElements: number
    size: number
  } | null>(null)

  const fetchFeaturedProductsList = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        size: params.size.toString(),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortOrder && { sortOrder: params.sortOrder })
      })

      // 首先尝试使用现有的API服务获取精选商品
      try {
        const featuredProducts = await apiService.getFeaturedProducts(params.size * params.page)
        
        // 模拟分页数据
        const startIndex = (params.page - 1) * params.size
        const endIndex = startIndex + params.size
        const paginatedProducts = featuredProducts.slice(startIndex, endIndex)
        
        // 应用排序
        let sortedProducts = [...paginatedProducts]
        if (params.sortBy && params.sortOrder) {
          sortedProducts.sort((a, b) => {
            let aValue: any = a[params.sortBy as keyof Product]
            let bValue: any = b[params.sortBy as keyof Product]
            
            if (params.sortBy === 'price') {
              aValue = Number(aValue) || 0
              bValue = Number(bValue) || 0
            } else if (params.sortBy === 'salesCount') {
              aValue = Number(aValue) || 0
              bValue = Number(bValue) || 0
            } else if (params.sortBy === 'rating') {
              aValue = Number(aValue) || 0
              bValue = Number(bValue) || 0
            }
            
            if (params.sortOrder === 'ASC') {
              return aValue > bValue ? 1 : -1
            } else {
              return aValue < bValue ? 1 : -1
            }
          })
        }
        
        setProducts(sortedProducts)
        setPagination({
          current: params.page,
          totalPages: Math.ceil(featuredProducts.length / params.size),
          totalElements: featuredProducts.length,
          size: params.size
        })
        return
      } catch (apiError) {
        console.log('Featured products API not available, trying fallback')
      }

      // 降级到通用商品接口
      try {
        const productsResult = await apiService.getProducts(params.page, params.size, params.sortBy || 'created_at', params.sortOrder || 'DESC')
        
        if (productsResult) {
          setProducts(productsResult.records || [])
          setPagination({
            current: productsResult.current || params.page,
            totalPages: productsResult.pages || 1,
            totalElements: productsResult.total || 0,
            size: params.size
          })
          return
        }
      } catch (fallbackError) {
        console.log('Fallback products API also not available')
      }

      // 最终降级：设置空数据
      setProducts([])
      setPagination({
        current: 1,
        totalPages: 1,
        totalElements: 0,
        size: params.size
      })
    } catch (err) {
      console.error('Error fetching featured products list:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setProducts([])
      setPagination({
        current: 1,
        totalPages: 1,
        totalElements: 0,
        size: params.size
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeaturedProductsList()
  }, [params.page, params.size, params.sortBy, params.sortOrder])

  return {
    products,
    loading,
    error,
    pagination,
    refetch: fetchFeaturedProductsList
  }
}