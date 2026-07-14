import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Sparkles, Grid, List, ChevronLeft, ChevronRight, Zap, ArrowLeft } from 'lucide-react'
import { useAIRecommendationsList } from '../hooks/useAIRecommendationsList'
import { useLanguage } from '../contexts/LanguageContext'
import MobileProductCard from '../components/MobileProductCard'

const ITEMS_PER_PAGE = 12

export default function AIRecommendations() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'score')
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'DESC')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [isUrlSync, setIsUrlSync] = useState(false)

  // 使用AI推荐列表hook
  const { 
    products, 
    loading, 
    error, 
    pagination, 
    refetch 
  } = useAIRecommendationsList({
    page: currentPage,
    size: ITEMS_PER_PAGE,
    sortBy,
    sortOrder
  })

  // URL同步
  useEffect(() => {
    if (!isUrlSync) {
      setIsUrlSync(true)
      return
    }

    const params = new URLSearchParams()
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (sortBy !== 'score') params.set('sort', sortBy)
    if (sortOrder !== 'DESC') params.set('order', sortOrder)
    
    setSearchParams(params)
  }, [currentPage, sortBy, sortOrder, isUrlSync, setSearchParams])

  // 处理排序变化
  const handleSortChange = (newSortBy: string, newSortOrder: string) => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setCurrentPage(1)
  }

  // 处理页面变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 生成页码数组
  const generatePageNumbers = () => {
    const totalPages = pagination?.totalPages || 1
    const current = currentPage
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      if (current > 4) {
        pages.push('...')
      }
      
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPages - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current < totalPages - 3) {
        pages.push('...')
      }
      
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (error) {
    return (
      <div className="min-h-screen-mobile bg-gray-50 px-4 py-6">
        <div className="flex items-center mb-6">
          <Link to="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{t('ai.title')}</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{t('ai.error.title')}</div>
          <button
            onClick={() => refetch()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg"
          >
            {t('ai.error.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen-mobile bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{t('ai.title')}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="px-4 pb-4">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => handleSortChange('score', 'DESC')}
              className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                sortBy === 'score' && sortOrder === 'DESC'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t('ai.sort.score')}
            </button>
            <button
              onClick={() => handleSortChange('price', 'ASC')}
              className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                sortBy === 'price' && sortOrder === 'ASC'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t('ai.sort.price_low')}
            </button>
            <button
              onClick={() => handleSortChange('price', 'DESC')}
              className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                sortBy === 'price' && sortOrder === 'DESC'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t('ai.sort.price_high')}
            </button>
            <button
              onClick={() => handleSortChange('salesCount', 'DESC')}
              className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                sortBy === 'salesCount' && sortOrder === 'DESC'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {t('ai.sort.sales')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({length: 6}).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('ai.empty.title')}</h3>
            <p className="text-gray-500 mb-6">{t('ai.empty.description')}</p>
            <Link
              to="/"
              className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg font-medium"
            >
              {t('ai.empty.back_home')}
            </Link>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {products.map((item) => (
                <MobileProductCard 
                  key={item.product?.id || item.id} 
                  product={item.product || item}
                  showAIBadge={true}
                  aiBadgeScore={item.score ? Math.round(item.score * 100) : 95}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? handlePageChange(page) : undefined}
                    disabled={typeof page !== 'number'}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      page === currentPage
                        ? 'bg-primary-600 text-white'
                        : typeof page === 'number'
                        ? 'text-gray-600 hover:bg-gray-100'
                        : 'text-gray-400 cursor-default'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === (pagination?.totalPages || 1)}
                  className={`p-2 rounded-lg ${
                    currentPage === (pagination?.totalPages || 1)
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Results Info */}
            {pagination && (
              <div className="text-center text-sm text-gray-500 mt-4">
                {t('ai.pagination.info', {
                  total: pagination.totalElements,
                  current: currentPage,
                  pages: pagination.totalPages
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  )
}