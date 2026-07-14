import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Package, Clock, Truck, CheckCircle, XCircle, MessageSquare, X, Star, Upload, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useLanguage } from '../contexts/LanguageContext'
import { reviewService } from '../services/reviewService'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface OrderItem {
  name: string
  image: string
  price: number
  property?: any
  quantity: number
  productId: string
}

interface Order {
  id: string
  total: number
  status: string
  subtotal: number
  items: OrderItem[]
  userId: string
  shippingAddress: {
    name: string
    notes: string
    phone: string
    address: string
  }
  paymentMethod: string
  payment_proof_url?: string
  paymentProofUrl?: string
  payment_proof_uploaded_at?: string
  paymentProofUploadedAt?: string
  createdAt: string
  updatedAt: string
  appliedCoupon: any
  couponDiscount: number
  pointsDiscount: number
  shippingFee: number
  pointsUsed: any
  shippingMethod: string
}

interface OrderResponse {
  code: number
  message: string
  data: {
    records: Order[]
    total: number
    size: number
    current: number
    pages: number
  }
}

// Helper function to clean image URLs
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  let cleanUrl = url.trim()
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
  }
  return cleanUrl
}

// Status configuration - now uses translation function
const getStatusConfig = (t: any) => ({
  pending: { label: t('order.status.pending'), icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  unshipped: { label: t('order.status.unshipped'), icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  shipped: { label: t('order.status.shipped'), icon: Truck, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  unreceived: { label: t('order.status.unreceived'), icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  received: { label: t('order.status.received'), icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  completed: { label: t('order.status.completed'), icon: CheckCircle, color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: t('order.status.cancelled'), icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
 // refunded: { label: t('order.status.refunded'), icon: CheckCircle, color: 'text-orange-600', bgColor: 'bg-orange-50' }
})

export default function Orders() {
  const { user, isLoggedIn, token } = useAuth()
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get('status')

  // Get status config with translations
  const statusConfig = getStatusConfig(t)

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(statusFilter || 'all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 评价相关状态
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // 取消订单相关状态
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)

  // 支付凭证上传相关状态
  const [showPaymentProofDialog, setShowPaymentProofDialog] = useState(false)
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Fetch orders
  const fetchOrders = React.useCallback(async (status: string = 'all', page: number = 1) => {
    if (!isLoggedIn || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      let url = `${API_BASE_URL}/api/orders/user/${user.id}?page=${page}&size=10`
      if (status !== 'all') {
        url += `&status=${status}`
      }
      console.log('Fetching orders with URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          setOrders([])
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: OrderResponse = await response.json()

      if (data.code === 200) {
        setOrders(data.data.records)
        setTotalPages(data.data.pages)
        setCurrentPage(data.data.current)
        console.log('Orders fetched:', data.data.records.length, 'for status:', status)
      } else {
        throw new Error(data.message || 'Failed to fetch orders')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, user?.id, token])

  useEffect(() => {
    fetchOrders(activeTab, 1)
  }, [fetchOrders, activeTab])

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab)
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 打开评价对话框
  const handleReviewItem = (order: Order, item: OrderItem) => {
    setReviewingOrder(order)
    setReviewingItem(item)
    setReviewRating(5)
    setReviewComment('')
    setShowReviewDialog(true)
  }

  // 提交评价
  const handleSubmitReview = async () => {
    if (!user || !reviewingItem) return

    if (!reviewComment.trim()) {
      toast.error(t('orders.review_required'))
      return
    }

    setSubmittingReview(true)
    try {
      await reviewService.createReview({
        userId: user.id,
        userName: user.username || user.name || user.id,
        productId: reviewingItem.productId,
        rating: reviewRating,
        comment: reviewComment
      })

      toast.success(t('orders.review_success'), {
        duration: 3000,
        position: 'top-center',
      })

      setShowReviewDialog(false)
      setReviewingItem(null)
      setReviewComment('')

      // Refresh orders
      fetchOrders(activeTab, currentPage)
    } catch (error) {
      console.error('提交评价失败:', error)
      toast.error(t('orders.review_failed'), {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  // 打开取消订单对话框
  const handleCancelOrderClick = (order: Order) => {
    setCancelingOrder(order)
    setShowCancelDialog(true)
  }

  // 取消订单
  const handleCancelOrder = async () => {
    if (!cancelingOrder) return

    setCancelingOrderId(cancelingOrder.id)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${cancelingOrder.id}/status`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.code === 200) {
        toast.success(t('order.cancel_success'), {
          duration: 3000,
          position: 'top-center',
        })

        setShowCancelDialog(false)
        setCancelingOrder(null)

        // Refresh orders
        fetchOrders(activeTab, currentPage)
      } else {
        throw new Error(data.message || 'Failed to cancel order')
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      toast.error(t('orders.cancel_failed'), {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setCancelingOrderId(null)
    }
  }

  // 打开支付凭证上传对话框
  const handleUploadPaymentProof = (orderId: string) => {
    setUploadingOrderId(orderId)
    setSelectedFile(null)
    setUploadProgress(0)
    setShowPaymentProofDialog(true)
  }

  // 处理文件选择（移动端支持拍照和选择图片）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validTypes.includes(file.type)) {
        toast.error('请上传图片文件（JPG、PNG、GIF）')
        return
      }
      // 验证文件大小（最大5MB）
      if (file.size > 5 * 1024 * 1024) {
        toast.error('文件大小不能超过5MB')
        return
      }
      setSelectedFile(file)
    }
  }

  // 上传支付凭证
  const handleSubmitPaymentProof = async () => {
    if (!selectedFile || !uploadingOrderId) {
      toast.error('请选择要上传的文件')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 上传文件
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败')
      }

      const uploadData = await uploadResponse.json()
      const fileUrl = uploadData.data?.url || uploadData.url

      setUploadProgress(50)

      // 更新订单状态
      const updateResponse = await fetch(`${API_BASE_URL}/api/orders/${uploadingOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentProofUrl: fileUrl,
          paymentProofUploadedAt: new Date().toISOString(),
          status: 'paid',
          updatedAt: new Date().toISOString()
        }),
      })

      if (!updateResponse.ok) {
        throw new Error('订单更新失败')
      }

      setUploadProgress(100)

      toast.success('支付凭证上传成功！订单状态已更新为已支付', {
        duration: 3000,
        position: 'top-center',
      })

      setShowPaymentProofDialog(false)
      setSelectedFile(null)
      setUploadingOrderId(null)

      // 刷新订单列表
      fetchOrders(activeTab, currentPage)
    } catch (error) {
      console.error('上传支付凭证失败:', error)
      toast.error('上传失败，请重试', {
        duration: 5000,
        position: 'top-center',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // If not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <Link to="/profile" className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold">{t('profile.my_orders')}</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('profile.login_prompt')}</h3>
          <p className="text-gray-500 text-sm mb-6">{t('order.login_to_view')}</p>
          <Link
            to="/login"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {t('login.go_to_login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <Link to="/profile" className="mr-3">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-semibold">{t('orders.title')}</h1>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <div className="flex min-w-max px-2">
            {[
              { key: 'all', label: t('filter.all') },
              { key: 'pending', label: t('order.status.pending') },
              { key: 'shipped', label: t('order.status.shipped') },
              { key: 'completed', label: t('order.status.completed') },
              { key: 'cancelled', label: t('order.status.cancelled') },
              // { key: 'refunded', label: t('orders.refunded') }
            ].map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-primary-600 border-primary-600 bg-primary-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* 占位元素确保右侧有足够空间 */}
            <div className="w-4 flex-shrink-0"></div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {/* <div className="p-2 bg-yellow-100 text-xs">
        Active Tab: {activeTab}, Orders: {orders.length}, Loading: {loading ? 'Yes' : 'No'}
      </div> */}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('orders.loading')}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => fetchOrders(activeTab, currentPage)}
            className="w-full mt-3 text-primary-600 font-medium"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Orders List */}
      {!loading && !error && (
        <div>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'all' ? t('orders.empty') : t('orders.empty_for_status', {
                  status: t(`orders.${activeTab}`)
                })}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {activeTab === 'all' ? t('orders.empty_desc') : t('orders.empty_status_desc')}
              </p>
              <Link
                to="/"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t('orders.start_shopping')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {orders.map((order) => {
                const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
                const StatusIcon = statusInfo.icon
                
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    {/* Order Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{t('orders.order_number_label')}</span>
                          <span className="text-sm font-mono text-gray-900 font-medium">{order.id.slice(-8)}</span>
                        </div>
                        <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                          {statusInfo.label}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3 mb-3 last:mb-0">
                          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img
                                src={cleanImageUrl(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                              {item.name}
                            </h3>
                            {item.property && Object.keys(item.property).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {Object.entries(item.property).map(([key, value]) => (
                                  <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary-600">
                                {formatPrice(item.price)}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">
                          {t('orders.total_items', { count: order.items.length })}
                        </span>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {t('orders.actual_payment')} <span className="text-lg font-bold text-gray-900">{order.currency?.symbol || '¥'}{order.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* 收货信息 */}
                      {order.shippingAddress && (
                        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-start space-x-2">
                            <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 mb-1">{t('orders.shipping_info')}</p>
                              <p className="text-sm text-gray-900 leading-relaxed">
                                {order.shippingAddress.name || t('common.not_filled')} / {order.shippingAddress.phone || t('common.not_filled')} / {order.shippingAddress.address || t('common.address_not_filled')}
                                {order.shippingAddress.notes && (
                                  <span className="text-gray-600"> / {order.shippingAddress.notes}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end space-x-2">
                        {order.status === 'pending' && order.paymentMethod === 'cod' && (
                          <button
                            onClick={() => handleCancelOrderClick(order)}
                            disabled={cancelingOrderId === order.id}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cancelingOrderId === order.id ? t('orders.cancelling') : t('orders.cancel_order')}
                          </button>
                        )}
                        {order.status === 'pending' && order.paymentMethod === 'payment_slip' && !order.paymentProofUrl && (
                          <button
                            onClick={() => handleUploadPaymentProof(order.id)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm flex items-center space-x-1"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Pending payment</span>
                          </button>
                        )}
                        {order.status === 'unshipped' && (
                          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                            {t('orders.view_details')}
                          </button>
                        )}
                        {order.status === 'unreceived' && (
                          <div className="flex space-x-2">
                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                              {t('orders.view_logistics')}
                            </button>
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm">
                              {t('orders.confirm_receipt')}
                            </button>
                          </div>
                        )}
                        {(order.status === 'received' || order.status === 'completed') && (
                          <button
                            onClick={() => order.items[0] && handleReviewItem(order, order.items[0])}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center space-x-1"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>{t('orders.review_order')}</span>
                          </button>
                        )}
                        {/* {order.status === 'refunded' && (
                          <div className="flex space-x-2">
                            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                              {t('orders.view_details')}
                            </button>
                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm">
                              {t('orders.buy_again')}
                            </button>
                          </div>
                        )} */}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-3 py-6 px-4">
              <button
                onClick={() => fetchOrders(activeTab, currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {t('pagination.previous')}
              </button>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 bg-primary-50 px-3 py-1.5 rounded-lg font-medium">
                  {currentPage} / {totalPages}
                </span>
              </div>
              <button
                onClick={() => fetchOrders(activeTab, currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 评价对话框 */}
      {showReviewDialog && reviewingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('orders.review_product')}</h3>
                    <p className="text-xs text-gray-500">{t('orders.share_experience')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewDialog(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
                  disabled={submittingReview}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {reviewingItem.image ? (
                      <img
                        src={cleanImageUrl(reviewingItem.image)}
                        alt={reviewingItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {reviewingItem.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {t('orders.quantity_label')} {reviewingItem.quantity} | {t('orders.price_label')} {formatPrice(reviewingItem.price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.rating_required')}
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewRating(rating)}
                      disabled={submittingReview}
                      className="transition-all duration-200 transform active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= reviewRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {reviewRating === 5 ? t('orders.rating_very_satisfied') :
                   reviewRating === 4 ? t('orders.rating_satisfied') :
                   reviewRating === 3 ? t('orders.rating_average') :
                   reviewRating === 2 ? t('orders.rating_dissatisfied') :
                   t('orders.rating_very_dissatisfied')}
                </p>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.comment_required')}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  disabled={submittingReview}
                  placeholder={t('orders.comment_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('orders.character_limit', { count: reviewComment.length })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowReviewDialog(false)}
                  disabled={submittingReview}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submittingReview ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('orders.submitting')}</span>
                    </>
                  ) : (
                    <span>{t('orders.submit_review')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评价对话框 */}
      {showReviewDialog && reviewingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('orders.review_product')}</h3>
                    <p className="text-xs text-gray-500">{t('orders.share_experience')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={submittingReview}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <img
                    src={cleanImageUrl(reviewingItem.image) || '/placeholder-image.svg'}
                    alt={reviewingItem.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.svg'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                      {reviewingItem.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {t('orders.quantity_label')} {reviewingItem.quantity} | {t('orders.price_label')} {formatPrice(reviewingItem.price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.rating_required')}
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewRating(rating)}
                      disabled={submittingReview}
                      className="transition-transform duration-200 active:scale-90"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          rating <= reviewRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-700 mt-2">
                  {reviewRating === 5 ? t('orders.rating_very_satisfied') :
                   reviewRating === 4 ? t('orders.rating_satisfied') :
                   reviewRating === 3 ? t('orders.rating_average') :
                   reviewRating === 2 ? t('orders.rating_dissatisfied') :
                   t('orders.rating_very_dissatisfied')}
                </p>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('orders.comment_required')}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  disabled={submittingReview}
                  placeholder={t('orders.comment_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('orders.character_limit', { count: reviewComment.length })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowReviewDialog(false)}
                  disabled={submittingReview}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submittingReview ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('orders.submitting')}</span>
                    </>
                  ) : (
                    <span>{t('orders.submit_review')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 取消订单确认对话框 */}
      {showCancelDialog && cancelingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-200">
            <div className="p-6">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('orders.confirm_cancel_dialog_title')}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {t('orders.confirm_cancel_dialog_message')}
                </p>
                <div className="bg-gray-100 px-3 py-2 rounded-lg mb-2">
                  <p className="text-xs font-mono text-gray-700">
                    {t('orders.order_number_short')} #{cancelingOrder.id.slice(-8)}
                  </p>
                </div>
                <p className="text-xs text-red-600">{t('orders.cancel_irreversible')}</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelDialog(false)
                    setCancelingOrder(null)
                  }}
                  disabled={cancelingOrderId === cancelingOrder.id}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('orders.keep_order')}
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelingOrderId === cancelingOrder.id}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 active:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {cancelingOrderId === cancelingOrder.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('orders.cancelling')}</span>
                    </>
                  ) : (
                    <span>{t('orders.confirm_cancel_button')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付凭证上传对话框 - 移动端支持拍照和选择图片 */}
      {showPaymentProofDialog && uploadingOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">上传支付凭证</h3>
                    <p className="text-xs text-gray-500">拍照或选择付款截图</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPaymentProofDialog(false)
                    setSelectedFile(null)
                    setUploadingOrderId(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200"
                  disabled={uploading}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* File Upload - 移动端支持拍照和选择图片 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择上传方式 *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="payment-proof-camera"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                    id="payment-proof-gallery"
                  />

                  {selectedFile ? (
                    <div className="text-center py-2">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="预览"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                        disabled={uploading}
                      >
                        重新选择
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-3">
                        <label
                          htmlFor="payment-proof-camera"
                          className="flex-1 cursor-pointer flex flex-col items-center py-4 px-3 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors"
                        >
                          <Camera className="w-8 h-8 text-blue-600 mb-2" />
                          <span className="text-sm font-medium text-blue-600">拍照</span>
                        </label>
                        <label
                          htmlFor="payment-proof-gallery"
                          className="flex-1 cursor-pointer flex flex-col items-center py-4 px-3 bg-green-50 rounded-lg hover:bg-green-100 active:bg-green-200 transition-colors"
                        >
                          <Upload className="w-8 h-8 text-green-600 mb-2" />
                          <span className="text-sm font-medium text-green-600">相册选择</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式，最大 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">上传进度</span>
                    <span className="text-sm font-medium text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>提示：</strong>上传支付凭证后，订单状态将自动更新为"已支付"，请确保凭证真实有效。
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowPaymentProofDialog(false)
                    setSelectedFile(null)
                    setUploadingOrderId(null)
                  }}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitPaymentProof}
                  disabled={uploading || !selectedFile}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>上传中...</span>
                    </>
                  ) : (
                    <span>确认上传</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}