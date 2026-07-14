import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Filter, Search } from 'lucide-react'
import { apiService, Product, ProductListResponse, Category } from '../services/api'
import MobileProductCard from '../components/MobileProductCard'
import { useLanguage } from '../contexts/LanguageContext'

// Helper function to clean image URLs - 保留这个，以防其他地方需要
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  let cleanUrl = url.trim()
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) ||
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
  }
  return cleanUrl
}

export default function Products() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    size: 12,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [showFilters, setShowFilters] = useState(true)

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const homeData = await apiService.getHomeInit()
        if (homeData) {
          setCategories(homeData.categories)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch products
  const fetchProducts = async (page: number = 1) => {
    setLoading(true)
    try {
      const response = await apiService.getProducts(
        page,
        12,
        sortBy,
        sortOrder,
        selectedCategory
      )
      
      if (response) {
        setProducts(response.records)
        setPagination({
          current: response.current,
          size: response.size,
          total: response.total,
          pages: response.pages
        })
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(1)
  }, [selectedCategory, sortBy, sortOrder])

  const handlePageChange = (page: number) => {
    fetchProducts(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  const handleSortChange = (newSortBy: string, newSortOrder: 'ASC' | 'DESC') => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">{t('products.all_title')}</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">{t('filter.title')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 pb-3">
              {/* Category Filter */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('filter.category')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t('filter.all')}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.key}
                      onClick={() => handleCategoryChange(category.key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedCategory === category.key
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('filter.sort')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSortChange('created_at', 'DESC')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      sortBy === 'created_at' && sortOrder === 'DESC'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t('sort.newest')}
                  </button>
                  <button
                    onClick={() => handleSortChange('price', 'ASC')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      sortBy === 'price' && sortOrder === 'ASC'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t('sort.price_asc')}
                  </button>
                  <button
                    onClick={() => handleSortChange('price', 'DESC')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      sortBy === 'price' && sortOrder === 'DESC'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t('sort.price_desc')}
                  </button>
                  <button
                    onClick={() => handleSortChange('salesCount', 'DESC')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      sortBy === 'salesCount' && sortOrder === 'DESC'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t('sort.sales')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            {t('products.total_count', {count: pagination.total})}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            {Array.from({length: 12}).map((_, index) => (
              <div key={index} className="card-mobile">
                <div className="h-48 bg-gray-200 rounded-t-2xl animate-pulse"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            {products.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                showPointsBadge={product.category === 'points' || product.category === '积分兑换'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-2">
            {/* Previous Page */}
            <button
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className={`px-3 py-2 text-sm rounded ${
                pagination.current <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('pagination.previous')}
            </button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, index) => {
              const startPage = Math.max(1, pagination.current - 2)
              const pageNumber = startPage + index
              
              if (pageNumber > pagination.pages) return null
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`px-3 py-2 text-sm rounded ${
                    pageNumber === pagination.current
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            })}

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current >= pagination.pages}
              className={`px-3 py-2 text-sm rounded ${
                pagination.current >= pagination.pages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('pagination.next')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500">{t('products.empty')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('products.adjust_filters')}</p>
          </div>
        )}
      </div>
    </div>
  )
}