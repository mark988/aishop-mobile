import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface Coupon {
  id: string
  code: string
  title: string
  description: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  maxDiscountAmount: number
  expiresAt: string
  quantity: number | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface UserCoupon {
  id: string
  userId: string
  couponId: string
  status: 'unused' | 'used' | 'expired'
  usedAt: string | null
  createdAt: string
  coupon: Coupon
}

export const useUserCoupons = () => {
  const { user, isLoggedIn } = useAuth()
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserCoupons = async () => {
    if (!user?.id || !isLoggedIn) {
      setUserCoupons([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/coupons/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch coupons')
      }
      
      const result = await response.json()
      if (result.code === 200) {
        setUserCoupons(result.data || [])
      } else {
        throw new Error(result.message || 'Failed to fetch coupons')
      }
    } catch (err) {
      console.error('Error fetching user coupons:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons')
      setUserCoupons([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserCoupons()
  }, [user?.id, isLoggedIn])

  // Get coupon counts by status
  const getCouponCounts = () => {
    const now = new Date()
    
    let unused = 0
    let used = 0
    let expired = 0

    userCoupons.forEach(coupon => {
      if (coupon.status === 'used') {
        used++
      } else if (coupon.status === 'expired') {
        expired++
      } else {
        // Check if coupon is actually expired
        const expiryDate = new Date(coupon.coupon.expiresAt)
        if (now > expiryDate) {
          expired++
        } else {
          unused++
        }
      }
    })

    return {
      total: userCoupons.length,
      unused,
      used,
      expired
    }
  }

  const refetch = () => {
    fetchUserCoupons()
  }

  return {
    userCoupons,
    loading,
    error,
    counts: getCouponCounts(),
    refetch
  }
}