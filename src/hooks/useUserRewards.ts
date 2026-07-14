import { useState, useEffect, useCallback } from 'react'
import { userRewardsService, UserRewardsOverview } from '../services/userRewardsService'
import toast from 'react-hot-toast'

/**
 * 用户权益Hook
 * 整合用户积分、优惠券和系统配置的查询，优化页面加载性能
 * 
 * 替代原本需要的多个Hook：
 * - usePoints: 获取用户积分
 * - useCoupons: 获取用户优惠券
 * - pointsExchangeUtils: 获取积分兑换配置
 */
export const useUserRewards = (userId: string) => {
  // 整合后的数据状态
  const [rewardsData, setRewardsData] = useState<UserRewardsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 为了保持与原有Hook的兼容性，提供单独的数据访问
  const points = rewardsData?.pointsInfo ? {
    id: rewardsData.pointsInfo.userId,
    user_id: rewardsData.pointsInfo.userId,
    current_points: rewardsData.pointsInfo.currentPoints,
    total_earned: rewardsData.pointsInfo.totalEarned,
    total_spent: rewardsData.pointsInfo.totalSpent,
    created_at: rewardsData.pointsInfo.createdAt,
    updated_at: rewardsData.pointsInfo.updatedAt
  } : null

  const userCoupons = rewardsData?.coupons || []

  const exchangeConfig = rewardsData?.exchangeConfig || {
    points: 100,
    money: 1,
    exchangeRateText: '100积分 = ¥1',
    maxUsagePercentage: 0.5
  }

  /**
   * 获取用户权益总览数据
   * 一次性获取积分、优惠券和兑换配置
   */
  const fetchUserRewards = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const overview = await userRewardsService.getUserRewardsOverview(userId)
      
      setRewardsData(overview)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户权益信息失败'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 初始化时获取数据
  useEffect(() => {
    fetchUserRewards()
  }, [fetchUserRewards])

  /**
   * 刷新用户权益数据
   */
  const refreshRewards = useCallback(() => {
    return fetchUserRewards()
  }, [fetchUserRewards])

  /**
   * 获取可用的优惠券列表
   * 过滤出状态为available、未过期且激活的优惠券
   */
  const getAvailableCoupons = useCallback(() => {
    return userCoupons.filter(uc => {
      const isAvailable = uc.status === 'available'
      const isNotExpired = !uc.coupon.expiresAt || new Date(uc.coupon.expiresAt) > new Date()
      const isActive = uc.coupon.isActive !== false
      
      return isAvailable && isNotExpired && isActive
    })
  }, [userCoupons])

  /**
   * 计算积分对应的金额
   */
  const calculateMoneyFromPoints = useCallback((pointsAmount: number): number => {
    const { points: configPoints, money } = exchangeConfig
    return (pointsAmount / configPoints) * money
  }, [exchangeConfig])

  /**
   * 计算金额需要的积分数
   */
  const calculatePointsFromMoney = useCallback((moneyAmount: number): number => {
    const { points: configPoints, money } = exchangeConfig
    const result = Math.ceil((moneyAmount / money) * configPoints)
    return result
  }, [exchangeConfig])

  /**
   * 计算最大可用积分
   */
  const calculateMaxUsablePoints = useCallback((
    orderAmount: number,
    maxDiscountPercentage?: number
  ) => {
    const userPoints = points?.current_points || 0
    const maxPercentage = maxDiscountPercentage || exchangeConfig.maxUsagePercentage
    const maxDiscount = orderAmount * maxPercentage
    const maxPointsByDiscount = calculatePointsFromMoney(maxDiscount)
    const maxPoints = Math.min(userPoints, maxPointsByDiscount)
    
    
    return {
      maxPoints: Math.max(0, maxPoints), // 确保不返回负数
      maxDiscount,
      exchangeRate: {
        points: exchangeConfig.points,
        money: exchangeConfig.money
      }
    }
  }, [points, exchangeConfig, calculatePointsFromMoney])

  return {
    // 整合数据
    rewardsData,
    loading,
    error,
    
    // 兼容原有Hook的数据格式
    points,
    userCoupons,
    exchangeConfig,
    
    // 方法
    refreshRewards,
    fetchUserRewards,
    getAvailableCoupons,
    calculateMoneyFromPoints,
    calculatePointsFromMoney,
    calculateMaxUsablePoints,
    
    // 便捷访问
    currentPoints: points?.current_points || 0,
    availableCoupons: getAvailableCoupons(),
    exchangeRateText: exchangeConfig.exchangeRateText,
    
    // 性能指标
    isOptimized: true // 标识这是优化后的Hook
  }
}