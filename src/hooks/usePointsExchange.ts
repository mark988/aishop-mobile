import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { POINTS_EXCHANGE_RULES } from '../types/points'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

/**
 * 积分兑换Hook
 * 处理积分兑换相关的逻辑
 */
export function usePointsExchange() {
  const { user } = useAuth()
  const [userPoints, setUserPoints] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取用户积分余额
  const fetchUserPoints = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/points/balance/${user.id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUserPoints(result.data.availablePoints || 0)
        }
      }
    } catch (err) {
      console.error('获取用户积分失败:', err)
      setError('获取积分余额失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算商品的积分价格
  const calculatePointsPrice = (price: number): number => {
    return Math.round(price * POINTS_EXCHANGE_RULES.POINTS_PER_YUAN)
  }

  // 检查用户积分是否足够兑换商品
  const canExchange = (productPrice: number): boolean => {
    const pointsRequired = calculatePointsPrice(productPrice)
    return userPoints >= pointsRequired
  }

  // 执行积分兑换
  const exchangeProduct = async (productId: string, quantity: number = 1) => {
    if (!user?.id) {
      throw new Error('用户未登录')
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/points/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId,
          quantity,
          userId: user.id
        })
      })

      if (!response.ok) {
        throw new Error('积分兑换失败')
      }

      const result = await response.json()
      if (result.success) {
        // 更新用户积分余额
        await fetchUserPoints()
        return result.data
      } else {
        throw new Error(result.message || '积分兑换失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '积分兑换失败'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 获取积分兑换历史
  const getExchangeHistory = async () => {
    if (!user?.id) return []

    try {
      const response = await fetch(`${API_BASE_URL}/api/points/exchange/history/${user.id}`)
      if (response.ok) {
        const result = await response.json()
        return result.success ? result.data : []
      }
    } catch (err) {
      console.error('获取兑换历史失败:', err)
    }
    return []
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserPoints()
    }
  }, [user?.id])

  return {
    userPoints,
    loading,
    error,
    calculatePointsPrice,
    canExchange,
    exchangeProduct,
    getExchangeHistory,
    refreshPoints: fetchUserPoints
  }
}