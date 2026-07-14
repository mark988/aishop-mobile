// 产品相关类型
export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  brand: string
  salesCount: number
  points?: number  // 积分商品的积分值
  video?: string
  mediaType?: 'image' | 'video'
  origin?: string
  sku: string
  isActive: boolean
  createdAt: string
  property?: Record<string, string[]>
  updatedAt: string
  images: string[]
}

// 分类相关类型
export interface Category {
  id: string
  name: string
  key: string  // 英文key，用于API请求
  image_url?: string
  icon?: string
  description?: string
  productCount?: number
  isFeatured?: boolean
  image?: string
  mediaType?: 'image' | 'video'
}

// 轮播图相关类型
export interface Banner {
  id: string
  title: string
  description?: string
  image?: string
  video?: string
  poster?: string
  type: 'image' | 'video'
  ctaText?: string
  cta_text?: string
  ctaLink?: string
  cta_link?: string
}

// 用户相关类型
export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  name?: string
  avatar?: string
  phone?: string
  address?: string
  points?: number
}

// 购物车相关类型
export interface CartItem {
  id: string
  product: Product
  quantity: number
  selectedProperties?: Record<string, string>
}

// 订单相关类型
export interface Order {
  id: string
  userId: string
  items: CartItem[]
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  shippingAddress: string
  paymentMethod: string
}

// 通知相关类型
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read?: boolean
  isRead?: boolean
  is_read?: boolean
  createdAt?: string
  created_at?: string
  user_id?: string
  read_at?: string
}

// 品牌配置类型
export interface BrandConfig {
  name: string
  icon?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
}

// 首页初始化数据类型
export interface HomeInitData {
  heroConfig?: any
  heroBanners: Banner[]
  categories: Category[]
  brandConfig?: BrandConfig
}

// API响应类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 收藏相关类型
export interface Favorite {
  id: string
  productId: string
  userId: string
  product: Product
  createdAt: string
}

// 积分相关类型
export interface PointsTransaction {
  id: string
  userId: string
  points: number
  type: 'earn' | 'spend'
  description: string
  createdAt: string
}

export interface PointsProduct {
  id: string
  name: string
  description: string
  points: number
  image: string
  category: string
  stock: number
  isActive: boolean
}

// 语言相关类型
export interface LanguageContextType {
  language: string
  setLanguage: (lang: string) => void
  t: (key: string) => string
}

// AI 相关类型
export type AiAnswerType = 'PRODUCT' | 'FAQ'

export interface AIProductCard {
  id: string
  name: string
  image: string | null
  price: number
  url: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  products?: AIProductCard[]
  queryId?: string
  type?: AiAnswerType
}

export interface AIRecommendation {
  product: Product
  score: number
  reason: string
}