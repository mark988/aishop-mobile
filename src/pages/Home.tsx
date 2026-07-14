import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Truck, Headphones, Award, Sparkles, ShoppingCart, Search, X, Mail, Phone, MapPin, Clock, Info, Users, TrendingUp, FileText, CreditCard } from 'lucide-react'
import { apiService, Category, Product, HeroBanner, HomeInitData, ProductListResponse } from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useLanguage } from '../contexts/LanguageContext'
import { usePointsExchange } from '../contexts/PointsExchangeContext'
import { useProductsList } from '../hooks/useProductsList'
import MobileImageWithFallback from '../components/MobileImageWithFallback'
import toast from 'react-hot-toast'

// Helper function to clean image URLs
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  // Remove surrounding quotes if they exist
  let cleanUrl = url.trim()
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
  }
  return cleanUrl
}

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
  
  return cleanText.length > 30 ? `${cleanText.substring(0, 30)}...` : cleanText
}

export default function Home() {
  const { formatPrice } = useCurrency()
  const { calculatePointsFromMoney } = usePointsExchange()
  const { t } = useLanguage()
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [homeData, setHomeData] = useState<HomeInitData | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRotateInterval, setAutoRotateInterval] = useState<NodeJS.Timeout | null>(null)
  const [videoPlayTimeout, setVideoPlayTimeout] = useState<NodeJS.Timeout | null>(null)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [videoLoadingStates, setVideoLoadingStates] = useState<{[key: string]: 'loading' | 'loaded' | 'error' | 'buffering'}>({})
  const [videoErrorStates, setVideoErrorStates] = useState<{[key: string]: string}>({})
  const [videoBufferingCount, setVideoBufferingCount] = useState<{[key: string]: number}>({})

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchPagination, setSearchPagination] = useState({
    current: 1,
    size: 12,
    total: 0,
    pages: 0
  })

  // 搜索建议下拉（实时商品建议），复用与 PC 端一致的 useProductsList 接口
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const { products: suggestions, loading: suggestionsLoading } = useProductsList({
    page: 1,
    size: 6,
    search: searchQuery.trim() || undefined
  })

  // Cart context
  const { addItem } = useCart()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeInitData, aiData, featuredData] = await Promise.all([
          apiService.getHomeInit(),
          apiService.getAiRecommendations(8),
          apiService.getFeaturedProducts(12)
        ])
        
        setHomeData(homeInitData)
        setAiRecommendations(aiData)
        setFeaturedProducts(featuredData)
      } catch (error) {
        console.error('Failed to fetch home data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Auto-rotate logic for banners
  const startAutoRotate = (currentBanner: HeroBanner) => {
    if (autoRotateInterval) {
      clearTimeout(autoRotateInterval)
    }

    let duration: number
    if (currentBanner.type === 'image') {
      duration = 3000 // 3 seconds for images
    } else {
      duration = 5000 // Default 5 seconds for videos (will be updated when video loads)
    }

    const interval = setTimeout(() => {
      if (homeData?.heroBanners && homeData.heroBanners.length > 0) {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % homeData.heroBanners.length)
      }
    }, duration)

    setAutoRotateInterval(interval)
  }

  // Handle video duration for precise timing
  const handleVideoLoadedMetadata = (videoElement: HTMLVideoElement) => {
    if (autoRotateInterval) {
      clearTimeout(autoRotateInterval)
    }

    // Force video to play
    videoElement.play().catch(err => {
      console.warn('Video autoplay failed:', err)
    })

    const videoDuration = videoElement.duration * 1000 // Convert to milliseconds
    const interval = setTimeout(() => {
      if (homeData?.heroBanners && homeData.heroBanners.length > 0) {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % homeData.heroBanners.length)
      }
    }, videoDuration)

    setAutoRotateInterval(interval)
  }

  useEffect(() => {
    // Clear previous video play timeout
    if (videoPlayTimeout) {
      clearTimeout(videoPlayTimeout)
      setVideoPlayTimeout(null)
    }

    if (homeData?.heroBanners && homeData.heroBanners.length > 0) {
      const currentBanner = homeData.heroBanners[currentAdIndex]
      startAutoRotate(currentBanner)

      // If current banner is video, try to play it after a short delay
      if (currentBanner.type === 'video') {
        const timeout = setTimeout(() => {
          const videoElement = document.querySelector(`video[key="${currentBanner.id}"]`) as HTMLVideoElement ||
                              document.querySelector('video:not([style*="translateX"])') as HTMLVideoElement
          if (videoElement) {
            console.log('Attempting to play video for banner:', currentBanner.id)
            const playPromise = videoElement.play()
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                // Only log if it's not an abort error (which is expected when switching banners)
                if (err.name !== 'AbortError') {
                  console.warn('Failed to auto-play video:', err)
                }
              })
            }
          } else {
            console.warn('Video element not found for banner:', currentBanner.id)
          }
        }, 500)
        setVideoPlayTimeout(timeout)
      }
    }

    return () => {
      if (autoRotateInterval) {
        clearTimeout(autoRotateInterval)
      }
      if (videoPlayTimeout) {
        clearTimeout(videoPlayTimeout)
      }
    }
  }, [currentAdIndex, homeData?.heroBanners])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (autoRotateInterval) {
        clearTimeout(autoRotateInterval)
      }
      if (videoPlayTimeout) {
        clearTimeout(videoPlayTimeout)
      }
    }
  }, [])

  const goToSlide = (index: number) => {
    setCurrentAdIndex(index)
    // Clear current auto-rotate when user manually navigates
    if (autoRotateInterval) {
      clearTimeout(autoRotateInterval)
    }
    // Clear video play timeout
    if (videoPlayTimeout) {
      clearTimeout(videoPlayTimeout)
      setVideoPlayTimeout(null)
    }
    // Restart auto-rotate for the new slide
    if (homeData?.heroBanners && homeData.heroBanners[index]) {
      setTimeout(() => startAutoRotate(homeData.heroBanners[index]), 100)
    }
  }

  // Handle add to cart from home page
  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault() // Prevent navigation to product detail page
    e.stopPropagation()
    
    if (addingToCart === product.id) return // Prevent double-clicking
    
    // Check stock
    if (product.stock <= 0) {
      toast.error(t('common.out_of_stock'))
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
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Add to cart with default properties and quantity 1
      addItem(product, 1, defaultProperties)
      
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
      toast.error(t('cart.add_failed'))
    } finally {
      setAddingToCart(null)
    }
  }

  // Search functionality
  const handleSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      setSearchPagination({ current: 1, size: 12, total: 0, pages: 0 })
      return
    }

    setIsSearching(true)
    setSearchLoading(true)

    try {
      const result = await apiService.getProducts(page, 12, 'created_at', 'DESC', undefined, query.trim())
      if (result) {
        setSearchResults(result.records)
        setSearchPagination({
          current: result.current,
          size: result.size,
          total: result.total,
          pages: result.pages
        })
      } else {
        setSearchResults([])
        setSearchPagination({ current: 1, size: 12, total: 0, pages: 0 })
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
      setSearchPagination({ current: 1, size: 12, total: 0, pages: 0 })
      toast.error(t('search.no_results'))
    } finally {
      setSearchLoading(false)
    }
  }

  // Handle search input change —— 仅更新输入并打开建议下拉；
  // 实时建议由 useProductsList(search) 的内置防抖驱动，全量搜索改为回车/“查看全部”时才触发
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setShowDropdown(true)

    // Reset pagination when query changes
    setSearchPagination({ current: 1, size: 12, total: 0, pages: 0 })
  }

  // 点击某条建议 → 进入商品详情
  const handleSuggestionClick = (id: string) => {
    setShowDropdown(false)
    navigate(`/product/${id}`)
  }

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowDropdown(false)
    handleSearch(searchQuery, 1) // Always start from page 1 for manual search
  }

  // Handle search pagination
  const handleSearchPageChange = (page: number) => {
    handleSearch(searchQuery, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
    setShowSearch(false)
    setShowDropdown(false)
    setSearchPagination({ current: 1, size: 12, total: 0, pages: 0 })
  }

  // 点击搜索框外部时关闭建议下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen-mobile bg-gradient-to-br from-secondary-50 to-primary-50 w-full max-w-full overflow-x-hidden">
      {/* Hero Banner Carousel - NO TRANSFORM VERSION */}
      <section className="relative h-64 w-full max-w-full overflow-hidden">
        {/* Show only current banner without CSS transform */}
        {homeData?.heroBanners && homeData.heroBanners.length > 0 && homeData.heroBanners[currentAdIndex] && (
          <div className="w-full h-full relative">
            {homeData.heroBanners[currentAdIndex].type === 'video' && homeData.heroBanners[currentAdIndex].video ? (
              <div className="w-full h-full relative bg-gray-900">
                <video
                  key={`video-${homeData.heroBanners[currentAdIndex].id}-${currentAdIndex}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    position: 'static',
                    border: 'none',
                    outline: 'none',
                    margin: 0,
                    padding: 0,
                    objectFit: 'cover',
                    backgroundColor: '#1f2937'
                  }}
                  src={cleanImageUrl(homeData.heroBanners[currentAdIndex].video)}
                  poster={cleanImageUrl(homeData.heroBanners[currentAdIndex].image) || undefined}
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  preload="metadata"
                  onLoadStart={() => {
                    const bannerId = homeData.heroBanners[currentAdIndex].id
                    setVideoLoadingStates(prev => ({ ...prev, [bannerId]: 'loading' }))
                    console.log('[Banner Video] Loading started:', {
                      id: bannerId,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onLoadedMetadata={(e) => {
                    const bannerId = homeData.heroBanners[currentAdIndex].id
                    setVideoLoadingStates(prev => ({ ...prev, [bannerId]: 'loaded' }))
                    console.log('[Banner Video] Metadata loaded:', {
                      id: bannerId,
                      duration: e.currentTarget.duration,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                    handleVideoLoadedMetadata(e.currentTarget)
                  }}
                  onCanPlay={() => {
                    console.log('[Banner Video] Can play:', {
                      id: homeData.heroBanners[currentAdIndex].id,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onPlay={() => {
                    console.log('[Banner Video] Playing:', {
                      id: homeData.heroBanners[currentAdIndex].id,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onPause={() => {
                    console.log('[Banner Video] Paused:', {
                      id: homeData.heroBanners[currentAdIndex].id,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onWaiting={() => {
                    console.log('[Banner Video] Waiting/Buffering:', {
                      id: homeData.heroBanners[currentAdIndex].id,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onStalled={() => {
                    console.log('[Banner Video] Stalled:', {
                      id: homeData.heroBanners[currentAdIndex].id,
                      url: cleanImageUrl(homeData.heroBanners[currentAdIndex].video)
                    })
                  }}
                  onEnded={() => {
                    console.log('[Banner Video] Ended:', {
                      id: homeData.heroBanners[currentAdIndex].id
                    })
                    if (homeData?.heroBanners && homeData.heroBanners.length > 0) {
                      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % homeData.heroBanners.length)
                    }
                  }}
                  onError={(e) => {
                    const error = e.currentTarget.error
                    const bannerId = homeData.heroBanners[currentAdIndex].id
                    const videoUrl = cleanImageUrl(homeData.heroBanners[currentAdIndex].video)

                    const errorMessages: {[key: number]: string} = {
                      1: 'User aborted video playback',
                      2: 'Network error - video could not be loaded',
                      3: 'Video decode error - format may be corrupted',
                      4: 'Video format not supported by browser'
                    }

                    const errorMsg = error?.code ? errorMessages[error.code] : 'Unknown error'

                    setVideoLoadingStates(prev => ({ ...prev, [bannerId]: 'error' }))
                    setVideoErrorStates(prev => ({ ...prev, [bannerId]: errorMsg }))

                    console.error('[Banner Video] Error:', {
                      id: bannerId,
                      url: videoUrl,
                      errorCode: error?.code,
                      errorMessage: error?.message,
                      friendlyMessage: errorMsg,
                      errorDetails: {
                        MEDIA_ERR_ABORTED: error?.code === 1,
                        MEDIA_ERR_NETWORK: error?.code === 2,
                        MEDIA_ERR_DECODE: error?.code === 3,
                        MEDIA_ERR_SRC_NOT_SUPPORTED: error?.code === 4
                      }
                    })

                    // Try to skip to next banner after 3 seconds
                    setTimeout(() => {
                      if (homeData?.heroBanners && homeData.heroBanners.length > 0) {
                        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % homeData.heroBanners.length)
                      }
                    }, 3000)
                  }}
                />

                {/* Loading indicator */}
                {videoLoadingStates[homeData.heroBanners[currentAdIndex].id] === 'loading' && (
                  <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center" style={{zIndex: 1}}>
                    <div className="text-center text-white">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm">{t('common.loading')}</p>
                    </div>
                  </div>
                )}

                {/* Buffering indicator */}
                {videoLoadingStates[homeData.heroBanners[currentAdIndex].id] === 'buffering' && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center" style={{zIndex: 1}}>
                    <div className="text-center text-white">
                      <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs">{t('common.loading')}</p>
                    </div>
                  </div>
                )}

                {/* Error indicator */}
                {videoLoadingStates[homeData.heroBanners[currentAdIndex].id] === 'error' && (
                  <div className="absolute inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center" style={{zIndex: 1}}>
                    <div className="text-center text-white p-4">
                      <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium mb-1">{t('status.failed')}</p>
                      <p className="text-xs opacity-75">{videoErrorStates[homeData.heroBanners[currentAdIndex].id]}</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center" style={{zIndex: 2}}>
                  <div className="text-center text-white p-4">
                    <h2 className="text-2xl font-bold mb-2">{homeData.heroBanners[currentAdIndex].title}</h2>
                    {homeData.heroBanners[currentAdIndex].subtitle && (
                      <p className="text-lg opacity-90 mb-1">{homeData.heroBanners[currentAdIndex].subtitle}</p>
                    )}
                    {homeData.heroBanners[currentAdIndex].description && (
                      <p className="text-sm opacity-80 mb-3">{homeData.heroBanners[currentAdIndex].description}</p>
                    )}
                    {homeData.heroBanners[currentAdIndex].price && (
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <span className="text-xl font-bold text-yellow-300">{formatPrice(homeData.heroBanners[currentAdIndex].price)}</span>
                        {homeData.heroBanners[currentAdIndex].originalPrice && (
                          <span className="text-sm text-gray-300 line-through">{formatPrice(homeData.heroBanners[currentAdIndex].originalPrice)}</span>
                        )}
                        {homeData.heroBanners[currentAdIndex].discount && (
                          <span className="text-sm bg-red-500 px-2 py-1 rounded">{homeData.heroBanners[currentAdIndex].discount}</span>
                        )}
                      </div>
                    )}
                    {homeData.heroBanners[currentAdIndex].ctaText && homeData.heroBanners[currentAdIndex].ctaLink && (
                      <Link
                        to={homeData.heroBanners[currentAdIndex].ctaLink}
                        className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors"
                      >
                        {homeData.heroBanners[currentAdIndex].ctaText}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : homeData.heroBanners[currentAdIndex].image ? (
              <div className="w-full h-full relative">
                <img 
                  className="w-full h-full object-cover"
                  src={cleanImageUrl(homeData.heroBanners[currentAdIndex].image)}
                  alt={homeData.heroBanners[currentAdIndex].title}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center" style={{zIndex: 2}}>
                  <div className="text-center text-white p-4">
                    <h2 className="text-2xl font-bold mb-2">{homeData.heroBanners[currentAdIndex].title}</h2>
                    {homeData.heroBanners[currentAdIndex].subtitle && (
                      <p className="text-lg opacity-90 mb-1">{homeData.heroBanners[currentAdIndex].subtitle}</p>
                    )}
                    {homeData.heroBanners[currentAdIndex].description && (
                      <p className="text-sm opacity-80 mb-3">{homeData.heroBanners[currentAdIndex].description}</p>
                    )}
                    {homeData.heroBanners[currentAdIndex].price && (
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <span className="text-xl font-bold text-yellow-300">{formatPrice(homeData.heroBanners[currentAdIndex].price)}</span>
                        {homeData.heroBanners[currentAdIndex].originalPrice && (
                          <span className="text-sm text-gray-300 line-through">{formatPrice(homeData.heroBanners[currentAdIndex].originalPrice)}</span>
                        )}
                        {homeData.heroBanners[currentAdIndex].discount && (
                          <span className="text-sm bg-red-500 px-2 py-1 rounded">{homeData.heroBanners[currentAdIndex].discount}</span>
                        )}
                      </div>
                    )}
                    {homeData.heroBanners[currentAdIndex].ctaText && homeData.heroBanners[currentAdIndex].ctaLink && (
                      <Link
                        to={homeData.heroBanners[currentAdIndex].ctaLink}
                        className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors"
                      >
                        {homeData.heroBanners[currentAdIndex].ctaText}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <h2 className="text-2xl font-bold mb-2">{homeData.heroBanners[currentAdIndex].title}</h2>
                  {homeData.heroBanners[currentAdIndex].description && (
                    <p className="text-sm opacity-90 mb-3">{homeData.heroBanners[currentAdIndex].description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Stats - Why Choose Us (4 items in one row) */}
      <section className="px-4 py-6 w-full max-w-full">
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '8px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div className="text-center">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-xs text-gray-600 leading-tight">{t('home.features.authentic')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 leading-tight">{t('home.features.fast_delivery')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Headphones className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600 leading-tight">{t('home.features.support')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600 leading-tight">{t('home.features.quality')}</p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="px-4 py-4 bg-white shadow-sm">
        <div ref={searchBoxRef} className="relative">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onFocus={() => { setShowSearch(true); setShowDropdown(true) }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>

          {/* 实时商品建议：in-flow 展开，优雅地把下方内容推下去；收起时再优雅归位
              （移动端全局 div/section 被强制 overflow-x:hidden，绝对定位会被裁剪，故改为文档流内展开） */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showDropdown && searchQuery.trim()
                ? 'max-h-[70vh] opacity-100 mt-3'
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {suggestionsLoading ? (
                  <div className="p-6 text-center">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">{t('search.searching')}</p>
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    <p className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-500 flex items-center">
                      <Search className="w-3.5 h-3.5 mr-1.5" />
                      {t('search.results')}
                    </p>
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSuggestionClick(product.id)}
                        className="w-full flex items-center p-2 rounded-xl text-left active:bg-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <MobileImageWithFallback
                          src={product.image || ''}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {product.category} · {formatPrice(product.price)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowDropdown(false); handleSearch(searchQuery, 1) }}
                      className="w-full mt-1 py-2 text-sm text-primary-600 font-medium active:text-primary-700"
                    >
                      {t('search.view_all')}
                    </button>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm mb-2">{t('search.no_results')}</p>
                    <button
                      type="button"
                      onClick={() => { setShowDropdown(false); handleSearch(searchQuery, 1) }}
                      className="text-primary-600 text-sm font-medium active:text-primary-700"
                    >
                      {t('search.search_all_for', { term: searchQuery })}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {isSearching && (
        <section className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-mobile-title">
              {t('search.all_products')} {searchQuery && `"${searchQuery}"`}
              {searchPagination.total > 0 && (
                <span className="text-sm text-gray-500 font-normal ml-2">
                  ({t('products.total_found', {count: searchPagination.total})})
                </span>
              )}
            </h2>
            <button
              onClick={handleClearSearch}
              className="text-primary-600 text-sm font-medium"
            >
              {t('nav.home')}
            </button>
          </div>

          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">{t('products.loading')}</p>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {searchResults.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm">
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="aspect-square mb-3 relative overflow-hidden rounded-xl bg-gray-50">
                      {product.mediaType === 'video' && product.video ? (
                        <video
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          poster={cleanImageUrl(product.images?.[0])}
                        >
                          <source src={cleanImageUrl(product.video)} type="video/mp4" />
                        </video>
                      ) : product.images && product.images.length > 0 ? (
                        <img
                          src={cleanImageUrl(product.images[0])}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="space-y-2">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-primary-600">
                        {product.name}
                      </h3>
                    </Link>
                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {cleanHtmlTags(product.description)}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-primary-600 font-bold text-lg">{formatPrice(product.price)}</span>
                        <span className="text-xs text-gray-400">{t('products.sold', {count: product.salesCount})}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={product.stock <= 0 || addingToCart === product.id}
                      className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all duration-300 ${
                        product.stock <= 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : addingToCart === product.id
                          ? 'bg-primary-300 text-white cursor-wait'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      {addingToCart === product.id ? t('common.adding') : product.stock <= 0 ? t('common.out_of_stock') : t('common.add_to_cart')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('products.not_found')}</h3>
              <p className="text-gray-500 text-sm mb-4">{t('products.adjust_filters')}</p>
              <button
                onClick={handleClearSearch}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t('nav.home')}
              </button>
            </div>
          )}

          {/* Search Pagination */}
          {!searchLoading && searchResults.length > 0 && searchPagination.pages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2">
              {/* Previous Page */}
              <button
                onClick={() => handleSearchPageChange(searchPagination.current - 1)}
                disabled={searchPagination.current <= 1}
                className={`px-3 py-2 text-sm rounded ${
                  searchPagination.current <= 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('pagination.previous')}
              </button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, searchPagination.pages) }, (_, index) => {
                const startPage = Math.max(1, searchPagination.current - 2)
                const pageNumber = startPage + index

                if (pageNumber > searchPagination.pages) return null

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handleSearchPageChange(pageNumber)}
                    className={`px-3 py-2 text-sm rounded ${
                      pageNumber === searchPagination.current
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
                onClick={() => handleSearchPageChange(searchPagination.current + 1)}
                disabled={searchPagination.current >= searchPagination.pages}
                className={`px-3 py-2 text-sm rounded ${
                  searchPagination.current >= searchPagination.pages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('pagination.next')}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          {!searchLoading && searchResults.length > 0 && searchPagination.pages > 1 && (
            <div className="text-center mt-3 text-xs text-gray-500">
              {t('pagination.showing', {
                start: (searchPagination.current - 1) * searchPagination.size + 1,
                end: Math.min(searchPagination.current * searchPagination.size, searchPagination.total),
                total: searchPagination.total
              })}
            </div>
          )}
        </section>
      )}

      {/* Main Home Content - Only show when not searching */}
      {!isSearching && (
        <>
          {/* Popular Categories */}
      <section className="px-4 py-6 w-full max-w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-mobile-title">{t('home.categories.title')}</h2>
          <Link
            to="/categories"
            className="text-primary-600 text-sm font-medium flex items-center"
          >
            {t('filter.all_categories')}
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '8px',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          {homeData?.categories && homeData.categories.length > 0 ? homeData.categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.key || category.name}`}
              className="text-center group w-full"
            >
              <div
                className="w-full aspect-square max-w-[64px] mx-auto rounded-2xl flex items-center justify-center mb-2 group-active:scale-95 transition-transform shadow-sm overflow-hidden relative"
                style={{
                  backgroundColor: category.color || '#f3f4f6',
                  background: category.color ? `linear-gradient(135deg, ${category.color}20, ${category.color}40)` : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
                }}
              >
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
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : category.icon ? (
                    <span className="text-xl">{category.icon}</span>
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-700 font-medium truncate px-1 leading-tight">
                {category.name}
              </p>
            </Link>
          )) : (
            Array.from({length: 8}).map((_, index) => (
              <div key={index} className="text-center group w-full">
                <div className="w-full aspect-square max-w-[64px] mx-auto bg-gray-200 rounded-2xl flex items-center justify-center mb-2 animate-pulse">
                  <span className="text-gray-400">📦</span>
                </div>
                <p className="text-xs text-gray-400 font-medium truncate px-1 leading-tight">
                  {t('common.loading')}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AI Recommendations (2 items per row) */}
      <section className="px-4 py-6 w-full max-w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-mobile-title">{t('ai.recommendation.title')}</h2>
          </div>
          <Link
            to="/ai-recommendations"
            className="text-primary-600 text-sm font-medium flex items-center"
          >
            {t('home.products.view_all')}
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

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
          {aiRecommendations.length > 0 ? aiRecommendations.map((product) => (
            <div key={product.id} className="card-mobile relative">
              <Link to={`/product/${product.id}`} className="block">
                <div className="relative">
                  <div className="h-48 rounded-t-2xl overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={cleanImageUrl(product.images[0])} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : product.video ? (
                      <video 
                        src={cleanImageUrl(product.video)} 
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <div className="h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">{t('status.no_data')}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {t('ai.recommendation.badge')}
                  </div>
                </div>
                <div className="p-4 pb-12">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {cleanHtmlTags(product.description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {product.category === 'points' || product.category === '积分兑换' ? (
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-orange-600">
                          {product.points || calculatePointsFromMoney(product.price)} {t('products.points')}
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
                    <span className="text-xs text-gray-500">{t('products.sales_count', {count: product.salesCount || 0})}</span>
                  </div>
                </div>
              </Link>
              
              {/* Add to Cart Button - Positioned at bottom of card */}
              <button
                onClick={(e) => handleAddToCart(e, product)}
                disabled={addingToCart === product.id || product.stock <= 0}
                className={`absolute bottom-3 left-3 right-3 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center ${
                  addingToCart === product.id
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : product.stock <= 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : (product.category === 'points' || product.category === '积分兑换')
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                }`}
              >
                {addingToCart === product.id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    {(product.category === 'points' || product.category === '积分兑换') ? '兑换中...' : t('common.adding')}
                  </>
                ) : product.stock <= 0 ? (
                  <>
                    <ShoppingCart className="w-3 h-3 mr-1 opacity-50" />
                    {t('common.out_of_stock')}
                  </>
                ) : (
                  <>
                    {(product.category === 'points' || product.category === '积分兑换') ? (
                      <>
                        <span className="mr-1">🪙</span>
                        {t('cart.points_exchange')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {t('common.add_to_cart')}
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          )) : (
            Array.from({length: 8}).map((_, index) => (
              <div key={index} className="card-mobile">
                <div className="h-48 bg-gray-200 rounded-t-2xl animate-pulse"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Featured Products (2 items per row) */}
      <section className="px-4 py-6 w-full max-w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-mobile-title">{t('home.featured.title')}</h2>
          <Link
            to="/featured-products"
            className="text-primary-600 text-sm font-medium flex items-center"
          >
            {t('home.products.view_all')}
            <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

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
          {featuredProducts.length > 0 ? featuredProducts.map((product) => (
            <div key={product.id} className="card-mobile relative">
              <Link to={`/product/${product.id}`} className="block">
                <div className="h-48 rounded-t-2xl overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={cleanImageUrl(product.images[0])} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : product.video ? (
                    <video 
                      src={cleanImageUrl(product.video)} 
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <div className="h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">{t('status.no_data')}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 pb-12">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {cleanHtmlTags(product.description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {product.category === 'points' || product.category === '积分兑换' ? (
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-orange-600">
                          {product.points || calculatePointsFromMoney(product.price)} {t('products.points')}
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
                    <span className="text-xs text-gray-500">{t('products.sales_count', {count: product.salesCount || 0})}</span>
                  </div>
                </div>
              </Link>
              
              {/* Add to Cart Button - Positioned at bottom of card */}
              <button
                onClick={(e) => handleAddToCart(e, product)}
                disabled={addingToCart === product.id || product.stock <= 0}
                className={`absolute bottom-3 left-3 right-3 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center ${
                  addingToCart === product.id
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : product.stock <= 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : (product.category === 'points' || product.category === '积分兑换')
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                }`}
              >
                {addingToCart === product.id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    {(product.category === 'points' || product.category === '积分兑换') ? '兑换中...' : t('common.adding')}
                  </>
                ) : product.stock <= 0 ? (
                  <>
                    <ShoppingCart className="w-3 h-3 mr-1 opacity-50" />
                    {t('common.out_of_stock')}
                  </>
                ) : (
                  <>
                    {(product.category === 'points' || product.category === '积分兑换') ? (
                      <>
                        <span className="mr-1">🪙</span>
                        {t('cart.points_exchange')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {t('common.add_to_cart')}
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          )) : (
            Array.from({length: 12}).map((_, index) => (
              <div key={index} className="card-mobile">
                <div className="h-48 bg-gray-200 rounded-t-2xl animate-pulse"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Brand Stats */}
      <section className="px-4 py-6 bg-white mx-4 rounded-2xl shadow-soft">
        <div className="text-center">
          <h3 className="text-mobile-subtitle mb-4">{t('about.stats.title')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary-600 mb-1">10{t('common.wan')}+</div>
              <p className="text-xs text-gray-600">{t('about.stats.users')}</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">5{t('common.wan')}+</div>
              <p className="text-xs text-gray-600">{t('about.stats.products')}</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-1">99%</div>
              <p className="text-xs text-gray-600">{t('about.stats.rating')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing between Brand Stats and Contact Us */}
      {/* Mobile About Us Section - Mission, Vision, Values, and Refund Policy Cards */}
      <section className="px-4 py-6 bg-white mx-4 rounded-2xl shadow-soft mt-4">
        <h3 className="text-mobile-subtitle mb-4 text-center">{t('home.about.title')}</h3>
        <div className="grid grid-cols-1 gap-3">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {t('home.about.mission.title')}
                </h4>
                <p className="text-xs text-gray-700 line-clamp-2">
                  {t('home.about.mission.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Vision Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {t('home.about.vision.title')}
                </h4>
                <p className="text-xs text-gray-700 line-clamp-2">
                  {t('home.about.vision.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Values Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {t('home.about.values.title')}
                </h4>
                <p className="text-xs text-gray-700 line-clamp-2">
                  {t('home.about.values.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Policy Card */}
          <Link to="/refund-policy" className="no-underline">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    Refund Policy
                  </h4>
                  <p className="text-xs text-gray-700 line-clamp-2">
                    Our comprehensive refund and return policy for customer satisfaction
                  </p>
                </div>
              </div>
            </div>
          </Link>

          {/* Wholesale Payment Notice Card */}
          <Link to="/wholesale-payment-notice" className="no-underline">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {t('home.about.wholesale.title')}
                  </h4>
                  <p className="text-xs text-gray-700 line-clamp-2">
                    {t('home.about.wholesale.description')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <div className="h-8"></div>

      {/* Contact Us */}
      <section className="px-4 py-8 bg-white mx-4 rounded-2xl shadow-soft">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full mb-3 shadow-lg">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t('home.contact.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('home.contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Phone */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-3">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                {t('home.contact.phone.title')}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {t('home.contact.phone.time')}
              </p>
              <a href="tel:+61426685918" className="text-blue-600 font-medium text-xs break-all">
                09780080555<br/>09780080666
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                {t('home.contact.email.title')}
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                {t('home.contact.email.time')}
              </p>
              <a href="mailto:inquire@ozhousemm.com" className="text-green-600 font-medium text-xs break-all">
                inquire@ozhousemm.com
              </a>
            </div>
          </div>

         
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 col-span-2">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {t('home.contact.hours.title')}
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Everyday 9am to 5:30 pm
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* Bottom Spacing for Navigation */}
      <div className="h-6"></div>
    </div>
  )
}
