import { getStoredToken } from '../lib/auth'

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

// 获取请求头
const getHeaders = () => {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

export const orderService = {
  // 根据用户ID分页获取订单
  async getUserOrders(userId: string, page: number = 1, size: number = 10) {
    const url = `${API_BASE_URL}/orders/user/${userId}?page=${page}&size=${size}`
    console.log('🌐 发送请求到:', url)
    console.log('📋 请求头:', getHeaders())
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    })

    console.log('📡 响应状态:', response.status)
    console.log('📡 响应头:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ HTTP错误响应:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const result = await response.json()
    console.log('📦 API响应结果:', result)
    
    if (result.code === 200) {
      return result.data
    } else {
      console.error('❌ 业务错误:', result)
      throw new Error(result.message || `获取用户订单失败: ${JSON.stringify(result)}`)
    }
  },

  // 根据订单ID获取订单详情
  async getOrderById(orderId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code === 200) {
      return result.data
    } else {
      throw new Error(result.message || '获取订单详情失败')
    }
  },

  // 根据订单ID获取订单详情（包含商品信息）
  async getOrderWithItems(orderId: string) {
    const url = `${API_BASE_URL}/orders/${orderId}/with-items`
    console.log('🌐 发送请求获取完整订单:', url)
    console.log('📋 请求头:', getHeaders())
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    })

    console.log('📡 完整订单响应状态:', response.status)
    console.log('📡 完整订单响应头:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 获取完整订单HTTP错误:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const result = await response.json()
    console.log('📦 完整订单API响应:', result)
    
    if (result.code === 200) {
      return result.data
    } else {
      console.error('❌ 完整订单业务错误:', result)
      throw new Error(result.message || '获取订单详情失败')
    }
  },

  // 更新订单状态
  async updateOrderStatus(orderId: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code === 200) {
      return result.data
    } else {
      throw new Error(result.message || '更新订单状态失败')
    }
  },

  // 管理员分页获取所有订单
  async getAllOrders(page: number = 1, size: number = 10) {
    const response = await fetch(`${API_BASE_URL}/orders/admin/all?page=${page}&size=${size}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code === 200) {
      return result.data
    } else {
      throw new Error(result.message || '获取所有订单失败')
    }
  },

  // 创建订单
  async createOrder(orderData: any) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code === 200) {
      return result.data
    } else {
      throw new Error(result.message || '创建订单失败')
    }
  }
}