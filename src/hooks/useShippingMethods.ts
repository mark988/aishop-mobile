import { useState, useEffect } from 'react'
import { getStoredToken } from '../lib/auth'

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface ShippingMethod {
  id: number
  code: string
  name_zh: string
  name_en?: string
  description?: string
  price: number
  price_display?: string
  icon?: string
  color?: string
  estimated_days?: string
  is_enabled: boolean
  sort_order: number
  min_order_amount?: number
  max_order_amount?: number
  available_regions?: string[]
  business_hours?: any
  special_notes?: string
  created_at: string
  updated_at: string
}

export const useShippingMethods = () => {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取请求头
  const getHeaders = () => {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  // 获取配送方式列表
  const fetchShippingMethods = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/shipping-methods`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 转换字段名以保持前端兼容性
        const convertedData = (result.data || []).map((item: any) => ({
          ...item,
          name_zh: item.nameZh || item.name_zh,
          name_en: item.nameEn || item.name_en,
          price_display: item.priceDisplay || item.price_display,
          estimated_days: item.estimatedDays || item.estimated_days,
          is_enabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sort_order: item.sortOrder !== undefined ? item.sortOrder : item.sort_order,
          min_order_amount: item.minOrderAmount || item.min_order_amount,
          max_order_amount: item.maxOrderAmount || item.max_order_amount,
          available_regions: item.availableRegions || item.available_regions,
          business_hours: item.businessHours || item.business_hours,
          special_notes: item.specialNotes || item.special_notes,
          created_at: item.createdAt || item.created_at,
          updated_at: item.updatedAt || item.updated_at
        }))
        setShippingMethods(convertedData)
      } else {
        throw new Error(result.message || '获取配送方式失败')
      }
    } catch (err: any) {
      console.error('Error fetching shipping methods:', err)
      setError(err.message || '获取配送方式失败')
      
      // 降级到默认配送方式
      setShippingMethods(getDefaultShippingMethods())
    } finally {
      setLoading(false)
    }
  }

  // 默认配送方式（降级方案）
  const getDefaultShippingMethods = (): ShippingMethod[] => [
    {
      id: 1,
      code: 'standard',
      name_zh: '标准配送',
      name_en: 'Standard Delivery',
      description: '3-5个工作日送达',
      price: 10,
      price_display: '¥10',
      icon: 'truck',
      color: 'bg-blue-500',
      estimated_days: '3-5个工作日',
      is_enabled: true,
      sort_order: 1,
      min_order_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      code: 'express',
      name_zh: '快速配送',
      name_en: 'Express Delivery',
      description: '1-2个工作日送达',
      price: 20,
      price_display: '¥20',
      icon: 'zap',
      color: 'bg-orange-500',
      estimated_days: '1-2个工作日',
      is_enabled: true,
      sort_order: 2,
      min_order_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  // 获取所有配送方式（包括禁用的）
  const fetchAllShippingMethods = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/shipping-methods/all`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        const convertedData = (result.data || []).map((item: any) => ({
          ...item,
          name_zh: item.nameZh || item.name_zh,
          name_en: item.nameEn || item.name_en,
          price_display: item.priceDisplay || item.price_display,
          estimated_days: item.estimatedDays || item.estimated_days,
          is_enabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sort_order: item.sortOrder !== undefined ? item.sortOrder : item.sort_order,
          min_order_amount: item.minOrderAmount || item.min_order_amount,
          max_order_amount: item.maxOrderAmount || item.max_order_amount,
          available_regions: item.availableRegions || item.available_regions,
          business_hours: item.businessHours || item.business_hours,
          special_notes: item.specialNotes || item.special_notes,
          created_at: item.createdAt || item.created_at,
          updated_at: item.updatedAt || item.updated_at
        }))
        setShippingMethods(convertedData)
      } else {
        throw new Error(result.message || '获取配送方式失败')
      }
    } catch (err: any) {
      console.error('Error fetching all shipping methods:', err)
      setError(err.message || '获取配送方式失败')
    } finally {
      setLoading(false)
    }
  }

  // 根据订单金额获取可用的配送方式
  const getAvailableShippingMethods = async (orderAmount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shipping-methods/available?orderAmount=${orderAmount}`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        return (result.data || []).map((item: any) => ({
          ...item,
          name_zh: item.nameZh || item.name_zh,
          name_en: item.nameEn || item.name_en,
          price_display: item.priceDisplay || item.price_display,
          estimated_days: item.estimatedDays || item.estimated_days,
          is_enabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sort_order: item.sortOrder !== undefined ? item.sortOrder : item.sort_order,
          min_order_amount: item.minOrderAmount || item.min_order_amount,
          max_order_amount: item.maxOrderAmount || item.max_order_amount,
          available_regions: item.availableRegions || item.available_regions,
          business_hours: item.businessHours || item.business_hours,
          special_notes: item.specialNotes || item.special_notes,
          created_at: item.createdAt || item.created_at,
          updated_at: item.updatedAt || item.updated_at
        }))
      } else {
        throw new Error(result.message || '获取可用配送方式失败')
      }
    } catch (err: any) {
      console.error('Error fetching available shipping methods:', err)
      return shippingMethods.filter(method => 
        (!method.min_order_amount || orderAmount >= method.min_order_amount) &&
        (!method.max_order_amount || orderAmount <= method.max_order_amount)
      )
    }
  }

  // 计算配送费用
  const calculateShippingFee = async (shippingCode: string, orderAmount: number): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/shipping-methods/calculate-fee`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          shippingCode,
          orderAmount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        return result.data || 0
      } else {
        throw new Error(result.message || '计算配送费用失败')
      }
    } catch (err: any) {
      console.error('Error calculating shipping fee:', err)
      // 降级方案：从本地数据计算
      const method = shippingMethods.find(m => m.code === shippingCode)
      return method?.price || 0
    }
  }

  // 根据代码获取配送方式
  const getShippingMethodByCode = (code: string): ShippingMethod | undefined => {
    return shippingMethods.find(method => method.code === code)
  }

  // 更新配送方式状态
  const updateShippingMethodStatus = async (id: number, isEnabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shipping-methods/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ is_enabled: isEnabled })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 重新获取数据
        await fetchShippingMethods()
      } else {
        throw new Error(result.message || '更新配送方式状态失败')
      }
    } catch (err) {
      console.error('Error updating shipping method status:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchShippingMethods()
  }, [])

  return {
    shippingMethods,
    loading,
    error,
    fetchShippingMethods,
    fetchAllShippingMethods,
    getAvailableShippingMethods,
    calculateShippingFee,
    getShippingMethodByCode,
    updateShippingMethodStatus
  }
}