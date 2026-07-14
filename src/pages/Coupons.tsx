import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, Calendar, Tag, Percent } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

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

export default function Coupons() {
  const { user, isLoggedIn } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unused' | 'used' | 'expired'>('all')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
  }, [isLoggedIn, navigate])

  // Fetch user coupons
  const fetchUserCoupons = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
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
    } catch (error) {
      console.error('Error fetching user coupons:', error)
      toast.error(t('coupons.fetch_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserCoupons()
    }
  }, [user?.id])

  // Filter coupons by status
  const getFilteredCoupons = () => {
    if (activeTab === 'all') return userCoupons
    return userCoupons.filter(coupon => {
      if (activeTab === 'unused') return coupon.status === 'unused'
      if (activeTab === 'used') return coupon.status === 'used'
      if (activeTab === 'expired') return coupon.status === 'expired'
      return true
    })
  }

  // Get coupon status with auto-expiry check
  const getCouponStatus = (coupon: UserCoupon) => {
    if (coupon.status === 'used') return 'used'
    if (coupon.status === 'expired') return 'expired'
    
    const now = new Date()
    const expiryDate = new Date(coupon.coupon.expiresAt)
    if (now > expiryDate) return 'expired'
    
    return 'unused'
  }

  // Format discount display
  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return t('coupons.type.percentage', {value: coupon.value})
    } else {
      return t('coupons.type.fixed', {value: coupon.value})
    }
  }

  // Format expiry date
  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return t('coupons.expires_today')
    } else if (diffInHours < 24 * 7) {
      const days = Math.ceil(diffInHours / 24)
      return t('coupons.expires_in_days', { days })
    } else {
      return t('coupons.expires_on', { date: date.toLocaleDateString() })
    }
  }

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'unused':
        return { text: t('coupons.status.available'), color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle }
      case 'used':
        return { text: t('coupons.status.used'), color: 'text-gray-500', bg: 'bg-gray-50', icon: CheckCircle }
      case 'expired':
        return { text: t('coupons.status.expired'), color: 'text-red-500', bg: 'bg-red-50', icon: XCircle }
      default:
        return { text: t('coupons.status.unknown'), color: 'text-gray-500', bg: 'bg-gray-50', icon: XCircle }
    }
  }

  // Count coupons by status
  const getCouponCounts = () => {
    const unused = userCoupons.filter(c => getCouponStatus(c) === 'unused').length
    const used = userCoupons.filter(c => getCouponStatus(c) === 'used').length
    const expired = userCoupons.filter(c => getCouponStatus(c) === 'expired').length
    return { unused, used, expired, total: userCoupons.length }
  }

  if (!isLoggedIn) {
    return null // Will redirect to login
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('coupons.my.title')}</h1>
          </div>
        </div>

        {/* Loading */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredCoupons = getFilteredCoupons()
  const counts = getCouponCounts()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">{t('coupons.my.title')}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white mx-4 my-4 rounded-2xl p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">{counts.total}</div>
          <div className="text-gray-500">{t('coupons.total_count')}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-semibold text-green-600 mb-1">{counts.unused}</div>
            <div className="text-xs text-gray-500">{t('coupons.tab.available')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-500 mb-1">{counts.used}</div>
            <div className="text-xs text-gray-500">{t('coupons.tab.used')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-red-500 mb-1">{counts.expired}</div>
            <div className="text-xs text-gray-500">{t('coupons.tab.expired')}</div>
          </div>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="bg-white mx-4 rounded-2xl shadow-sm">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'all', label: t('coupons.tab.all'), count: counts.total },
            { key: 'unused', label: t('coupons.tab.available'), count: counts.unused },
            { key: 'used', label: t('coupons.tab.used'), count: counts.used },
            { key: 'expired', label: t('coupons.tab.expired'), count: counts.expired }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 text-xs ${
                  activeTab === tab.key ? 'text-primary-500' : 'text-gray-400'
                }`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Coupons List */}
        <div className="p-4">
          {filteredCoupons.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {activeTab === 'all' ? t('coupons.empty.all') :
                 activeTab === 'unused' ? t('coupons.empty.available') :
                 activeTab === 'used' ? t('coupons.empty.used') : t('coupons.empty.expired')}
              </p>
              <p className="text-sm text-gray-400 mt-1">{t('coupons.empty.go_shopping')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCoupons.map((userCoupon) => {
                const status = getCouponStatus(userCoupon)
                const statusInfo = getStatusInfo(status)
                const StatusIcon = statusInfo.icon

                return (
                  <div
                    key={userCoupon.id}
                    className={`relative rounded-2xl overflow-hidden border ${
                      status === 'unused' 
                        ? 'border-primary-200 bg-gradient-to-r from-primary-50 to-white'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Main Content */}
                    <div className="flex p-4">
                      {/* Left Side - Discount */}
                      <div className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center mr-4 ${
                        status === 'unused' ? 'bg-primary-100' : 'bg-gray-200'
                      }`}>
                        {userCoupon.coupon.type === 'percentage' ? (
                          <>
                            <div className={`text-2xl font-bold ${
                              status === 'unused' ? 'text-primary-600' : 'text-gray-500'
                            }`}>
                              {userCoupon.coupon.value}%
                            </div>
                            <div className={`text-xs ${
                              status === 'unused' ? 'text-primary-600' : 'text-gray-500'
                            }`}>
                              {t('coupons.discount_label')}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={`text-lg font-bold ${
                              status === 'unused' ? 'text-primary-600' : 'text-gray-500'
                            }`}>
                              ¥{userCoupon.coupon.value}
                            </div>
                            <div className={`text-xs ${
                              status === 'unused' ? 'text-primary-600' : 'text-gray-500'
                            }`}>
                              {t('coupons.coupon_label')}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Middle - Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">
                          {userCoupon.coupon.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {userCoupon.coupon.description}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            {userCoupon.coupon.code}
                          </div>
                          {userCoupon.coupon.minOrderAmount > 0 && (
                            <div>
                              {t('coupons.min_amount', {amount: userCoupon.coupon.minOrderAmount})}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {status === 'used' ? (
                            t('coupons.used_on', {date: new Date(userCoupon.usedAt!).toLocaleDateString()})
                          ) : (
                            formatExpiryDate(userCoupon.coupon.expiresAt)
                          )}
                        </div>
                      </div>

                      {/* Right Side - Status */}
                      <div className="flex flex-col items-end justify-between">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          <div className="flex items-center">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.text}
                          </div>
                        </div>
                        
                        {status === 'unused' && (
                          <button
                            onClick={() => {
                              // Navigate to products page or copy coupon code
                              navigator.clipboard.writeText(userCoupon.coupon.code)
                              toast.success(t('coupons.code_copied'))
                            }}
                            className="text-xs text-primary-600 font-medium mt-2 hover:text-primary-700"
                          >
                            {t('coupons.copy_code')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Decorative Elements */}
                    {status === 'unused' && (
                      <>
                        {/* Left Circle */}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-gray-50 rounded-full"></div>
                        {/* Right Circle */}
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-gray-50 rounded-full"></div>
                        {/* Dotted Line */}
                        <div className="absolute left-2 right-2 top-1/2 transform -translate-y-1/2 border-t border-dashed border-gray-300"></div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  )
}