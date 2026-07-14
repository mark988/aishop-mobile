import { useState, useEffect, useCallback } from 'react'
import { Coupon, UserCoupon, UserProfile } from '../types'
import { pointsService } from '../services/pointsService'
import { getStoredToken } from '../lib/auth'
import toast from 'react-hot-toast'

export interface CouponUsageDetails extends UserCoupon {
  user: UserProfile;
}

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [couponUsage, setCouponUsage] = useState<CouponUsageDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponUsageCount, setCouponUsageCount] = useState(0);

  // 获取请求头
  const getHeaders = () => {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true)
      // 暂时返回空数组，因为这个功能主要在管理端使用
      setCoupons([])
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast.error('获取优惠券列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserCoupons = useCallback(async (userId: string) => {
    if (!userId) return
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/coupons/user/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        setUserCoupons(result.data || [])
      } else {
        throw new Error(result.message || '获取用户优惠券失败')
      }
    } catch (error) {
      console.error('Error fetching user coupons:', error)
      toast.error('获取您的优惠券失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCouponUsage = useCallback(async (couponId: string, page: number, pageSize: number) => {
    try {
      setLoading(true);
      // 暂时不实现，因为这个功能主要在管理端使用
      setCouponUsage([]);
      setCouponUsageCount(0);
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
      toast.error('获取优惠券使用记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 验证优惠券
  const validateCoupon = useCallback(async (couponCode: string, userId: string, orderAmount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          couponCode,
          userId,
          orderAmount
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.code === 200 && result.data === true
    } catch (error) {
      console.error('Error validating coupon:', error)
      return false
    }
  }, [])

  // 使用优惠券
  const useCoupon = useCallback(async (couponCode: string, userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/coupons/use`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          couponCode,
          userId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 刷新用户优惠券列表
        await fetchUserCoupons(userId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error using coupon:', error)
      return false
    }
  }, [fetchUserCoupons])

  // 根据代码获取优惠券详情
  const getCouponByCode = useCallback(async (code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/coupons/code/${code}`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        return result.data
      }
      return null
    } catch (error) {
      console.error('Error getting coupon by code:', error)
      return null
    }
  }, [])

  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'distribution_count'>) => {
    // 暂时不实现，因为这个功能主要在管理端使用
    toast.error('此功能暂未实现')
    return { success: false, error: 'Not implemented' }
  }

  const updateCoupon = async (couponId: string, couponData: Partial<Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'distribution_count'>>) => {
    // 暂时不实现，因为这个功能主要在管理端使用
    toast.error('此功能暂未实现')
    return { success: false, error: 'Not implemented' }
  }

  const deleteCoupon = async (couponId: string) => {
    // 暂时不实现，因为这个功能主要在管理端使用
    toast.error('此功能暂未实现')
    return { success: false, error: 'Not implemented' }
  }

  const distributeCoupon = async (couponId: string, userIds: string[]) => {
    // 暂时不实现，因为这个功能主要在管理端使用
    toast.error('此功能暂未实现')
    return { success: false, error: 'Not implemented' }
  }

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  return {
    coupons,
    userCoupons,
    couponUsage,
    loading,
    fetchCoupons,
    fetchUserCoupons,
    fetchCouponUsage,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    distributeCoupon,
    validateCoupon,
    useCoupon,
    getCouponByCode,
    couponUsageCount
  }
}
