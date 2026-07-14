import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Grid, Filter, ChevronDown } from 'lucide-react'
import { Product } from '../types'
import MobileProductCard from '../components/MobileProductCard'
import { useLanguage } from '../contexts/LanguageContext'
import { useCategoryBrands } from '../hooks/useCategoryBrands'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface ProductListResponse {
  records: Product[]
  total: number
  size: number
  current: number
  pages: number
}

// Helper function to clean image URLs
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  let cleanUrl = url.trim()
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
  }
  return cleanUrl
}

export default function Category() {
  const { category } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [categoryName, setCategoryName] = useState('')
  
  // Filter and sort states
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [isFiltering, setIsFiltering] = useState(false)

  // 该分类下所有品牌（独立接口，不再受当前页/排序影响）
  const { brands } = useCategoryBrands(category)

  // Fetch category name from API
  const fetchCategoryName = async () => {
    if (!category) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200 && data.data) {
          const foundCategory = data.data.find((cat: any) => cat.key === category)
          if (foundCategory) {
            setCategoryName(foundCategory.name)
            return
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch category name:', error)
    }
    
    // Fallback to local mapping
    setCategoryName(getCategoryDisplayName(category))
  }

  // Sort options
  const sortOptions = [
    { key: 'created_at|DESC', label: t('sort.newest') },
    { key: 'price|ASC', label: t('sort.price_asc') },
    { key: 'price|DESC', label: t('sort.price_desc') },
    { key: 'salesCount|DESC', label: t('sort.sales') },
    { key: 'name|ASC', label: t('sort.name') }
  ]

  // Fetch products for the category
  const fetchCategoryProducts = async (page: number = 1, isFilterUpdate = false) => {
    if (!category) return

    if (isFilterUpdate) {
      setIsFiltering(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      let url = `${API_BASE_URL}/api/products?page=${page}&size=12&sortBy=${sortBy}&sortOrder=${sortOrder}&category=${encodeURIComponent(category)}`
      if (selectedBrand) {
        url += `&brand=${encodeURIComponent(selectedBrand)}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.code === 200) {
        const productData: ProductListResponse = data.data
        setProducts(productData.records || [])
        setTotalPages(productData.pages || 1)
        setTotalProducts(productData.total || 0)
        setCurrentPage(productData.current || 1)
        // 品牌列表来自 useCategoryBrands，不再从当前页商品中提取
      } else {
        throw new Error(data.message || '获取商品失败')
      }
    } catch (err) {
      console.error('Error fetching category products:', err)
      setError(err instanceof Error ? err.message : '获取商品失败')
    } finally {
      if (isFilterUpdate) {
        setIsFiltering(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // 分类变化：拉取分类名 + 重置到第一页拉取商品
    fetchCategoryName()
    fetchCategoryProducts(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // 跟踪是否已完成首次加载，避免初始 mount 时重复请求
  const isFirstFilterRun = useRef(true)
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false
      return
    }
    // 任何过滤/排序变化都需要重新拉取（包括把品牌从某值切回 "全部"）
    const timeoutId = setTimeout(() => {
      fetchCategoryProducts(1, true)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand, sortBy, sortOrder])

  // Handle sort change
  const handleSortChange = (sortKey: string) => {
    const [field, order] = sortKey.split('|')
    setSortBy(field)
    setSortOrder(order as 'ASC' | 'DESC')
    setCurrentPage(1)
    // Don't close filters panel - let user continue selecting
  }

  // Handle brand filter change
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand)
    setCurrentPage(1)
    // Don't close filters panel - let user continue selecting
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchCategoryProducts(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Get category display name
  const getCategoryDisplayName = (categoryKey: string) => {
    // Try to get translation first
    const translationKey = `category.name.${categoryKey}`
    const translatedName = t(translationKey)

    // If translation exists (not returning the key itself), use it
    if (translatedName !== translationKey) {
      return translatedName
    }

    // Otherwise return decoded category key
    return decodeURIComponent(categoryKey)
  }

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('category.title')}</h1>
          </div>
        </div>

        {/* Loading */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('category.title')}</h1>
          </div>
        </div>

        {/* Error */}
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Grid className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('category.load_failed')}</h3>
          <p className="text-gray-500 text-center mb-6">{error}</p>
          <button
            onClick={() => fetchCategoryProducts(currentPage)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{categoryName || getCategoryDisplayName(category || '')}</h1>
            <p className="text-sm text-gray-500">{t('category.items_count', {count: totalProducts})}</p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="p-2"
          >
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filter and Sort Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          {/* Current Filter Status */}
          {(selectedBrand || sortBy !== 'created_at' || sortOrder !== 'DESC') && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">{t('category.current_filters')}</h3>
                <button
                  onClick={() => {
                    setSelectedBrand('')
                    setSortBy('created_at')
                    setSortOrder('DESC')
                    setCurrentPage(1)
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {t('category.reset_filters')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {selectedBrand && (
                  <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                    {t('category.filter_brand', {brand: selectedBrand})}
                  </span>
                )}
                {(sortBy !== 'created_at' || sortOrder !== 'DESC') && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {t('category.filter_sort', {sort: sortOptions.find(opt => opt.key === `${sortBy}|${sortOrder}`)?.label})}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('category.sorting_label')}</h3>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSortChange(option.key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    `${sortBy}|${sortOrder}` === option.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          {brands.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{t('category.brand_label')}</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBrandChange('')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedBrand === ''
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('category.all_brands')}
                </button>
                {brands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => handleBrandChange(brand)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedBrand === brand
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {products.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Grid className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('category.empty')}</h3>
          <p className="text-gray-500 text-center mb-6">{t('category.empty_desc')}</p>
          <Link
            to="/products"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {t('category.view_all_products')}
          </Link>
        </div>
      ) : (
        <>
          {/* Products Grid */}
          <div className="p-4">            
            <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${isFiltering ? 'opacity-60' : 'opacity-100'}`}>
              {products.map((product) => (
                <MobileProductCard
                  key={product.id}
                  product={product}
                  showPointsBadge={category === 'points' || category === '积分兑换'}
                />
              ))}
            </div>
            
            {/* Filter Loading Overlay */}
            {isFiltering && (
              <div className="fixed inset-0 bg-black bg-opacity-20 z-40 flex items-center justify-center">
                <div className="bg-white rounded-2xl px-6 py-4 shadow-lg flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-gray-900">{t('category.filtering_products')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-6">
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {t('pagination.previous')}
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {t('pagination.next')}
                </button>
              </div>

              <div className="text-center mt-4 text-sm text-gray-500">
                {t('category.page_info', {current: currentPage, total: totalPages})}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
