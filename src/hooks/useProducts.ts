import { useState, useEffect } from 'react'
import { Product } from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

// 商品数据缓存和防重复请求机制
let productsCache: { products: Product[]; timestamp: number } | null = null
let pendingProductsRequest: Promise<Product[]> | null = null
const PRODUCTS_CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存

// 实际的API调用函数
const fetchProductsAPI = async (): Promise<Product[]> => {
  console.log('🛍️ fetchProductsAPI: 从API获取商品列表')
  
  try {
    const response = await fetch(`${API_BASE_URL}/home/products`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.code === 200 && result.data) {
      // 转换数据格式以匹配前端类型
      const transformedProducts = result.data.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.images?.[0] || '', // 使用第一张图片
        images: product.images || [],
        video: product.video,
        media_type: product.mediaType,
        category: product.category,
        stock: product.stock,
        brand: product.brand,
        sales_count: product.salesCount,
        property: product.property, // 添加属性字段映射
        origin: product.origin,
        sku: product.sku,
        is_active: product.isActive,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
      }))
      
      console.log('✅ fetchProductsAPI: 商品列表获取成功，数量:', transformedProducts.length)
      return transformedProducts
    } else {
      console.error('API Error:', result.message)
      // Fallback to mock data
      return mockProducts
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    // Fallback to mock data for demo
    return mockProducts
  }
}

export const useProducts = (shouldFetch: boolean = true) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = async () => {
    try {
      // 检查缓存是否有效
      if (productsCache && 
          Date.now() - productsCache.timestamp < PRODUCTS_CACHE_DURATION) {
        console.log('🎯 useProducts: 使用缓存的商品数据')
        setProducts(productsCache.products)
        setLoading(false)
        return
      }

      // 如果有正在进行的请求，等待该请求完成
      if (pendingProductsRequest) {
        console.log('⏳ useProducts: 等待正在进行的商品请求')
        const products = await pendingProductsRequest
        setProducts(products)
        setLoading(false)
        return
      }

      setLoading(true)

      // 创建新的请求
      pendingProductsRequest = fetchProductsAPI()
      
      try {
        const products = await pendingProductsRequest
        
        // 缓存结果
        productsCache = {
          products,
          timestamp: Date.now()
        }
        
        setProducts(products)
      } finally {
        // 清除pending请求状态
        pendingProductsRequest = null
      }
    } catch (error) {
      console.error('Error in fetchProducts:', error)
      setProducts(mockProducts)
      pendingProductsRequest = null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shouldFetch) {
      fetchProducts()
    } else {
      setLoading(false)
    }
  }, [shouldFetch])

  const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          brand: product.brand,
          video: product.video,
          mediaType: product.media_type,
          origin: product.origin,
          sku: product.sku,
          isActive: product.is_active || true,
          images: product.images,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 清除缓存，重新获取数据
        productsCache = null
        await fetchProducts()
        return { data: result.data, error: null }
      } else {
        return { data: null, error: { message: result.message || '添加商品失败' } }
      }
    } catch (error: any) {
      console.error('Error adding product:', error)
      return { data: null, error: { message: error.message || '添加商品时发生未知错误' } }
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          price: updates.price,
          category: updates.category,
          stock: updates.stock,
          brand: updates.brand,
          video: updates.video,
          mediaType: updates.media_type,
          origin: updates.origin,
          sku: updates.sku,
          isActive: updates.is_active,
          images: updates.images,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 清除缓存，重新获取数据
        productsCache = null
        await fetchProducts()
        return { data: result.data, error: null }
      } else {
        return { data: null, error: { message: result.message || '更新商品失败' } }
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
      return { data: null, error: { message: error.message || '更新商品时发生未知错误' } }
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 清除缓存，重新获取数据
        productsCache = null
        await fetchProducts()
        return { error: null }
      } else {
        return { error: { message: result.message || '删除商品失败' } }
      }
    } catch (error: any) {
      console.error('Error deleting product:', error)
      return { error: { message: error.message || '删除商品时发生未知错误' } }
    }
  }

  // 获取单个商品详情
  const fetchProductById = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        // 转换数据格式以匹配前端类型
        const product = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          image: result.data.images?.[0] || '', // 使用第一张图片
          images: result.data.images || [],
          video: result.data.video,
          media_type: result.data.mediaType,
          category: result.data.category,
          stock: result.data.stock,
          brand: result.data.brand,
          sales_count: result.data.salesCount,
          origin: result.data.origin,
          sku: result.data.sku,
          is_active: result.data.isActive,
          created_at: result.data.createdAt,
          updated_at: result.data.updatedAt,
          property: result.data.property, // 添加 property 字段
        }
        
        return { data: product, error: null }
      } else {
        return { data: null, error: { message: result.message || '商品未找到' } }
      }
    } catch (error: any) {
      console.error('Error fetching product by ID:', error)
      return { data: null, error: { message: error.message || '获取商品详情时发生未知错误' } }
    }
  }

  return { 
    products, 
    loading, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    refetch: () => {
      // 清除缓存，强制重新获取
      productsCache = null
      fetchProducts()
    },
    fetchProductById 
  }
}

