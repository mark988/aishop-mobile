import { useState, useEffect } from 'react'
import { getStoredToken } from '../lib/auth'

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface PaymentMethod {
  id: number
  code: string
  name_zh: string
  name_en?: string
  description?: string
  icon_type: 'emoji' | 'brand'
  icon_value?: string
  brand_colors?: {
    bg?: string
    hover?: string
    text?: string
    primary?: string
    secondary?: string
    tertiary?: string
  }
  supported_cards?: string[]
  is_enabled: boolean
  sort_order: number
  processing_message?: string
  button_text_template?: string
  created_at: string
  updated_at: string
}

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
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

  // 获取支付方式列表
  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
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
          icon_type: item.iconType || item.icon_type,
          icon_value: item.iconValue || item.icon_value,
          brand_colors: item.brandColors || item.brand_colors,
          supported_cards: item.supportedCards || item.supported_cards,
          is_enabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sort_order: item.sortOrder !== undefined ? item.sortOrder : item.sort_order,
          processing_message: item.processingMessage || item.processing_message,
          button_text_template: item.buttonTextTemplate || item.button_text_template,
          created_at: item.createdAt || item.created_at,
          updated_at: item.updatedAt || item.updated_at
        }))
        setPaymentMethods(convertedData)
      } else {
        throw new Error(result.message || '获取支付方式失败')
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err)
      setError(err.message || '获取支付方式失败')
      
      // 降级到默认支付方式
      setPaymentMethods(getDefaultPaymentMethods())
    } finally {
      setLoading(false)
    }
  }

  // 默认支付方式（降级方案）
  const getDefaultPaymentMethods = (): PaymentMethod[] => [
    {
      id: 1,
      code: 'cod',
      name_zh: '货到付款',
      name_en: 'Cash on Delivery',
      description: '收到商品后再付款，支持现金或刷卡',
      icon_type: 'emoji',
      icon_value: '💰',
      brand_colors: {
        bg: 'bg-green-500',
        hover: 'hover:bg-green-600',
        text: 'text-white'
      },
      is_enabled: true,
      sort_order: 1,
      processing_message: '正在处理货到付款订单...',
      button_text_template: '确认订单',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  // 获取所有支付方式（包括禁用的）
  const fetchAllPaymentMethods = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/payment-methods/all`, {
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
          icon_type: item.iconType || item.icon_type,
          icon_value: item.iconValue || item.icon_value,
          brand_colors: item.brandColors || item.brand_colors,
          supported_cards: item.supportedCards || item.supported_cards,
          is_enabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sort_order: item.sortOrder !== undefined ? item.sortOrder : item.sort_order,
          processing_message: item.processingMessage || item.processing_message,
          button_text_template: item.buttonTextTemplate || item.button_text_template,
          created_at: item.createdAt || item.created_at,
          updated_at: item.updatedAt || item.updated_at
        }))
        setPaymentMethods(convertedData)
      } else {
        throw new Error(result.message || '获取支付方式失败')
      }
    } catch (err: any) {
      console.error('Error fetching all payment methods:', err)
      setError(err.message || '获取支付方式失败')
    } finally {
      setLoading(false)
    }
  }

  // 根据代码获取支付方式
  const getPaymentMethodByCode = (code: string): PaymentMethod | undefined => {
    return paymentMethods.find(method => method.code === code)
  }

  // 获取按钮文字 - 修复版本
  const getButtonText = (methodCode: string, totalAmount?: string): string => {
    const method = getPaymentMethodByCode(methodCode)
    if (!method) {
      return `确认订单${totalAmount ? ` ${totalAmount}` : ''}`
    }
    
    if (method.button_text_template) {
      // 如果模板中包含占位符，替换总金额
      return method.button_text_template.replace('{amount}', totalAmount || '')
    }
    
    return `使用${method.name_zh}支付${totalAmount ? ` ${totalAmount}` : ''}`
  }

  // 获取处理消息 - 修复版本
  const getProcessingMessage = (methodCode: string): string => {
    const method = getPaymentMethodByCode(methodCode)
    if (!method) {
      return '正在处理支付...'
    }
    return method.processing_message || `正在处理${method.name_zh}支付...`
  }

  // 更新支付方式状态
  const updatePaymentMethodStatus = async (id: number, isEnabled: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-methods/${id}/status`, {
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
        await fetchPaymentMethods()
      } else {
        throw new Error(result.message || '更新支付方式状态失败')
      }
    } catch (err) {
      console.error('Error updating payment method status:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  return {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    fetchAllPaymentMethods,
    updatePaymentMethodStatus,
    getPaymentMethodByCode,
    getButtonText,
    getProcessingMessage
  }
}