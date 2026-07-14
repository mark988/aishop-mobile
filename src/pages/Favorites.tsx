import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart, Package, ShoppingCart, Trash2, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  brand: string
  salesCount: number
  video: string
  mediaType: string
  origin: string
  sku: string
  isActive: boolean
  createdAt: string
  property: any
  updatedAt: string
  images: string[]
}

interface Favorite {
  id: string
  userId: string
  productId: string
  product: Product
  createdAt: string
}

interface FavoritesResponse {
  code: number
  message: string
  data: {
    records: Favorite[]
    total: number
    size: number
    current: number
    pages: number
  }
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

export default function Favorites() {
  const { user, isLoggedIn, token } = useAuth()
  const { addItem } = useCart()
  const { t } = useLanguage()

  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Fetch favorites
  const fetchFavorites = async (page: number = 1) => {
    if (!isLoggedIn || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/favorites/list?page=${page}&size=12`, {
        method: 'GET',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          setFavorites([])
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: FavoritesResponse = await response.json()
      
      if (data.code === 200) {
        setFavorites(data.data.records)
        setTotalPages(data.data.pages)
        setCurrentPage(data.data.current)
      } else {
        throw new Error(data.message || 'Failed to fetch favorites')
      }
    } catch (err) {
      console.error('Error fetching favorites:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  // Remove from favorites
  const removeFromFavorites = async (favoriteId: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
        setSelectedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(favoriteId)
          return newSet
        })
        toast.success(t('favorites.removed'))
      } else {
        throw new Error('移除收藏失败')
      }
    } catch (err) {
      console.error('Error removing favorite:', err)
      toast.error('移除收藏失败')
    }
  }

  // Add to cart (参考首页实现)
  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault() // Prevent navigation
    e.stopPropagation()
    
    if (addingToCart === product.id) return // Prevent double-clicking
    
    // Check stock
    if (product.stock <= 0) {
      toast.error('商品库存不足')
      return
    }

    setAddingToCart(product.id)
    
    try {
      // Default selections for product properties (first option for each property)
      const defaultProperties: {[key: string]: string} = {}
      if (product.property && Object.keys(product.property).length > 0) {
        Object.entries(product.property).forEach(([key, values]) => {
          const valueArray = Array.isArray(values) ? values : [values]
          if (valueArray.length > 0) {
            defaultProperties[key] = valueArray[0]
          }
        })
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Add to cart with default properties and quantity 1
      await addItem(product, 1, defaultProperties)
      
      // Show success message
      const propertyText = Object.keys(defaultProperties).length > 0 
        ? ` (${Object.entries(defaultProperties).map(([k, v]) => `${k}: ${v}`).join(', ')})` 
        : ''
      toast.success(t('cart.added_to_cart'), {
        duration: 2000,
        icon: '🛒',
        position: 'top-center',
      })

    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error(t('cart.add_failed'))
    } finally {
      setAddingToCart(null)
    }
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(favorites.map(fav => fav.id)))
    }
    setSelectAll(!selectAll)
  }

  // Handle item selection
  const handleItemSelect = (favoriteId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(favoriteId)) {
      newSelected.delete(favoriteId)
    } else {
      newSelected.add(favoriteId)
    }
    setSelectedItems(newSelected)
    setSelectAll(newSelected.size === favorites.length)
  }

  // Batch remove favorites
  const handleBatchRemove = async () => {
    if (selectedItems.size === 0) {
      toast.error(t('favorites.select_items_to_remove'))
      return
    }

    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`${API_BASE_URL}/api/favorites/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          credentials: 'include'
        })
      )

      await Promise.all(promises)
      
