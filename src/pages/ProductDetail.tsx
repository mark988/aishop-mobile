import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Heart, Share2, Truck, Shield, Star, User, MessageCircle } from 'lucide-react'
import { apiService, Product } from '../services/api'
import toast from 'react-hot-toast'
import { useCart } from '../contexts/CartContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { useAuth } from '../contexts/AuthContext'

// Helper function to clean HTML tags from description
const cleanHtmlTags = (html: string | undefined): string => {
  if (!html) return ''
  // Remove HTML tags and decode common HTML entities
  const cleanText = html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim()
  
  return cleanText
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()
  const { user } = useAuth()
  const { toggleFavorite: toggleFavoriteApi, isFavorite: checkIsFavorite } = useFavorites()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string}>({})
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('details')
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [averageRating, setAverageRating] = useState('4.8')
  const [totalReviews, setTotalReviews] = useState(0)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [replyStates, setReplyStates] = useState<{[key: string]: { isReplying: boolean, replyText: string, isSubmitting: boolean }}>({})
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  // Cart context
  const { addItem, cartCount } = useCart()

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return

      setLoading(true)
      try {
        const productData = await apiService.getProductDetail(id)
        if (productData) {
          setProduct(productData)

          // Check if product is favorited
          if (user && id) {
            const favorited = checkIsFavorite(id)
            setIsFavorited(favorited)
          }

          // Auto-select first option for each property
          if (productData.property && Object.keys(productData.property).length > 0) {
            const defaultOptions: {[key: string]: string} = {}
            Object.entries(productData.property).forEach(([key, values]) => {
              // Handle different value formats: array, comma-separated string, or single value
              let valueArray: string[];
              if (Array.isArray(values)) {
                valueArray = values;
              } else if (typeof values === 'string' && values.includes(',')) {
                valueArray = values.split(',').map(v => v.trim()).filter(v => v.length > 0);
              } else {
                valueArray = [values];
              }

              if (valueArray.length > 0) {
                defaultOptions[key] = valueArray[0]
              }
            })
            setSelectedOptions(defaultOptions)
          }
        }
      } catch (error) {
        console.error('Failed to fetch product detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
    if (id) {
      fetchReviews()
    }
  }, [id, user, checkIsFavorite])

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change
    if (newQuantity >= 1 && product && newQuantity <= product.stock) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return

    // 检查库存
    if (product.stock <= 0) {
      toast.error(t('productDetail.outOfStock'))
      return
    }

    if (quantity > product.stock) {
      toast.error(t('productDetail.stockInsufficient', { count: product.stock }))
      return
    }

    // 检查是否选择了所有必需的商品属性
    if (!checkRequiredProperties()) {
      const unselectedProperties = Object.keys(product.property || {}).filter(
        key => !selectedOptions[key]
      )
      toast.error(t('productDetail.selectSpecs', { specs: unselectedProperties.join(', ') }))
      return
    }

    // 设置加载状态
    setIsAdding(true)

    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500))

      // 添加到购物车，包含选择的属性
      addItem(product, quantity, selectedOptions)

      // 显示成功状态
      setJustAdded(true)

      // 显示成功提示
      const propertyText = Object.keys(selectedOptions).length > 0
        ? ` (${Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : ''
      toast.success(t('productDetail.addSuccess', {
        quantity,
        name: product.name,
        specs: propertyText
      }), {
        duration: 3000,
        icon: '🛒',
        position: 'top-center',
      })

      // 重置状态
      setTimeout(() => {
        setJustAdded(false)
      }, 3000)

    } catch (error) {
      toast.error(t('productDetail.addFailed'))
    } finally {
      setIsAdding(false)
    }
  }

  // 检查是否所有必需的属性都已选择
  const checkRequiredProperties = () => {
    if (!product?.property || Object.keys(product.property).length === 0) {
      return true // 没有属性要求，直接通过
    }
    
    const requiredProperties = Object.keys(product.property)
    const selectedKeys = Object.keys(selectedOptions)
    
    return requiredProperties.every(key => selectedKeys.includes(key) && selectedOptions[key])
  }

  const handleBuyNow = () => {
    // TODO: Implement buy now functionality
    console.log('Buy now:', { productId: id, quantity, selectedOptions })
  }

  // Fetch reviews
  const fetchReviews = async () => {
    if (!id) return
    
    setReviewsLoading(true)
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Mock reviews data
      const mockReviews = [
        {
          id: '1',
          userId: 'user1',
          userName: '张三',
          rating: 5,
          comment: '产品质量很好，物流也很快，五星好评！',
          createdAt: '2024-01-15T10:30:00Z',
          helpfulCount: 12,
          replies: [
            {
              id: 'r1',
              userId: 'user2',
              userName: '李四',
              content: '我也买了，确实不错！',
              createdAt: '2024-01-16T09:15:00Z'
            }
          ]
        },
        {
          id: '2',
          userId: 'user3',
          userName: '王五',
          rating: 4,
          comment: '总体满意，性价比很高，推荐购买。',
          createdAt: '2024-01-14T16:45:00Z',
          helpfulCount: 8,
          replies: []
        }
      ]
      setReviews(mockReviews)
      setTotalReviews(mockReviews.length)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Submit review
  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      toast.error(t('productDetail.reviewPlaceholder'))
      return
    }

    setIsSubmittingReview(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const review = {
        id: Date.now().toString(),
        userId: 'current-user',
        userName: '当前用户',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
        replies: []
      }

      setReviews(prev => [review, ...prev])
      setTotalReviews(prev => prev + 1)
      setNewReview({ rating: 5, comment: '' })

      toast.success(t('productDetail.reviewSuccess'))
    } catch (error) {
      toast.error(t('productDetail.reviewFailed'))
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Toggle reply
  const handleToggleReply = (reviewId: string) => {
    setReplyStates(prev => ({
      ...prev,
      [reviewId]: {
        isReplying: !prev[reviewId]?.isReplying || false,
        replyText: prev[reviewId]?.replyText || '',
        isSubmitting: false
      }
    }))
  }

  // Submit reply
  const handleSubmitReply = async (reviewId: string) => {
    const replyText = replyStates[reviewId]?.replyText?.trim()
    if (!replyText) {
      toast.error(t('productDetail.replyInputPlaceholder'))
      return
    }

    setReplyStates(prev => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        isSubmitting: true
      }
    }))

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const reply = {
        id: Date.now().toString(),
        userId: 'current-user',
        userName: '当前用户',
        content: replyText,
        createdAt: new Date().toISOString()
      }

      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            replies: [...(review.replies || []), reply]
          }
        }
        return review
      }))

      setReplyStates(prev => ({
        ...prev,
        [reviewId]: {
          isReplying: false,
          replyText: '',
          isSubmitting: false
        }
      }))

      toast.success(t('productDetail.replySuccess'))
    } catch (error) {
      toast.error(t('productDetail.replyFailed'))
      setReplyStates(prev => ({
        ...prev,
        [reviewId]: {
          ...prev[reviewId],
          isSubmitting: false
        }
      }))
    }
  }

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!product) return

    // If user is not logged in, show login dialog
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setFavoriteLoading(true)

    try {
      // Call real favorite API
      const result = await toggleFavoriteApi(product.id)

      // Update local state
      setIsFavorited(result.isFavorite)

      // Show toast
      if (result.action === 'added') {
        toast.success(t('productDetail.favoriteSuccess', { name: product.name }), {
          duration: 2000,
          icon: '❤️',
          position: 'top-center',
        })
      } else {
        toast.success(t('productDetail.unfavoriteSuccess', { name: product.name }), {
          duration: 2000,
          icon: '💔',
          position: 'top-center',
        })
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error)
      // Check if it's a login required error
      if (error.message === 'REQUIRE_LOGIN') {
        setShowLoginDialog(true)
      } else {
        toast.error(t('productDetail.favoriteError'))
      }
    } finally {
      setFavoriteLoading(false)
    }
  }

  // Handle share
  const handleShare = async () => {
    const shareData = {
      title: product?.name || '',
      text: `${product?.name || ''} - ${formatPrice(product?.price || 0)}`,
      url: window.location.href
    }

    try {
      // Check if native share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast.success(t('productDetail.shareSuccess'))
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(window.location.href)
        toast.success(t('productDetail.linkCopied'))
      }
    } catch (error) {
      console.error('分享失败:', error)

      // Final fallback: manual copy
      try {
        const textArea = document.createElement('textarea')
        textArea.value = window.location.href
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success(t('productDetail.linkCopied'))
      } catch (fallbackError) {
        toast.error(t('productDetail.shareFailed'))
      }
    }
  }

  // Handle helpful
  const handleHelpful = (reviewId: string) => {
    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        return {
          ...review,
          helpfulCount: (review.helpfulCount || 0) + 1
        }
      }
      return review
    }))
    toast.success(t('productDetail.thanksForFeedback'))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleGoBack} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('productDetail.title')}</h1>
          </div>
        </div>

        {/* Loading */}
        <div className="p-4">
          <div className="bg-white rounded-2xl overflow-hidden mb-4">
            <div className="h-80 bg-gray-200 animate-pulse"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('productDetail.productNotFound')}</p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            {t('productDetail.backButton')}
          </button>
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
            <button onClick={handleGoBack} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('productDetail.title')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button>
              <Share2 className="w-5 h-5" />
            </button>
            <button>
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Media */}
      <div className="bg-white mb-2">
        <div className="aspect-square relative">
          {product.mediaType === 'video' && product.video ? (
            <video
              className="w-full h-full object-cover"
              src={cleanImageUrl(product.video)}
              controls
              autoPlay
              muted
              playsInline
              poster={product.images && product.images.length > 0 ? cleanImageUrl(product.images[0]) : undefined}
            />
          ) : product.images && product.images.length > 0 ? (
            <>
              <img
                src={cleanImageUrl(product.images[currentImageIndex])}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">{t('productDetail.noImage')}</span>
            </div>
          )}
        </div>

        {/* Image thumbnails */}
        {product.images && product.images.length > 1 && (
          <div className="p-4 flex space-x-2 overflow-x-auto">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  index === currentImageIndex ? 'border-primary-600' : 'border-gray-200'
                }`}
              >
                <img
                  src={cleanImageUrl(image)}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white p-4 mb-2">
        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline space-x-2">
            {product.category === 'points' ? (
              <>
                <span className="text-2xl font-bold text-orange-600">{product.points || 0} 积分</span>
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  积分兑换
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-red-600">{formatPrice(product.price)}</span>
                <span className="text-sm text-gray-500">{t('productDetail.sold')}{product.salesCount}</span>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">
          {product.name}
        </h1>

        {/* Basic Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span>4.8</span>
          </div>
          <span>{t('productDetail.brand')}: {product.brand}</span>
          <span>{t('productDetail.stock')}: {product.stock}</span>
          <span>SKU: {product.sku}</span>
          <span>Made in: {product.origin}</span>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center space-x-6 py-3 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <Shield className="w-4 h-4 text-green-600 mr-1" />
            <span>{t('productDetail.authentic')}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Truck className="w-4 h-4 text-blue-600 mr-1" />
            <span>{t('productDetail.fastShipping')}</span>
          </div>
        </div>
      </div>

      {/* Product Options */}
      {product.property && Object.keys(product.property).length > 0 && (
        <div className="bg-white p-4 mb-2">
          <h3 className="text-base font-semibold mb-3">{t('productDetail.selectOptions')}</h3>
          {Object.entries(product.property).map(([key, values]) => {
            // Handle different value formats: array, comma-separated string, or single value
            let valueArray: string[];
            if (Array.isArray(values)) {
              valueArray = values;
            } else if (typeof values === 'string' && values.includes(',')) {
              valueArray = values.split(',').map(v => v.trim()).filter(v => v.length > 0);
            } else {
              valueArray = [values];
            }

            return (
              <div key={key} className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{key}</p>
                <div className="flex flex-wrap gap-2">
                  {valueArray.map((value) => (
                    <button
                      key={value}
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: value }))}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${
                        selectedOptions[key] === value
                          ? 'border-primary-600 bg-primary-50 text-primary-600'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quantity */}
      <div className="bg-white p-4 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{t('productDetail.quantity')}</span>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="px-3 py-1 text-lg font-medium disabled:text-gray-400"
            >
              −
            </button>
            <span className="px-4 py-1 border-x border-gray-300 text-center min-w-[3rem]">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= product.stock}
              className="px-3 py-1 text-lg font-medium disabled:text-gray-400"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Product Description */}
      <div className="bg-white p-4 mb-2">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 px-1 text-center font-medium text-sm transition-all duration-200 ${
              activeTab === 'details'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('productDetail.tab.details')}
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex-1 py-3 px-1 text-center font-medium text-sm transition-all duration-200 ${
              activeTab === 'specs'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('productDetail.tab.specs')}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-3 px-1 text-center font-medium text-sm transition-all duration-200 ${
              activeTab === 'reviews'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('productDetail.reviewsCount', { count: totalReviews })}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="product-details-content">
            <style>{`
              .product-details-content {
                font-size: 14px;
                line-height: 1.6;
                color: #374151;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .rich-text-content {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
                line-height: 1.7;
                color: #374151;
                word-break: break-word;
                overflow-wrap: break-word;
              }
              
              /* Reset default margins */
              .rich-text-content * {
                max-width: 100%;
                box-sizing: border-box;
              }
              
              /* Headings */
              .rich-text-content h1,
              .rich-text-content h2,
              .rich-text-content h3,
              .rich-text-content h4,
              .rich-text-content h5,
              .rich-text-content h6 {
                font-weight: 600;
                margin: 1.5em 0 0.8em 0;
                line-height: 1.4;
                color: #111827;
                word-break: break-word;
              }
              .rich-text-content h1 { font-size: 1.4em; }
              .rich-text-content h2 { font-size: 1.25em; }
              .rich-text-content h3 { font-size: 1.1em; }
              .rich-text-content h4 { font-size: 1em; }
              .rich-text-content h5 { font-size: 0.9em; }
              .rich-text-content h6 { font-size: 0.85em; }
              
              /* Paragraphs */
              .rich-text-content p {
                margin: 0.8em 0;
                text-align: justify;
                word-break: break-word;
                line-height: 1.6;
              }
              .rich-text-content p:first-child {
                margin-top: 0;
              }
              .rich-text-content p:last-child {
                margin-bottom: 0;
              }
              
              /* Lists */
              .rich-text-content ul,
              .rich-text-content ol {
                margin: 1em 0;
                padding-left: 1.2em;
              }
              .rich-text-content li {
                margin: 0.4em 0;
                line-height: 1.6;
                word-break: break-word;
              }
              
              /* Text formatting */
              .rich-text-content strong,
              .rich-text-content b {
                font-weight: 600;
                color: #111827;
              }
              .rich-text-content em,
              .rich-text-content i {
                font-style: italic;
              }
              .rich-text-content u {
                text-decoration: underline;
              }
              .rich-text-content mark {
                background-color: #fef3c7;
                padding: 0.1em 0.2em;
                border-radius: 2px;
              }
              
              /* Links */
              .rich-text-content a {
                color: #2563eb;
                text-decoration: underline;
                word-break: break-all;
              }
              .rich-text-content a:hover {
                color: #1d4ed8;
              }
              
              /* Images */
              .rich-text-content img {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 6px;
                margin: 1em 0;
                display: block;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              
              /* Videos */
              .rich-text-content video {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 6px;
                margin: 1em 0;
              }
              
              /* Blockquotes */
              .rich-text-content blockquote {
                border-left: 4px solid #e5e7eb;
                padding: 0.8em 1em;
                margin: 1em 0;
                background-color: #f9fafb;
                border-radius: 0 6px 6px 0;
                font-style: italic;
                color: #6b7280;
              }
              .rich-text-content blockquote p {
                margin: 0;
              }
              
              /* Code */
              .rich-text-content code {
                background-color: #f3f4f6;
                padding: 0.15em 0.3em;
                border-radius: 3px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                font-size: 0.85em;
                color: #e53e3e;
                word-break: break-all;
              }
              .rich-text-content pre {
                background-color: #f3f4f6;
                padding: 1em;
                border-radius: 6px;
                overflow-x: auto;
                margin: 1em 0;
                font-size: 0.85em;
              }
              .rich-text-content pre code {
                background: none;
                padding: 0;
                color: #374151;
                white-space: pre;
              }
              
              /* Tables */
              .rich-text-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 1em 0;
                font-size: 0.9em;
                overflow: hidden;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .rich-text-content th,
              .rich-text-content td {
                border: 1px solid #e5e7eb;
                padding: 0.6em;
                text-align: left;
                word-break: break-word;
              }
              .rich-text-content th {
                background-color: #f9fafb;
                font-weight: 600;
                color: #111827;
              }
              .rich-text-content td {
                background-color: #ffffff;
              }
              
              /* Horizontal rules */
              .rich-text-content hr {
                border: none;
                height: 1px;
                background-color: #e5e7eb;
                margin: 1.5em 0;
              }
              
              /* Spacing utilities for common rich text editor outputs */
              .rich-text-content .ql-editor,
              .rich-text-content .ql-container {
                font-family: inherit !important;
                font-size: inherit !important;
              }
              
              /* Handle common rich text editor classes */
              .rich-text-content .ql-align-center {
                text-align: center;
              }
              .rich-text-content .ql-align-right {
                text-align: right;
              }
              .rich-text-content .ql-align-justify {
                text-align: justify;
              }
              
              /* Color utilities */
              .rich-text-content .ql-color-red {
                color: #dc2626;
              }
              .rich-text-content .ql-color-blue {
                color: #2563eb;
              }
              .rich-text-content .ql-color-green {
                color: #16a34a;
              }
              
              /* Background colors */
              .rich-text-content .ql-bg-yellow {
                background-color: #fef3c7;
                padding: 0.1em 0.2em;
                border-radius: 2px;
              }
              
              /* Mobile optimizations */
              @media (max-width: 480px) {
                .rich-text-content {
                  font-size: 14px;
                }
                .rich-text-content h1 { font-size: 1.3em; }
                .rich-text-content h2 { font-size: 1.2em; }
                .rich-text-content h3 { font-size: 1.1em; }
                .rich-text-content table {
                  font-size: 0.8em;
                }
                .rich-text-content th,
                .rich-text-content td {
                  padding: 0.4em;
                }
              }
            `}</style>
            {product.description ? (
              <div 
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-300 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">{t('productDetail.noDescription')}</p>
                <p className="text-gray-400 text-xs mt-1">{t('productDetail.descriptionPending')}</p>
              </div>
            )}
          </div>
        ) : activeTab === 'specs' ? (
          <div className="space-y-4">
            {/* Product Properties */}
            {product.property && Object.keys(product.property).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{t('productDetail.productAttributes')}</h4>
                <div className="space-y-2">
                  {Object.entries(product.property).map(([key, values]) => {
                    const valueArray = Array.isArray(values) ? values : [values]
                    return (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-gray-600 text-sm">{key}</span>
                        <span className="font-medium text-gray-900 text-sm">
                          {valueArray.join(', ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Basic Specifications */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{t('productDetail.basicInfo')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.productName')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.productCategory')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.productPrice')}</span>
                  <span className="font-medium text-primary-600 text-sm">{formatPrice(product.price)}</span>
                </div>
                {/* <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">库存数量</span>
                  <span className="font-medium text-gray-900 text-sm">{product.stock} 件</span>
                </div> */}
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.brand')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.brand || t('productDetail.qualityBrand')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.origin')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.origin || t('productDetail.china')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600 text-sm">{t('productDetail.sku')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.sku || t('productDetail.none')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 text-sm">{t('productDetail.sales')}</span>
                  <span className="font-medium text-gray-900 text-sm">{product.salesCount || 0} {t('productDetail.units')}</span>
                </div>
              </div>
            </div>
            
            {/* Service Information */}
            {/* <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">服务保障</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>正品保证，假一赔十</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>24小时内发货，3-5天送达</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-600" />
                  <span>7天无理由退换货</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-600" />
                  <span>全国联保，品质保证</span>
                </div>
              </div>
            </div> */}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reviews Summary */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{averageRating}</div>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${
                        i < Math.floor(parseFloat(averageRating))
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`} />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('productDetail.averageRating')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{t('productDetail.totalReviews', { count: totalReviews })}</div>
                <div className="text-xs text-gray-500">{t('productDetail.positiveRate', { rate: 98 })}</div>
              </div>
            </div>

            {/* Write Review */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{t('productDetail.writeReview')}</h4>

              {/* Rating */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-2">{t('productDetail.rating')}</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                      className="p-1"
                    >
                      <Star className={`w-5 h-5 ${
                        rating <= newReview.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{t('productDetail.stars', { count: newReview.rating })}</span>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-3">
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder={t('productDetail.shareExperience')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {newReview.comment.length}/500
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !newReview.comment.trim()}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isSubmittingReview || !newReview.comment.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSubmittingReview ? t('productDetail.submitting') : t('productDetail.submitReview')}
              </button>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">{t('productDetail.loadingReviews')}</p>
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 text-sm">{review.userName}</span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${
                                  i < review.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`} />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                          {review.comment}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <button
                            onClick={() => handleHelpful(review.id)}
                            className="flex items-center space-x-1 hover:text-primary-600"
                          >
                            <span>👍</span>
                            <span>{t('productDetail.helpful')} ({review.helpfulCount || 0})</span>
                          </button>
                          <button
                            onClick={() => handleToggleReply(review.id)}
                            className="flex items-center space-x-1 hover:text-primary-600"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>{t('productDetail.reply')}</span>
                          </button>
                        </div>

                        {/* Reply Form */}
                        {replyStates[review.id]?.isReplying && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <textarea
                              value={replyStates[review.id]?.replyText || ''}
                              onChange={(e) => setReplyStates(prev => ({
                                ...prev,
                                [review.id]: {
                                  ...prev[review.id],
                                  replyText: e.target.value
                                }
                              }))}
                              placeholder={t('productDetail.replyPlaceholder')}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                              maxLength={200}
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-gray-500">
                                {replyStates[review.id]?.replyText?.length || 0}/200
                              </span>
                              <div className="space-x-2">
                                <button
                                  onClick={() => handleToggleReply(review.id)}
                                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                  disabled={replyStates[review.id]?.isSubmitting}
                                >
                                  {t('productDetail.cancel')}
                                </button>
                                <button
                                  onClick={() => handleSubmitReply(review.id)}
                                  disabled={replyStates[review.id]?.isSubmitting || !replyStates[review.id]?.replyText?.trim()}
                                  className={`px-3 py-1 text-xs rounded font-medium ${
                                    replyStates[review.id]?.isSubmitting || !replyStates[review.id]?.replyText?.trim()
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-primary-600 text-white hover:bg-primary-700'
                                  }`}
                                >
                                  {replyStates[review.id]?.isSubmitting ? t('productDetail.sending') : t('productDetail.sendReply')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {review.replies && review.replies.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {review.replies.map((reply: any) => (
                              <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                                <div className="flex items-start space-x-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-xs font-medium text-gray-700">{reply.userName}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(reply.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">{t('productDetail.noReviews')}</p>
                  <p className="text-gray-400 text-xs mt-1">{t('productDetail.beFirstReviewer')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="bg-white p-4">
        <h3 className="text-base font-semibold mb-3">{t('productDetail.productInfo')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('productDetail.productCode')}</span>
            <span>{product.sku}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('productDetail.productOrigin')}</span>
            <span>{product.origin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('productDetail.category')}</span>
            <span>{product.category}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-bottom">
        <div className="flex space-x-2">
          {/* Go to Cart Button */}
          <Link
            to="/cart"
            className="px-4 py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-200 bg-orange-500 hover:bg-orange-600 text-white relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stock <= 0 || quantity > product.stock}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 ${
              justAdded
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : product.stock <= 0 || quantity > product.stock
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isAdding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>{t('productDetail.addingToCart')}</span>
              </>
            ) : justAdded ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('productDetail.addedToCart')}</span>
              </>
            ) : product.stock <= 0 ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2 opacity-50" />
                <span>{t('productDetail.outOfStock')}</span>
              </>
            ) : quantity > product.stock ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2 opacity-50" />
                <span>{t('productDetail.stockInsufficient', { count: product.stock })}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>{t('productDetail.addToCart')}</span>
              </>
            )}
          </button>

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteToggle}
            disabled={favoriteLoading}
            className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-200 min-w-[64px] ${
              isFavorited
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } ${favoriteLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {favoriteLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="px-4 py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-200 bg-gray-100 hover:bg-gray-200 text-gray-700 min-w-[64px]"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Buy Now Button - Full Width Below */}
        {/* <button
          onClick={handleBuyNow}
          className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors duration-200"
        >
          立即购买
        </button> */}
      </div>

      {/* Login Required Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('login.required_title')}
              </h3>
              <p className="text-gray-600">
                {t('login.required_message')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginDialog(false)}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowLoginDialog(false)
                  // Save current path to return after login
                  sessionStorage.setItem('returnPath', window.location.pathname)
                  navigate('/login')
                }}
                className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                {t('login.go_to_login')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}