import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Coins, TrendingUp, TrendingDown, RefreshCw, Calendar, Gift } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface PointsData {
  id: string
  userId: string
  points: number
  currentPoints: number
  totalEarned: number
  totalSpent: number
  level: string
  createdAt: string
  updatedAt: string
}

interface PointsHistoryItem {
  id: string
  userId: string
  orderId?: string
  points: number
  type: 'earned' | 'spent'
  description: string
  createdAt: string
}

interface PointsHistoryResponse {
  records: PointsHistoryItem[]
  total: number
  size: number
  current: number
  pages: number
}

export default function Points() {
  const { user, isLoggedIn } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  
  const [pointsData, setPointsData] = useState<PointsData | null>(null)
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([])
  const [historyPagination, setHistoryPagination] = useState({
    total: 0,
    size: 5,
    current: 1,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
  }, [isLoggedIn, navigate])

  // Fetch points data
  const fetchPointsData = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/points/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch points data')
      }
      
      const result = await response.json()
      if (result.code === 200) {
        setPointsData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch points data')
      }
    } catch (error) {
      console.error('Error fetching points data:', error)
      toast.error(t('points.fetch_error'))
    }
  }

  // Fetch points history
  const fetchPointsHistory = async (page: number = 1) => {
    if (!user?.id) return
    
    setHistoryLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/points/history/${user.id}?page=${page}&size=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch points history')
      }
      
      const result = await response.json()
      if (result.code === 200) {
        const historyData: PointsHistoryResponse = result.data
        if (page === 1) {
          setPointsHistory(historyData.records)
        } else {
          setPointsHistory(prev => [...prev, ...historyData.records])
        }
        setHistoryPagination({
          total: historyData.total,
          size: historyData.size,
          current: historyData.current,
          pages: historyData.pages
        })
      } else {
        throw new Error(result.message || 'Failed to fetch points history')
      }
    } catch (error) {
      console.error('Error fetching points history:', error)
      toast.error(t('points.history_fetch_error'))
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load more history
  const loadMoreHistory = () => {
    if (historyPagination.current < historyPagination.pages && !historyLoading) {
      fetchPointsHistory(historyPagination.current + 1)
    }
  }

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchPointsData(),
        fetchPointsHistory(1)
      ])
      toast.success(t('points.data_updated'))
    } catch (error) {
      toast.error(t('points.refresh_failed'))
    } finally {
      setRefreshing(false)
    }
  }

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      const loadData = async () => {
        setLoading(true)
        try {
          await Promise.all([
            fetchPointsData(),
            fetchPointsHistory(1)
          ])
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [user?.id])

  // Get level display name
  const getLevelDisplayName = (level: string) => {
    const levelMap: Record<string, { name: string; color: string }> = {
      'bronze': { name: '青铜会员', color: 'from-amber-400 to-amber-600' },
      'silver': { name: '白银会员', color: 'from-gray-400 to-gray-600' },
      'gold': { name: '黄金会员', color: 'from-yellow-400 to-yellow-600' },
      'platinum': { name: '铂金会员', color: 'from-blue-400 to-blue-600' },
      'diamond': { name: '钻石会员', color: 'from-purple-400 to-purple-600' }
    }
    return levelMap[level] || { name: '普通会员', color: 'from-gray-400 to-gray-600' }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24)
      return t('points.days_ago', { days })
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit' 
      })
    }
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
            <h1 className="text-lg font-semibold">{t('profile.points_center')}</h1>
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

  const levelInfo = getLevelDisplayName(pointsData?.level || 'bronze')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">{t('profile.points_center')}</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Points Overview */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white mx-4 my-4 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('points.current')}</h2>
            <div className="text-4xl font-bold">
              {pointsData?.currentPoints?.toLocaleString() || 0}
            </div>
          </div>
          <div className="text-right">
            <div className={`bg-gradient-to-r ${levelInfo.color} text-white text-sm px-3 py-1 rounded-full font-medium mb-2 inline-block`}>
              {levelInfo.name}
            </div>
            <Coins className="w-16 h-16 opacity-20" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-10 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="text-sm opacity-90">{t('points.total_earned')}</span>
            </div>
            <div className="text-2xl font-semibold">
              {pointsData?.totalEarned?.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <TrendingDown className="w-4 h-4 mr-2" />
              <span className="text-sm opacity-90">{t('points.total_spent')}</span>
            </div>
            <div className="text-2xl font-semibold">
              {pointsData?.totalSpent?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white mx-4 rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('points.quick_actions')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/category/points"
            className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-orange-900">{t('cart.points_exchange')}</span>
            <span className="text-xs text-orange-600 mt-1">{t('points.hot_products')}</span>
          </Link>
          <div className="flex flex-col items-center p-4 bg-blue-50 rounded-xl opacity-60">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-900">{t('points.check_in')}</span>
            <span className="text-xs text-blue-600 mt-1">{t('points.coming_soon')}</span>
          </div>
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white mx-4 rounded-2xl shadow-sm">
        <div className="px-4 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{t('points.history')}</h3>
        </div>

        {pointsHistory.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('points.no_records')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('points.go_shopping')}</p>
          </div>
        ) : (
          <div>
            {pointsHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    item.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {item.type === 'earned' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${
                  item.type === 'earned' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <div className="text-lg font-semibold">
                    {item.type === 'earned' ? '+' : ''}{item.points.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {historyPagination.current < historyPagination.pages && (
              <div className="p-4">
                <button
                  onClick={loadMoreHistory}
                  disabled={historyLoading}
                  className="w-full py-3 text-primary-600 text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {historyLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('common.loading')}
                    </div>
                  ) : (
                    `${t('points.load_more')} (${historyPagination.current}/${historyPagination.pages})`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  )
}