      setFavorites(prev => prev.filter(fav => !selectedItems.has(fav.id)))
      setSelectedItems(new Set())
      setSelectAll(false)
      toast.success(t('favorites.batch_removed', {count: selectedItems.size}))
    } catch (err) {
      console.error('Error batch removing favorites:', err)
      toast.error(t('favorites.batch_remove_failed'))
    }
  }

  // Batch add to cart
  const handleBatchAddToCart = async () => {
    if (selectedItems.size === 0) {
      toast.error(t('cart.select_items_error'))
      return
    }

    try {
      const selectedFavorites = favorites.filter(fav => selectedItems.has(fav.id))
      const promises = selectedFavorites.map(async (fav) => {
        // Default selections for product properties (first option for each property)
        const defaultProperties: {[key: string]: string} = {}
        if (fav.product.property && Object.keys(fav.product.property).length > 0) {
          Object.entries(fav.product.property).forEach(([key, values]) => {
            const valueArray = Array.isArray(values) ? values : [values]
            if (valueArray.length > 0) {
              defaultProperties[key] = valueArray[0]
            }
          })
        }
        return addItem(fav.product, 1, defaultProperties)
      })
      
      await Promise.all(promises)
      toast.success(t('favorites.batch_added_to_cart', {count: selectedItems.size}), {
        duration: 2000,
        icon: '🛒',
        position: 'top-center',
      })
      setSelectedItems(new Set())
      setSelectAll(false)
    } catch (err) {
      console.error('Error batch adding to cart:', err)
      toast.error(t('favorites.batch_add_failed'))
    }
  }

  useEffect(() => {
    fetchFavorites(1)
  }, [user?.id, isLoggedIn, token])

  const formatPrice = (price: number) => {
    return `¥${price.toFixed(2)}`
  }

  // If not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <Link to="/profile" className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold">我的收藏</h1>
          </div>
        </div>
        
        {/* Not logged in message */}
        <div className="flex flex-col items-center justify-center py-20">
          <Heart className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先登录</h3>
          <p className="text-gray-500 text-sm mb-6">登录后查看您的收藏商品</p>
          <Link
            to="/login"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Link to="/profile" className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold">我的收藏</h1>
            <span className="ml-2 text-sm text-gray-500">({favorites.length})</span>
          </div>
          {favorites.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {selectAll ? t('favorites.deselect_all') : t('favorites.select_all')}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-center">{error}</p>
          <button 
            onClick={() => fetchFavorites(currentPage)}
            className="w-full mt-3 text-primary-600 font-medium"
          >
            重试
          </button>
        </div>
      )}

      {/* Favorites List */}
      {!loading && !error && (
        <>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Heart className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('favorites.no_favorites_yet')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('favorites.add_some_favorites')}</p>
              <Link
                to="/"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t('favorites.empty.action')}
              </Link>
            </div>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="bg-white rounded-xl shadow-sm overflow-hidden relative">
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(favorite.id)}
                        onChange={() => handleItemSelect(favorite.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromFavorites(favorite.id)}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>

                    {/* Product Link */}
                    <Link to={`/product/${favorite.product.id}`} className="block">
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        {favorite.product.images && favorite.product.images.length > 0 ? (
                          <img
                            src={cleanImageUrl(favorite.product.images[0])}
                            alt={favorite.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                          {favorite.product.name}
                        </h3>
                        
                        {/* Brand and Origin */}
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <span>{favorite.product.brand}</span>
                          {favorite.product.origin && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{favorite.product.origin}</span>
                            </>
                          )}
                        </div>

                        {/* Price and Sales */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-primary-600 font-semibold">
                            {formatPrice(favorite.product.price)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('products.sold', {count: favorite.product.salesCount})}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Add to Cart Button */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={(e) => handleAddToCart(e, favorite.product)}
                        disabled={favorite.product.stock === 0 || addingToCart === favorite.product.id}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                          favorite.product.stock === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : addingToCart === favorite.product.id
                            ? 'bg-primary-300 text-white cursor-wait'
                            : 'bg-primary-600 hover:bg-primary-700 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        {addingToCart === favorite.product.id ? t('common.adding') : favorite.product.stock === 0 ? t('common.out_of_stock') : t('common.add_to_cart')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <button
                    onClick={() => fetchFavorites(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    {t('favorites.previous_page')}
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => fetchFavorites(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    {t('favorites.next_page')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Bottom Action Bar */}
      {favorites.length > 0 && selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t('favorites.select_all')}</span>
            </div>

            <div className="text-sm text-gray-500">
              {t('favorites.selected_count', {count: selectedItems.size})}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleBatchRemove}
              className="flex-1 py-3 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('favorites.delete_selected')} ({selectedItems.size})
            </button>
            <button
              onClick={handleBatchAddToCart}
              className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              {t('favorites.batch_add_to_cart', {count: selectedItems.size})}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}