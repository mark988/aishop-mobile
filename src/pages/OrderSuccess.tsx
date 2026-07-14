import React, { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight, Home, ShoppingBag } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useLanguage } from '../contexts/LanguageContext'

interface OrderData {
  id: string
  total: number
  status: string
  subtotal: number
  items: Array<{
    productId: string
    name: string
    image: string
    quantity: number
    price: number
    property: Record<string, any>
  }>
  userId: string
  shippingAddress: {
    name: string
    phone: string
    address: string
    notes: string
  }
  paymentMethod: string
  createdAt: string
  updatedAt: string
  appliedCoupon: any
  couponDiscount: number
  pointsDiscount: number
  shippingFee: number
  pointsUsed: {
    amount: number
    discount_amount: number
    exchange_rate: {
      points: number
      money: number
    }
  }
  shippingMethod: string
  orderItems: any
}

export default function OrderSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()
  const cartClearedRef = useRef(false)

  const { orderId, orderData }: { orderId?: string, orderData?: OrderData } = location.state || {}

  // Clear cart when order is successful (only once)
  useEffect(() => {
    if (orderId && orderData && !cartClearedRef.current) {
      // Clear the entire cart since order was successful
      clearCart()
      cartClearedRef.current = true
    }
  }, [orderId, clearCart]) // Remove orderData from dependencies to prevent infinite loop

  // Redirect if no order data
  useEffect(() => {
    if (!orderId || !orderData) {
      navigate('/cart')
    }
  }, [orderId, orderData, navigate])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get payment method display name
  const getPaymentMethodName = (code: string) => {
    // Return the translated payment method name from common translations
    const methodKey = `payment.${code}`
    const translated = t(methodKey)
    // If translation exists and is not the same as the key, return it
    if (translated && translated !== methodKey) {
      return translated
    }
    // Fallback to code if no translation found
    return code
  }

  // Get order status display name
  const getOrderStatusName = (status: string) => {
    const statusKey = `orderSuccess.status_${status}`
    const translated = t(statusKey)
    if (translated && translated !== statusKey) {
      return translated
    }
    return status
  }

  if (!orderId || !orderData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="px-4 py-8 text-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('orderSuccess.title')}</h1>
          <p className="text-green-100">{t('orderSuccess.message')}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Order Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('orderSuccess.order_info')}</h2>
            <span className="text-sm text-gray-500">#{orderId.slice(-8)}</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orderSuccess.order_number')}</span>
              <span className="text-gray-900 font-mono">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orderSuccess.order_time')}</span>
              <span className="text-gray-900">{formatDate(orderData.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orderSuccess.order_status')}</span>
              <span className="text-orange-600 font-medium">
                {getOrderStatusName(orderData.status)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('orderSuccess.payment_method')}</span>
              <span className="text-gray-900">{getPaymentMethodName(orderData.paymentMethod)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-900 font-semibold">{t('orderSuccess.order_total')}</span>
              <span className="text-primary-600 font-semibold text-lg">{formatPrice(orderData.total)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Link
            to="/orders"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            {t('orderSuccess.view_orders')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/"
              className="flex items-center justify-center py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              {t('orderSuccess.back_home')}
            </Link>
            <Link
              to="/products"
              className="flex items-center justify-center py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {t('orderSuccess.continue_shopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
