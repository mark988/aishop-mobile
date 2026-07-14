import { useState, useEffect } from 'react'
import { Product } from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

interface UseProductsListParams {
  page?: number
  size?: number
  category?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}

interface ProductsListResponse {
  records: Product[]
  total: number
  current: number
  size: number
  pages: number
}

export const useProductsList = (params: UseProductsListParams = {}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    size: 12,
    pages: 0
  })

  const {
    page = 1,
    size = 12,
    category,
    search,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = params

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sortBy,
        sortOrder
      })

      if (category) queryParams.append('category', category)
      if (search) queryParams.append('search', search)

      const response = await fetch(`${API_BASE_URL}/products?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        const pageData = result.data as ProductsListResponse
        
        // 转换数据格式以匹配前端类型
        const transformedProducts = pageData.records.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.images?.[0] || '', // 使用第一张图片
          images: product.images || [],
          video: product.video,
          media_type: product.mediaType,
          category: product.category,
          stock: product.stock,
          brand: product.brand,
          sales_count: product.salesCount,
          property: product.property, // 添加属性字段映射
          origin: product.origin,
          sku: product.sku,
          is_active: product.isActive,
          created_at: product.createdAt,
          updated_at: product.updatedAt,
        }))
        
        setProducts(transformedProducts)
        setPagination({
          current: pageData.current,
          total: pageData.total,
          size: pageData.size,
          pages: pageData.pages
        })
      } else {
        console.error('API Error:', result.message)
        setError(result.message || '获取商品列表失败')
        setProducts([])
        setPagination({
          current: 1,
          total: 0,
          size: 12,
          pages: 0
        })
      }
    } catch (error: any) {
      console.error('Error fetching products list:', error)
      setError(error.message || '获取商品列表时发生未知错误')
      setProducts([])
      setPagination({
        current: 1,
        total: 0,
        size: 12,
        pages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 确保初始状态为loading
    setLoading(true)
    
    // 添加防抖功能，避免频繁API调用
    const debounceTimer = setTimeout(() => {
      fetchProducts()
    }, search ? 500 : 0) // 有搜索词时延迟500ms，无搜索词时立即执行

    return () => clearTimeout(debounceTimer)
  }, [page, size, category, search, sortBy, sortOrder])

  return { 
    products, 
    loading, 
    error,
    pagination,
    refetch: fetchProducts 
  }
}