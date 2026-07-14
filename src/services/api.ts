const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

// API response types based on the provided structures
export interface Category {
  id: string
  name: string
  key: string
  description: string
  image: string  // 根据mediaType决定是图片URL还是视频URL
  icon: string
  color: string
  productCount: number
  isFeatured: boolean
  sortOrder: number
  isActive: boolean
  mediaType: string  // "video" 或 "image"
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  role: 'customer' | 'admin'
  phone?: string
  address?: string
  avatarUrl?: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  name: string
  emailOrPhone: string
  password: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  category: string
  stock: number
  brand: string
  salesCount: number
  video?: string
  mediaType: string
  origin: string
  sku: string
  isActive: boolean
  createdAt: string
  property?: any
  updatedAt: string
  images: string[]
}

export interface HeroBanner {
  id: string
  title: string
  subtitle?: string
  description?: string
  type: 'image' | 'video'
  image?: string
  video?: string
  poster?: string
  price?: string
  discount?: string
  originalPrice?: string
  ctaText?: string
  ctaLink?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface BrandConfig {
  logoIcon: string
  logoColorTo: string
  secondaryName: string
  logoColorFrom: string
  primaryName: string
  logoCustomUrl: string
  logoType: string
}

export interface HeroConfig {
  id: string
  title: string
  subtitle: string
  badge_text: string
  stat_users_count: string
  stat_users_label: string
  stat_products_count: string
  stat_products_label: string
  stat_rating_count: string
  stat_rating_label: string
  primary_button_text: string
  primary_button_link: string
  secondary_button_text: string
  secondary_button_link: string
  trust_indicator_1_text: string
  trust_indicator_1_icon: string
  trust_indicator_2_text: string
  trust_indicator_2_icon: string
  trust_indicator_3_text: string
  trust_indicator_3_icon: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HomeInitData {
  brandConfig: BrandConfig
  categories: Category[]
  heroBanners: HeroBanner[]
  heroConfig: HeroConfig
}

export interface ProductListResponse {
  records: Product[]
  total: number
  size: number
  current: number
  pages: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// API service functions
export const apiService = {
  // Fetch home initialization data
  async getHomeInit(): Promise<HomeInitData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/init`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<HomeInitData> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('Failed to fetch home init data:', error)
      return null
    }
  },

  // Fetch AI recommendations
  async getAiRecommendations(limit: number = 8): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/ai-recommendations?limit=${limit}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<Product[]> = await response.json()
      return result.code === 200 ? result.data : []
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error)
      return []
    }
  },

  // Fetch featured products
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/home/featured-products?limit=${limit}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<Product[]> = await response.json()
      return result.code === 200 ? result.data : []
    } catch (error) {
      console.error('Failed to fetch featured products:', error)
      return []
    }
  },

  // Fetch products with pagination, filtering and sorting
  async getProducts(
    page: number = 1,
    size: number = 12,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    category?: string,
    search?: string
  ): Promise<ProductListResponse | null> {
    try {
      let url = `${API_BASE_URL}/api/products?page=${page}&size=${size}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      if (category && category !== 'all') {
        url += `&category=${encodeURIComponent(category)}`
      }
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<ProductListResponse> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('Failed to fetch products:', error)
      return null
    }
  },

  // Fetch single product details
  async getProductDetail(productId: string): Promise<Product | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<Product> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('Failed to fetch product detail:', error)
      return null
    }
  },

  // Fetch all categories
  async getCategories(): Promise<Category[]> {
    try {
      const url = `${API_BASE_URL}/api/categories`
      console.log('🔍 Fetching categories from:', url)
      console.log('📍 API_BASE_URL:', API_BASE_URL)
      console.log('🌍 Environment:', import.meta.env.MODE)

      const response = await fetch(url)
      console.log('📡 Response status:', response.status, response.statusText)

      if (!response.ok) {
        const text = await response.text()
        console.error('❌ Response error:', text.substring(0, 200))
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<Category[]> = await response.json()
      console.log('✅ Categories loaded:', result.data?.length || 0)
      return result.code === 200 ? result.data : []
    } catch (error) {
      console.error('❌ Failed to fetch categories:', error)
      return []
    }
  },

  // Login user
  async login(loginData: LoginRequest): Promise<LoginResponse | null> {
    try {
      const url = new URL(`${API_BASE_URL}/api/login`)
      url.searchParams.append('username', loginData.username)
      url.searchParams.append('password', loginData.password)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<LoginResponse> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  // Register user
  async register(registerData: RegisterRequest): Promise<LoginResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<LoginResponse> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }
}