// Mock data for demo purposes
const mockProducts: Product[] = [
  // 手机类别
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: '最新的iPhone，配备A17 Pro芯片、钛金属设计和专业级摄像系统',
    price: 9999,
    image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '手机',
    stock: 50,
    brand: 'Apple',
    sales_count: 1250,
  },
  {
    id: '2',
    name: 'iPhone 15',
    description: 'iPhone 15，配备A16仿生芯片，支持USB-C接口',
    price: 5999,
    image: 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=400',
    video: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
    media_type: 'video',
    category: '手机',
    stock: 80,
    brand: 'Apple',
    sales_count: 2100,
  },
  {
    id: '3',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Android旗舰手机，拍照功能强大，支持S Pen',
    price: 8999,
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '手机',
    stock: 40,
    brand: 'Samsung',
    sales_count: 890,
  },
  {
    id: '4',
    name: 'Xiaomi 14 Pro',
    description: '小米旗舰手机，徕卡影像系统，骁龙8 Gen3处理器',
    price: 4999,
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=400',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    media_type: 'video',
    category: '手机',
    stock: 60,
    brand: 'Xiaomi',
    sales_count: 1680,
  },
  {
    id: '5',
    name: 'OPPO Find X7 Pro',
    description: 'OPPO旗舰手机，哈苏影像系统，天玑9300处理器',
    price: 5999,
    image: 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '手机',
    stock: 35,
    brand: 'OPPO',
    sales_count: 720,
  },

  // 电脑类别
  {
    id: '6',
    name: 'MacBook Pro 16英寸 M3 Max',
    description: '专业级笔记本电脑，搭载M3 Max芯片，适合视频编辑和开发',
    price: 25999,
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400',
    video: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
    media_type: 'video',
    category: '电脑',
    stock: 20,
    brand: 'Apple',
    sales_count: 450,
  },
  {
    id: '7',
    name: 'MacBook Air 15英寸 M3',
    description: '轻薄便携的笔记本电脑，搭载M3芯片，续航出色',
    price: 10999,
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '电脑',
    stock: 30,
    brand: 'Apple',
    sales_count: 820,
  },
  {
    id: '8',
    name: 'Dell XPS 15',
    description: '高性能Windows笔记本，4K OLED显示屏，Intel i7处理器',
    price: 15999,
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '电脑',
    stock: 25,
    brand: 'Dell',
    sales_count: 380,
  },
  {
    id: '9',
    name: 'ThinkPad X1 Carbon',
    description: '商务笔记本电脑，轻薄设计，军工级品质',
    price: 12999,
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '电脑',
    stock: 15,
    brand: 'Lenovo',
    sales_count: 620,
  },
  {
    id: '10',
    name: 'Surface Laptop 5',
    description: 'Microsoft Surface笔记本，触控屏幕，Windows 11',
    price: 9999,
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '电脑',
    stock: 20,
    brand: 'Microsoft',
    sales_count: 290,
  },

  // 配件类别
  {
    id: '11',
    name: 'AirPods Pro 2',
    description: '主动降噪无线耳机，空间音频，音质出色',
    price: 1899,
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=400',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    media_type: 'video',
    category: '配件',
    stock: 100,
    brand: 'Apple',
    sales_count: 3200,
  },
  {
    id: '12',
    name: 'Apple Watch Series 9',
    description: '智能手表，健康监测，运动追踪，支持Siri',
    price: 2999,
    image: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '配件',
    stock: 75,
    brand: 'Apple',
    sales_count: 1850,
  },
  {
    id: '13',
    name: 'Sony WH-1000XM5',
    description: '顶级降噪耳机，音质卓越，30小时续航',
    price: 2299,
    image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '配件',
    stock: 60,
    brand: 'Sony',
    sales_count: 1420,
  },
  {
    id: '14',
    name: 'Magic Keyboard',
    description: 'Apple无线键盘，背光设计，触控ID',
    price: 1299,
    image: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '配件',
    stock: 50,
    brand: 'Apple',
    sales_count: 980,
  },
  {
    id: '15',
    name: 'MagSafe充电器',
    description: '无线充电器，支持iPhone 12及以上机型',
    price: 329,
    image: 'https://images.pexels.com/photos/4526413/pexels-photo-4526413.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '配件',
    stock: 200,
    brand: 'Apple',
    sales_count: 4500,
  },

  // 平板类别
  {
    id: '16',
    name: 'iPad Pro 12.9英寸 M4',
    description: '专业级平板电脑，支持Apple Pencil Pro，M4芯片',
    price: 8999,
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400',
    video: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4',
    media_type: 'video',
    category: '平板',
    stock: 25,
    brand: 'Apple',
    sales_count: 680,
  },
  {
    id: '17',
    name: 'iPad Air 11英寸 M2',
    description: '轻薄平板电脑，M2芯片，支持Apple Pencil',
    price: 4999,
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '平板',
    stock: 40,
    brand: 'Apple',
    sales_count: 1150,
  },
  {
    id: '18',
    name: 'Surface Pro 9',
    description: 'Microsoft平板电脑，可拆卸键盘，Windows 11',
    price: 7999,
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '平板',
    stock: 30,
    brand: 'Microsoft',
    sales_count: 420,
  },
  {
    id: '19',
    name: 'Samsung Galaxy Tab S9+',
    description: 'Android平板，S Pen支持，AMOLED显示屏',
    price: 5999,
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '平板',
    stock: 35,
    brand: 'Samsung',
    sales_count: 580,
  },
  {
    id: '20',
    name: 'iPad 10.9英寸',
    description: '入门级iPad，A14仿生芯片，支持Apple Pencil',
    price: 2999,
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400',
    media_type: 'image',
    category: '平板',
    stock: 60,
    brand: 'Apple',
    sales_count: 2300,
  }
]