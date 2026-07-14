import { Product, Banner } from '../types'

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: '最新款iPhone，配备A17 Pro芯片，拍照更清晰，续航更持久',
    price: 9999,
    category: 'phone',
    stock: 50,
    brand: 'Apple',
    salesCount: 1234,
    mediaType: 'image',
    origin: '美国',
    sku: 'IPHONE15PM',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    images: ['https://via.placeholder.com/400x400/007bff/ffffff?text=iPhone+15+Pro'],
    property: {
      '颜色': ['深空黑', '银色', '金色', '深紫色'],
      '容量': ['128GB', '256GB', '512GB', '1TB']
    }
  },
  {
    id: '2',
    name: 'MacBook Pro M3',
    description: '强大的M3芯片，专业级性能，适合开发者和创意工作者',
    price: 16999,
    category: 'computer',
    stock: 30,
    brand: 'Apple',
    salesCount: 856,
    mediaType: 'image',
    origin: '美国',
    sku: 'MACBOOKPROM3',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    images: ['https://via.placeholder.com/400x400/28a745/ffffff?text=MacBook+Pro'],
    property: {
      '颜色': ['深空灰', '银色'],
      '内存': ['16GB', '32GB', '64GB'],
      '存储': ['512GB', '1TB', '2TB']
    }
  },
  {
    id: '3',
    name: 'AirPods Pro 2',
    description: '主动降噪，空间音频，长续航无线耳机',
    price: 1899,
    category: 'accessories',
    stock: 100,
    brand: 'Apple',
    salesCount: 2156,
    mediaType: 'image',
    origin: '美国',
    sku: 'AIRPODSPRO2',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    images: ['https://via.placeholder.com/400x400/ffc107/000000?text=AirPods+Pro'],
    property: {
      '颜色': ['白色']
    }
  },
  {
    id: '4',
    name: '小米13 Ultra',
    description: '徕卡影像，骁龙8 Gen2，专业摄影旗舰',
    price: 5999,
    category: 'phone',
    stock: 80,
    brand: '小米',
    salesCount: 1567,
    mediaType: 'image',
    origin: '中国',
    sku: 'MI13ULTRA',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    images: ['https://via.placeholder.com/400x400/dc3545/ffffff?text=小米13+Ultra'],
    property: {
      '颜色': ['黑色', '白色', '绿色'],
      '容量': ['256GB', '512GB', '1TB']
    }
  }
]

export const mockBanners: Banner[] = [
  {
    id: '1',
    title: '新年大促销',
    description: '全场商品8折起，更有惊喜礼品等你来拿！',
    image: 'https://via.placeholder.com/800x400/007bff/ffffff?text=新年大促销',
    type: 'image',
    ctaText: '立即抢购',
    ctaLink: '/products'
  },
  {
    id: '2',
    title: 'iPhone 15 系列上市',
    description: '全新A17 Pro芯片，更强性能，更长续航',
    image: 'https://via.placeholder.com/800x400/000000/ffffff?text=iPhone+15+系列',
    type: 'image',
    ctaText: '了解更多',
    ctaLink: '/category/phone'
  },
  {
    id: '3',
    title: '智能家居专场',
    description: '打造智慧生活，享受科技便利',
    image: 'https://via.placeholder.com/800x400/28a745/ffffff?text=智能家居',
    type: 'image',
    ctaText: '查看详情',
    ctaLink: '/category/smart-home'
  }
]