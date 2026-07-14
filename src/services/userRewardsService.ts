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

/**
 * 用户权益总览数据类型定义
 */
export interface UserRewardsOverview {
  pointsInfo: {
    userId: string
    currentPoints: number
    totalEarned: number
    totalSpent: number
    createdAt?: string
    updatedAt?: string
  }
  coupons: Array<{
    id: string
    userId: string
    couponId: string
    status: string
    usedAt?: string
    createdAt: string
    coupon: {
      id: string
      code: string
      title: string
      description: string
      type: string
      value: number
      minOrderAmount: number
      maxDiscountAmount?: number
      expiresAt?: string
      quantity: number
      isActive: boolean
    }
  }>
  exchangeConfig: {
    points: number
    money: number
    exchangeRateText: string
    maxUsagePercentage: number
  }
}

/**
 * 用户权益服务
 * 提供整合的用户权益查询功能，减少API调用次数
 */
export const userRewardsService = {
  /**
   * 获取用户权益总览
   * 整合原本需要3次API调用的数据：
   * - 用户积分信息
   * - 用户优惠券列表
   * - 积分兑换配置
   * 
   * @param userId 用户ID
   * @returns 用户权益总览数据
   */
  async getUserRewardsOverview(userId: string): Promise<UserRewardsOverview> {
    if (!userId) {
      throw new Error('用户ID不能为空')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/rewards`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const result = await response.json()

      if (result.code === 200) {
        // 数据格式转换，确保与前端期望的格式一致
        const overview: UserRewardsOverview = {
          pointsInfo: {
            userId: result.data.pointsInfo?.userId || userId,
            currentPoints: result.data.pointsInfo?.currentPoints || 0,
            totalEarned: result.data.pointsInfo?.totalEarned || 0,
            totalSpent: result.data.pointsInfo?.totalSpent || 0,
            createdAt: result.data.pointsInfo?.createdAt,
            updatedAt: result.data.pointsInfo?.updatedAt
          },
          coupons: (result.data.coupons || []).map((coupon: any) => ({
            id: coupon.id,
            userId: coupon.userId,
            couponId: coupon.couponId,
            status: coupon.status,
            usedAt: coupon.usedAt,
            createdAt: coupon.createdAt,
            coupon: {
              id: coupon.coupon?.id || '',
              code: coupon.coupon?.code || '',
              title: coupon.coupon?.title || '',
              description: coupon.coupon?.description || '',
              type: coupon.coupon?.type || '',
              value: coupon.coupon?.value || 0,
              minOrderAmount: coupon.coupon?.minOrderAmount || 0,
              maxDiscountAmount: coupon.coupon?.maxDiscountAmount,
              expiresAt: coupon.coupon?.expiresAt,
              quantity: coupon.coupon?.quantity || 0,
              isActive: coupon.coupon?.isActive !== false
            }
          })),
          exchangeConfig: {
            points: result.data.exchangeConfig?.points || 100,
            money: result.data.exchangeConfig?.money || 1,
            exchangeRateText: result.data.exchangeConfig?.exchangeRateText || '100积分 = ¥1',
            maxUsagePercentage: result.data.exchangeConfig?.maxUsagePercentage || 0.5
          }
        }

        return overview
      } else {
        throw new Error(result.message || '获取用户权益信息失败')
      }
    } catch (error) {
      throw error
    }
  }
}