import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Heart, Sparkles, Star } from 'lucide-react'
import { Product } from '../types'
import { useCart } from '../contexts/CartContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { usePointsExchange } from '../contexts/PointsExchangeContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useLanguage } from '../contexts/LanguageContext'
import MobileImageWithFallback from './MobileImageWithFallback'
import toast from 'react-hot-toast'

interface MobileProductCardProps {
  product: Product
  showAIBadge?: boolean
  aiBadgeScore?: number
  showFeaturedBadge?: boolean
  showPointsBadge?: boolean
}

export default function MobileProductCard({
  product,
  showAIBadge = false,
  showFeaturedBadge = false,
  showPointsBadge = false
}: MobileProductCardProps) {
  const { addItem } = useCart()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { calculatePointsFromMoney } = usePointsExchange()
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const isFavorited = isFavorite(product.id)

  // 判断是否为积分兑换商品
  const isPointsProduct = product.category === 'points' || product.category === '积分兑换' || showPointsBadge

  // 优先使用接口返回的 points 字段，如果没有则通过价格计算
  const pointsPrice = isPointsProduct
    ? (product.points || calculatePointsFromMoney(product.price))
    : 0

  // 生成默认属性选择
  const getDefaultProperties = () => {
    if (!product.property || typeof product.property !== 'object') {
      return {};
    }

    const propertyKeys = Object.keys(product.property);
    if (propertyKeys.length === 0) {
      return {};
    }

    const defaultProperties: Record<string, string> = {};

    Object.entries(product.property).forEach(([key, values]) => {
      // Handle different value formats: array, comma-separated string, or single value
      let valueArray: string[];
      if (Array.isArray(values)) {
        valueArray = values;
      } else if (typeof values === 'string' && values.includes(',')) {
        valueArray = values.split(',').map(v => v.trim()).filter(v => v.length > 0);
      } else {
        valueArray = [String(values)];
      }

      if (valueArray.length > 0) {
        defaultProperties[key] = valueArray[0];
      }
    });

    return defaultProperties;
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsAddingToCart(true)
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300))

      // 获取默认属性选择
      const defaultProperties = getDefaultProperties();

      // CRITICAL FIX: Ensure we never pass the raw product.property as selectedProperties
      // Always use the processed defaultProperties
      const safeSelectedProperties = defaultProperties && Object.keys(defaultProperties).length > 0
        ? defaultProperties
        : {};

      // Add to cart with default properties
      await addItem(product, 1, safeSelectedProperties)

      // Show success message with properties
      const propertyText = Object.keys(safeSelectedProperties).length > 0
        ? ` (${Object.entries(safeSelectedProperties).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : '';
      toast.success(t('cart.added_to_cart'), {
        duration: 2000,
        icon: isPointsProduct ? '🪙' : '🛒',
        position: 'top-center',
      })
    } catch (error) {
      console.error('添加到购物车失败:', error)
      toast.error(t('cart.add_failed'), {
        duration: 2000,
        position: 'top-center',
      })
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      await toggleFavorite(product.id)
    } catch (error) {
      console.error('切换收藏状态失败:', error)
    }
  }

  const getImageSrc = () => {
    if (product.images && product.images.length > 0) {
      return product.images[0]
    }
    return '/placeholder-image.svg'
  }

  // Helper function to clean HTML tags from description
  const cleanDescription = (description: string) => {
    // Remove HTML tags and decode common HTML entities
    const cleanText = description
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .trim()
    
    return cleanText.length > 50 ? `${cleanText.substring(0, 50)}...` : cleanText
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="card-mobile touch-feedback relative group"
    >
      {/* AI Badge */}
      {showAIBadge && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>{t('ai.recommendation.badge')}</span>
        </div>
      )}

      {/* Featured Badge */}
      {showFeaturedBadge && !showAIBadge && !isPointsProduct && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
          <Star className="w-3 h-3" />
          <span>{t('products.featured')}</span>
        </div>
      )}

      {/* Points Badge */}
      {isPointsProduct && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
          <span>🪙</span>
          <span>{t('cart.points_exchange')}</span>
        </div>
      )}

      {/* Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 backdrop-blur-sm rounded-full shadow-sm active:scale-95 transition-transform"
      >
        <Heart 
          className={`w-4 h-4 ${isFavorited ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
        />
      </button>

      {/* Product Image */}
      <div className="relative h-48 overflow-hidden rounded-t-2xl">
        <MobileImageWithFallback
          src={getImageSrc()}
          alt={product.name}
          className="w-full h-full object-cover group-active:scale-105 transition-transform duration-200"
        />
        
        {/* Video Indicator */}
        {product.mediaType === 'video' && product.video && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
            {t('products.video')}
          </div>
        )}

        {/* Stock Status */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">{t('common.out_of_stock')}</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {/* Product Description */}
        {product.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {cleanDescription(product.description)}
          </p>
        )}

        {/* Price and Sales */}
        <div className="flex items-center justify-between mb-3">
          <div>
            {isPointsProduct ? (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-orange-600 flex items-center">
                  {/* <span className="text-orange-500 mr-1">🪙</span> */}
                  {pointsPrice} {t('products.points')}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary-600">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {t('products.sold', {count: product.salesCount || 0})}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || isAddingToCart}
          className={`w-full py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            product.stock === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isAddingToCart
              ? (isPointsProduct ? 'bg-orange-400 text-white cursor-wait' : 'bg-primary-400 text-white cursor-wait')
              : isPointsProduct
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl active:scale-95'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl active:scale-95'
          }`}
        >
          {product.stock === 0 ? (
            t('common.out_of_stock')
          ) : isAddingToCart ? (
            isPointsProduct ? t('products.exchanging') : t('common.adding')
          ) : (
            <div className="flex items-center justify-center space-x-1">
              {isPointsProduct ? (
                <>
                  <span>🪙</span>
                  <span>{t('cart.points_exchange')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t('common.add_to_cart')}</span>
                </>
              )}
            </div>
          )}
        </button>
      </div>
    </Link>
  )
}