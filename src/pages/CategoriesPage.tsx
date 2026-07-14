import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Grid, ShoppingBag } from 'lucide-react'
import { apiService, Category } from '../services/api'
import { useLanguage } from '../contexts/LanguageContext'

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

export default function CategoriesPage() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiService.getCategories()
        setCategories(data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Loading state */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center">
            <Grid className="w-6 h-6 mr-2 text-primary-600" />
            {t('nav.categories')}
          </h1>
        </div>
      </div>

      {categories.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Grid className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('categories.empty')}</h3>
          <p className="text-gray-500 text-sm mb-6">{t('categories.empty_desc')}</p>
          <Link
            to="/"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {t('nav.home')}
          </Link>
        </div>
      ) : (
        // Categories grid
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.key}`}
                className="group"
              >
                <div className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group-active:scale-95">
                  {/* Category Image/Icon */}
                  <div className="aspect-square mb-3 relative overflow-hidden rounded-xl bg-gray-50">
                    {category.image && category.mediaType === 'video' ? (
                      <video
                        className="w-full h-full object-cover"
                        src={cleanImageUrl(category.image)}
                        muted
                        playsInline
                        autoPlay
                        loop
                        onError={(e) => {
                          console.error('Video failed to load:', cleanImageUrl(category.image));
                          // Hide video and show fallback
                          const videoElement = e.currentTarget;
                          videoElement.style.display = 'none';
                          const fallback = videoElement.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started:', cleanImageUrl(category.image));
                        }}
                        onCanPlay={() => {
                          console.log('Video can play:', cleanImageUrl(category.image));
                        }}
                      />
                    ) : null}

                    {/* 备用内容 - 图片或图标 */}
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        category.image && category.mediaType === 'video' ? 'hidden' : 'flex'
                      }`}
                    >
                      {category.image && category.mediaType !== 'video' ? (
                        <img
                          src={cleanImageUrl(category.image)}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : category.icon ? (
                        <div className="text-4xl">{category.icon}</div>
                      ) : (
                        <ShoppingBag className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Category badge */}
                    {category.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {t('categories.featured')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    {/* {category.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {category.description}
                      </p>
                    )} */}
                    <div className="flex items-center justify-center text-xs text-gray-400">
                      <ShoppingBag className="w-3 h-3 mr-1" />
                      <span>{t('categories.product_count', { count: category.productCount || 0 })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
