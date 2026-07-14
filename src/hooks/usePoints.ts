import { useState, useEffect, useCallback } from 'react'
import { Points, PointsTransaction } from '../types'
import { getStoredToken } from '../lib/auth'
import toast from 'react-hot-toast'

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export const usePoints = (userId: string) => {
  const [points, setPoints] = useState<Points | null>(null)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionsCount, setTransactionsCount] = useState(0)

  // 获取请求头
  const getHeaders = () => {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  // 转换后端数据格式为前端期望的格式
  const transformPointsData = (data: any) => {
    if (!data) return null;
    return {
      ...data,
      current_points: data.currentPoints || data.current_points || 0,
      total_earned: data.totalEarned || data.total_earned || 0,
      total_spent: data.totalSpent || data.total_spent || 0
    };
  }

  const fetchPoints = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/points/user/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        const transformedData = transformPointsData(result.data);
        setPoints(transformedData)
      } else {
        throw new Error(result.message || '获取积分信息失败')
      }
    } catch (error) {
      console.error('Error fetching points:', error)
      toast.error('获取积分信息失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchTransactions = useCallback(async (page: number, pageSize: number) => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/points/history/${userId}?page=${page}&size=${pageSize}`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 转换后端数据格式以匹配前端期望
        const transformedData = result.data.records ? result.data.records.map((record: any) => {
          const transformedRecord = {
            ...record,
            amount: Math.abs(record.points), // 前端显示绝对值
            type: record.points > 0 ? 'earned' : (record.type === 'redeem' ? 'spent' : record.type),
            reason: record.description,
            created_at: record.createdAt || record.created_at, // 字段名映射
          };
          // 调试信息
          console.log('Transformed record:', transformedRecord);
          return transformedRecord;
        }) : [];
        
        setTransactions(transformedData)
        setTransactionsCount(result.data.total || 0)
      } else {
        throw new Error(result.message || '获取积分明细失败')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('获取积分明细失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchPoints()
  }, [fetchPoints])

  const getLevelInfo = (level: string) => {
    const levels = {
      bronze: { name: '青铜会员', color: 'from-amber-600 to-amber-700', nextLevel: 'silver', pointsNeeded: 500 },
      silver: { name: '白银会员', color: 'from-gray-400 to-gray-600', nextLevel: 'gold', pointsNeeded: 1000 },
      gold: { name: '黄金会员', color: 'from-yellow-400 to-yellow-600', nextLevel: 'platinum', pointsNeeded: 2000 },
      platinum: { name: '铂金会员', color: 'from-purple-400 to-purple-600', nextLevel: 'diamond', pointsNeeded: 5000 },
      diamond: { name: '钻石会员', color: 'from-blue-400 to-blue-600', nextLevel: null, pointsNeeded: null },
    }
    return levels[level as keyof typeof levels] || levels.bronze
  }

  const redeemCoupon = async (pointsCost: number, couponType: string) => {
    if (!points || points.current_points < pointsCost) {
      toast.error('积分不足')
      return false
    }

    try {
      const response = await fetch(`${API_BASE_URL}/points/redeem-coupon`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          userId: userId,
          pointsCost: pointsCost,
          couponType: couponType,
          couponTitle: couponType,
          description: `兑换${couponType}优惠券`
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 直接刷新积分信息而不是手动更新，避免数据不同步
        toast.success(`成功兑换${couponType}优惠券`)
        await fetchPoints() // 刷新积分信息
        return true
      } else {
        throw new Error(result.message || '兑换失败')
      }
    } catch (error) {
      console.error('Error redeeming coupon:', error)
      toast.error('兑换失败')
      return false
    }
  }

  const usePointsForDiscount = async (pointsAmount: number, orderId?: string) => {
    if (!points || points.current_points < pointsAmount) {
      toast.error('积分不足');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/points/spend`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          p_user_id: userId,
          p_order_id: orderId,
          p_points_spent: pointsAmount,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 直接刷新积分信息，确保数据准确
        toast.success(`成功使用${pointsAmount}积分抵扣`);
        await fetchPoints();
        return true;
      } else {
        throw new Error(result.message || '积分抵扣失败')
      }
    } catch (error: any) {
      console.error('Error using points for discount:', error);
      // Display the specific error message from the database if available
      const errorMessage = error.message || '积分抵扣失败';
      toast.error(errorMessage);
      return false;
    }
  };

  const earnPointsFromOrder = async (orderAmount: number, orderId: string) => {
    console.log('Points are automatically awarded by backend when order is created');
    console.log('No need to call earnPointsFromOrder to avoid duplicate points');
    // Backend already handles points earning in OrderServiceImpl.processOrderRewardsAsync
    return 0;
  };

  return {
    points,
    transactions,
    loading,
    transactionsCount,
    fetchTransactions,
    getLevelInfo,
    redeemCoupon,
    usePointsForDiscount,
    earnPointsFromOrder,
  }
}