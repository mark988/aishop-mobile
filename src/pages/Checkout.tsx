import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Package, Truck, CreditCard, MapPin, User, Phone, MessageSquare, Coins, Gift, Star, Tag, CheckCircle, Shield, Building2, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { usePointsExchange } from '../contexts/PointsExchangeContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useBankAccounts } from '../hooks/useBankAccounts'
import { BankAccountSelector } from '../components/BankAccountSelector'
import { ImageUpload } from '../components/ImageUpload'
import toast from 'react-hot-toast'

// API Base URL - use environment variable or default
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

// Types for APIs
interface PaymentMethod {
  id: number
  code: string
  description: string
  nameZh: string
  nameEn: string
  iconType: 'emoji' | 'brand'
  iconValue: string
  brandColors: string | null
  supportedCards: string | null
  isEnabled: boolean
  sortOrder: number
  processingMessage: string
  buttonTextTemplate: string
  createdAt: string
  updatedAt: string
}

interface ShippingMethod {
  id: number
  code: string
  description: string
  price: number
  icon: string
  color: string
  nameZh: string
  nameEn: string
  priceDisplay: string
  estimatedDays: string
  isEnabled: boolean
  sortOrder: number
  minOrderAmount: number
  maxOrderAmount: number | null
  availableRegions: string | null
  businessHours: string | null
  specialNotes: string
  createdAt: string
  updatedAt: string
}

interface CheckoutItem {
  image: string
  name: string
  price: number
  productId: string
  property: Record<string, any>
  quantity: number
}

interface CheckoutData {
  items: CheckoutItem[]
  subtotal: number
  couponDiscount: number
  pointsDiscount: number
  totalAmount: number
  selectedCoupon: any
  pointsUsed: number
}

interface ShippingAddress {
  name: string
  phone: string
  address: string
  notes: string
}

// Helper function to clean image URLs - Enhanced version
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  
  let cleanUrl = url.trim()
  
  // Remove surrounding quotes
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
  }
  
  // Handle empty strings
  if (!cleanUrl) return undefined
  
  // Ensure we have a valid URL format
  if (cleanUrl && !cleanUrl.startsWith('http') && !cleanUrl.startsWith('/') && !cleanUrl.startsWith('data:')) {
    // If it's a relative path without leading slash, add one
    cleanUrl = '/' + cleanUrl
  }
  
  return cleanUrl
}

export default function Checkout() {
  const { t, language } = useLanguage()
  const { user, isLoggedIn, token } = useAuth()
  const { calculatePointsFromMoney } = usePointsExchange()
  const { formatPrice, currency } = useCurrency()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get checkout data from location state - compatible with PC cart data structure
  const cartData = location.state || {}
  const {
    checkoutData,
    usePointsDiscount = false,
    pointsToUse = 0,
    pointsDiscount = '0.00', 
    appliedCoupon = null,
    couponDiscount = '0.00',
    subtotal: cartSubtotal,
    total: cartTotal,
    items: cartItems = [],
    hasMixedProducts = false,
    normalProductsSubtotal = null,
    pointsProductsSubtotal = null,
    pointsUsedForNormalProducts = null, // 用于非积分商品的积分抵扣
    pointsUsedForPointsProducts = null, // 积分商品兑换金额
    hasOnlyPointsProducts = false,
    totalPointsRequired = 0
  } = cartData

  // Support both old checkoutData format and new cart data format
  const checkoutItems = checkoutData?.items || cartItems

  // 重新计算小计金额，确保准确性
  const calculatedSubtotal = checkoutItems.reduce((sum, item) => {
    const itemData = item.product || item
    const price = itemData.price || item.price || 0
    const quantity = item.quantity || 1
    return sum + price * quantity
  }, 0)

  const subtotalAmount = parseFloat(checkoutData?.subtotal || cartSubtotal || '0') || calculatedSubtotal
  const totalAmount = parseFloat(checkoutData?.totalAmount || cartTotal || '0') || subtotalAmount

  // 分析商品类型 - 判断是否有积分商品
  const pointsProducts = checkoutItems.filter(item => {
    const itemData = item.product || item
    return itemData.category === 'points' || itemData.category === '积分兑换'
  })
  const checkoutHasPointsProducts = pointsProducts.length > 0
  const checkoutHasOnlyPointsProducts = pointsProducts.length > 0 && pointsProducts.length === checkoutItems.length
  const checkoutHasMixedProducts = pointsProducts.length > 0 && pointsProducts.length < checkoutItems.length

  // 计算积分商品的总积分需求
  const checkoutTotalPointsRequired = pointsProducts.reduce((sum, item) => {
    const itemData = item.product || item
    const price = itemData.price || item.price || 0
    const quantity = item.quantity || 1
    return sum + calculatePointsFromMoney(price) * quantity
  }, 0)

  // 计算普通商品的小计（非积分商品）
  const normalProducts = checkoutItems.filter(item => {
    const itemData = item.product || item
    return itemData.category !== 'points' && itemData.category !== '积分兑换'
  })
  const checkoutNormalProductsSubtotal = normalProducts.reduce((sum, item) => {
    const itemData = item.product || item
    const price = itemData.price || item.price || 0
    const quantity = item.quantity || 1
    return sum + price * quantity
  }, 0)

  // States
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null)
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  /**
   * 银行转账支付相关状态（移动端）
   * 当用户选择"支付凭证"(payment_slip)支付方式时，需要：
   * 1. 从后端获取可用的银行账户列表
   * 2. 用户选择一个银行账户并查看账号、户名等信息
   * 3. 用户线下完成银行转账
   * 4. 用户上传转账截图作为支付凭证
   * 5. 提交订单时将截图URL和银行代码一并发送给后端
   */
  const { bankAccounts, loading: banksLoading } = useBankAccounts()
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('')
  const [uploadingAddress, setUploadingAddress] = useState(false)
  const addressFileInputRef = React.useRef<HTMLInputElement>(null)

  // 计算最终支付金额的函数 - 参考PC端逻辑
  const calculateFinalPayableAmount = () => {
    if (hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) {
      // 纯积分商品：商品用积分抵扣，但需要支付配送费
      return Math.max(0, shippingFee - parseFloat(couponDiscount))
    } else if (checkoutHasMixedProducts || hasMixedProducts) {
      // 混合商品：计算需要支付的金额 = 普通商品金额 - 积分抵扣 - 优惠券 + 运费
      const payableAmount = (normalProductsSubtotal || checkoutNormalProductsSubtotal) - parseFloat(pointsDiscount) - parseFloat(couponDiscount) + shippingFee
      return Math.max(0, payableAmount)
    } else {
      // 纯普通商品：商品总金额 + 运费 - 优惠券 - 积分抵扣
      return Math.max(0, subtotalAmount + shippingFee - parseFloat(couponDiscount) - parseFloat(pointsDiscount))
    }
  }

  // 处理地址照片上传
  const handleAddressPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!acceptedFormats.includes(file.type)) {
      toast.error('不支持的文件格式。请上传 JPG、PNG 格式的图片')
      return
    }

    // 验证文件大小
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 5) {
      toast.error('文件过大，最大支持 5MB')
      return
    }

    setUploadingAddress(true)

    try {
      // 上传到服务器
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`上传失败: HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload result:', result)
      if (result.code === 200 && result.data) {
        const imageUrl = result.data.url || result.data
        // 将图片URL设置到地址输入框
        setShippingAddress({ ...shippingAddress, address: imageUrl })
        toast.success('地址照片上传成功！')
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (err) {
      console.error('Upload error:', err)
      toast.error(`上传失败: ${err instanceof Error ? err.message : '请重试'}`)
    } finally {
      setUploadingAddress(false)
      // 清空文件选择，允许再次选择同一文件
      if (addressFileInputRef.current) {
        addressFileInputRef.current.value = ''
      }
    }
  }

  // 触发拍照
  const handleCameraClick = () => {
    addressFileInputRef.current?.click()
  }
  
  // Shipping address form - enhanced user info detection
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: user?.name || user?.user_metadata?.name || '',
    phone: user?.phone || user?.user_metadata?.phone || '',
    address: user?.address || user?.user_metadata?.address || '',
    notes: ''
  })

  // Form validation
  const [errors, setErrors] = useState<Partial<ShippingAddress>>({})

  // 保存用户填写的信息到 localStorage
  const saveCheckoutData = () => {
    const checkoutState = {
      shippingAddress,
      selectedPaymentMethod: selectedPaymentMethod?.code,
      selectedShippingMethod: selectedShippingMethod?.code,
      selectedBank,
      paymentProofUrl,
      cartData: location.state,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('pendingCheckoutData', JSON.stringify(checkoutState))
  }

  // 恢复用户填写的信息
  const restoreCheckoutData = () => {
    try {
      const savedData = localStorage.getItem('pendingCheckoutData')
      if (savedData) {
        const checkoutState = JSON.parse(savedData)

        // 检查数据是否在30分钟内
        const savedTime = new Date(checkoutState.timestamp).getTime()
        const now = new Date().getTime()
        const thirtyMinutes = 30 * 60 * 1000

        if (now - savedTime < thirtyMinutes) {
          // 恢复收货信息
          if (checkoutState.shippingAddress) {
            setShippingAddress(checkoutState.shippingAddress)
          }

          // 恢复支付方式（等待支付方式加载后再设置）
          if (checkoutState.selectedPaymentMethod && paymentMethods.length > 0) {
            const method = paymentMethods.find(m => m.code === checkoutState.selectedPaymentMethod)
            if (method) setSelectedPaymentMethod(method)
          }

          // 恢复配送方式（等待配送方式加载后再设置）
          if (checkoutState.selectedShippingMethod && shippingMethods.length > 0) {
            const method = shippingMethods.find(m => m.code === checkoutState.selectedShippingMethod)
            if (method) setSelectedShippingMethod(method)
          }

          // 恢复银行选择和支付凭证
          if (checkoutState.selectedBank) setSelectedBank(checkoutState.selectedBank)
          if (checkoutState.paymentProofUrl) setPaymentProofUrl(checkoutState.paymentProofUrl)

          toast.success('已恢复您之前填写的信息')

          // 清除保存的数据
          localStorage.removeItem('pendingCheckoutData')
        } else {
          // 数据过期，清除
          localStorage.removeItem('pendingCheckoutData')
        }
      }
    } catch (error) {
      console.error('恢复checkout数据失败:', error)
      localStorage.removeItem('pendingCheckoutData')
    }
  }

  // 登录后恢复数据
  useEffect(() => {
    if (isLoggedIn && user) {
      restoreCheckoutData()
    }
  }, [isLoggedIn, user, paymentMethods, shippingMethods])

  // Redirect if no checkout data
  useEffect(() => {
    if (!checkoutItems || checkoutItems.length === 0) {
      toast.error(t('checkout.redirecting') || '无效的结算数据')
      navigate('/cart')
      return
    }
  }, [checkoutItems, navigate, t])

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          const enabledMethods = data.data.filter((method: PaymentMethod) => method.isEnabled)
          setPaymentMethods(enabledMethods)
          if (enabledMethods.length > 0) {
            setSelectedPaymentMethod(enabledMethods[0])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err)
    }
  }

  // Fetch shipping methods
  const fetchShippingMethods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/shipping-methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.code === 200) {
          const enabledMethods = data.data.filter((method: ShippingMethod) => method.isEnabled)
          setShippingMethods(enabledMethods)
          if (enabledMethods.length > 0) {
            setSelectedShippingMethod(enabledMethods[0])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching shipping methods:', err)
    }
  }

  // Calculate shipping fee with coupon free shipping support
  const calculateShippingFee = async (shippingMethodCode: string) => {
    console.log('Calculating shipping fee for method:', shippingMethodCode, {
      subtotalAmount,
      appliedCoupon,
      selectedShippingMethod
    });

    try {
      // Check for free shipping coupon
      const hasFreeShipping = appliedCoupon?.coupon?.type === 'free_shipping' &&
                             subtotalAmount >= (appliedCoupon.coupon.min_order_amount || 0)

      if (hasFreeShipping) {
        console.log('Free shipping applied via coupon');
        setShippingFee(0)
        return
      }

      const response = await fetch(`${API_BASE_URL}/shipping-methods/calculate-fee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingCode: shippingMethodCode,
          orderAmount: subtotalAmount
        })
      })

      console.log('Shipping fee API response status:', response.status);

      if (response.ok) {
        const data = await response.json()
        console.log('Shipping fee API response data:', data);
        if (data.code === 200) {
          // If API returns 0, use the shipping method's price instead
          const calculatedFee = data.data || 0;
          if (calculatedFee === 0 && selectedShippingMethod && selectedShippingMethod.price > 0) {
            console.warn('API returned 0 fee, using shipping method price instead:', selectedShippingMethod.price);
            setShippingFee(selectedShippingMethod.price);
          } else {
            setShippingFee(calculatedFee);
            console.log('Shipping fee set to:', calculatedFee);
          }
        } else {
          console.warn('Shipping fee API returned non-200 code:', data.code, data.message);
          // Use fallback price from shipping method
          if (selectedShippingMethod) {
            setShippingFee(selectedShippingMethod.price || 0)
            console.log('Using fallback shipping fee:', selectedShippingMethod.price);
          }
        }
      } else {
        console.warn('Shipping fee API request failed:', response.status, response.statusText);
        // Use fallback price from shipping method
        if (selectedShippingMethod) {
          setShippingFee(selectedShippingMethod.price || 0)
          console.log('Using fallback shipping fee:', selectedShippingMethod.price);
        }
      }
    } catch (err) {
      console.error('Error calculating shipping fee:', err)
      // Set default shipping fee based on selected method
      if (selectedShippingMethod) {
        const fallbackFee = selectedShippingMethod.price || 0;
        setShippingFee(fallbackFee)
        console.log('Error fallback - using shipping fee:', fallbackFee);
      }
    }
  }

  // Load initial data - 修改条件，确保即使没有checkoutItems也会加载配送和支付方式
  useEffect(() => {
    console.log('Loading payment and shipping methods...', { 
      checkoutItems: checkoutItems?.length || 0,
      loading 
    });
    
    // 总是尝试加载支付方式和配送方式，不依赖于checkoutItems
    setLoading(true)
    Promise.all([
      fetchPaymentMethods(),
      fetchShippingMethods()
    ]).finally(() => {
      setLoading(false)
    })
  }, []) // 移除checkoutItems依赖，避免因为数据问题导致不加载

  // Calculate shipping fee when method changes or coupon is applied
  useEffect(() => {
    if (selectedShippingMethod) {
      calculateShippingFee(selectedShippingMethod.code)
    }
  }, [selectedShippingMethod, appliedCoupon, subtotalAmount])

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingAddress> = {}

    if (!shippingAddress.name.trim()) {
      newErrors.name = '请输入收货人姓名'
    }

    if (!shippingAddress.phone.trim()) {
      newErrors.phone = '请输入联系电话'
    }

    if (!shippingAddress.address.trim()) {
      newErrors.address = '请输入收货地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit order
  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      toast.error(t('checkout.complete_shipping_info') || '请完善收货信息')
      return
    }

    if (!selectedPaymentMethod) {
      toast.error(t('checkout.select_payment_method'))
      return
    }

    if (!selectedShippingMethod) {
      toast.error(t('checkout.select_shipping_method'))
      return
    }

    /**
     * 银行转账支付方式验证（移动端）
     * 仅当选择 payment_slip 支付方式时，才需要验证：
     * 1. 必须选择一个银行账户
     * 2. 必须上传支付截图
     */
    if (selectedPaymentMethod.code === 'payment_slip') {
      if (!selectedBank) {
        toast.error(t('checkout.select_bank_account_prompt'))
        return
      }
      if (!paymentProofUrl) {
        toast.error(t('checkout.upload_payment_proof'))
        return
      }
    }

    // 检查用户登录状态
    let currentUser = user
    if (!currentUser) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser)
        } catch (error) {
          console.error('解析本地用户信息失败:', error)
        }
      }
    }

    // 如果用户未登录，显示登录对话框
    if (!currentUser || !currentUser.id) {
      // 保存用户填写的信息
      saveCheckoutData()
      // 显示登录对话框
      setShowLoginDialog(true)
      return
    }

    setSubmitting(true)

    try {
      // 此时用户已登录，currentUser 已经验证过

      // Calculate final total and points discount based on product types
      let finalOrderTotal: number;
      let finalPointsDiscount: number;
      
      if (hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) {
        // 全是积分兑换商品: 商品用积分抵扣，但需要支付配送费
        finalOrderTotal = Math.max(0, shippingFee - parseFloat(couponDiscount));
        finalPointsDiscount = subtotalAmount;
        console.log('Case 1: 全是积分兑换商品', { subtotalAmount, shippingFee, couponDiscount, finalPointsDiscount, finalOrderTotal });
      } else if (!checkoutHasMixedProducts && !hasMixedProducts && pointsProducts.length === 0) {
        // 不是积分兑换商品: total=用户实际应该支付金额，pointsDiscount=用户实际选择的积分抵扣金额
        finalOrderTotal = Math.max(0, subtotalAmount + shippingFee - parseFloat(couponDiscount) - parseFloat(pointsDiscount));
        finalPointsDiscount = parseFloat(pointsDiscount) || 0;
        console.log('Case 2: 不是积分兑换商品', { subtotalAmount, shippingFee, couponDiscount, pointsDiscount, finalOrderTotal, finalPointsDiscount });
      } else {
        // 积分兑换和非积分兑换商品混合: 使用cart页面传递的精确数据
        const pointsProductsTotal = pointsProducts.reduce((sum, item) => {
          const itemData = item.product || item;
          return sum + (itemData.price || item.price || 0) * (item.quantity || 1);
        }, 0);
        
        // 优先使用cart页面传递的精确数据
        let normalProductsTotal: number;
        if (normalProductsSubtotal !== null) {
          normalProductsTotal = parseFloat(normalProductsSubtotal);
          console.log('使用cart传递的normalProductsSubtotal:', normalProductsTotal);
        } else {
          normalProductsTotal = totalAmount - pointsProductsTotal;
          console.log('计算得出的normalProductsTotal:', normalProductsTotal);
        }
        
        // 用户选择的积分抵扣数据（仅用于非积分商品）
        let pointsDiscountForNormalProducts: number;
        if (pointsUsedForNormalProducts !== null) {
          pointsDiscountForNormalProducts = parseFloat(pointsUsedForNormalProducts);
          console.log('使用cart传递的pointsUsedForNormalProducts:', pointsDiscountForNormalProducts);
        } else {
          pointsDiscountForNormalProducts = parseFloat(pointsDiscount) || 0;
          console.log('使用默认的pointsDiscount:', pointsDiscountForNormalProducts);
        }
        
        // 最终支付金额 = 非积分商品金额 + 运费 - 优惠券折扣 - 用户选择的积分抵扣(仅用于非积分商品)
        // 注意：积分商品通过积分兑换，不参与现金支付计算
        finalOrderTotal = Math.max(0, normalProductsTotal + shippingFee - parseFloat(couponDiscount) - pointsDiscountForNormalProducts);
        
        // 积分抵扣总额 = 积分商品总金额(通过积分兑换) + 用户选择的积分抵扣金额(用于非积分商品)
        finalPointsDiscount = pointsProductsTotal + pointsDiscountForNormalProducts;
        
        console.log('Case 3: 混合商品 (使用cart精确数据)', { 
          totalAmount,
          pointsProductsTotal,
          normalProductsTotal,
          normalProductsSubtotalFromCart: normalProductsSubtotal,
          pointsDiscountForNormalProducts,
          pointsUsedForNormalProducts,
          shippingFee, 
          couponDiscount,
          finalOrderTotal, 
          finalPointsDiscount,
          calculation: {
            step1: `非积分商品金额: ${normalProductsTotal}`,
            step2: `非积分商品 + 运费: ${normalProductsTotal + shippingFee}`,
            step3: `非积分商品 + 运费 - 优惠券: ${normalProductsTotal + shippingFee - parseFloat(couponDiscount)}`,
            step4: `最终支付 = ${normalProductsTotal} + ${shippingFee} - ${parseFloat(couponDiscount)} - ${pointsDiscountForNormalProducts} = ${finalOrderTotal}`,
            pointsBreakdown: `积分抵扣 = 积分商品兑换${pointsProductsTotal} + 用户积分抵扣${pointsDiscountForNormalProducts} = ${finalPointsDiscount}`
          }
        });
      }
      
      console.log('Order calculation summary:', {
        hasOnlyPointsProducts: hasOnlyPointsProducts || checkoutHasOnlyPointsProducts,
        hasPointsProducts: pointsProducts.length > 0,
        pointsProductsCount: pointsProducts.length,
        subtotalAmount,
        totalAmount,
        shippingFee,
        couponDiscount: parseFloat(couponDiscount),
        userPointsDiscount: parseFloat(pointsDiscount),
        finalOrderTotal,
        finalPointsDiscount
      });
      
      // Calculate total points to be used
      const totalPointsToUse = (() => {
        if (hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) {
          // 纯积分商品：使用积分兑换所需的总积分
          return totalPointsRequired || checkoutTotalPointsRequired;
        } else if (hasMixedProducts) {
          // 混合商品：积分商品兑换积分 + 用户选择的积分抵扣
          const pointsForExchange = checkoutTotalPointsRequired || 0;
          const pointsForDiscount = pointsToUse || 0;
          return pointsForExchange + pointsForDiscount;
        } else {
          // 纯普通商品：只有用户选择的积分抵扣
          return pointsToUse || 0;
        }
      })();
      
      console.log('Points calculation for order submission:', {
        hasOnlyPointsProducts: hasOnlyPointsProducts || checkoutHasOnlyPointsProducts,
        hasMixedProducts,
        checkoutTotalPointsRequired,
        pointsToUse,
        totalPointsToUse,
        finalPointsDiscount,
        willIncludePointsInOrder: totalPointsToUse > 0
      });
      
      // Prepare order data according to API specification
      const orderData = {
        userId: currentUser.id,
        items: checkoutItems.map(item => {
          const itemData = item.product || item
          return {
            image: (itemData.images && itemData.images.length > 0) ? itemData.images[0] : (itemData.image || item.image || ''),
            name: itemData.name || item.name || '',
            price: itemData.price || item.price || 0,
            productId: itemData.id || item.productId || '',
            property: item.property || item.selectedProperties || {},
            quantity: item.quantity || 1
          }
        }),
        subtotal: (hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) ? 0 : subtotalAmount, // 纯积分商品subtotal为0
        shippingFee: shippingFee,
        couponDiscount: parseFloat(couponDiscount) || 0,
        pointsDiscount: finalPointsDiscount,
        total: finalOrderTotal,
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          notes: shippingAddress.notes || ''
        },
        shippingMethod: selectedShippingMethod.code,
        paymentMethod: selectedPaymentMethod.code,
        appliedCoupon: appliedCoupon || null,
        currency: {
          code: currency.code,
          symbol: currency.symbol,
          name: currency.name
        },
        /**
         * 银行转账支付凭证信息（移动端）
         * 仅当选择 payment_slip 支付方式时，这些字段才会有值：
         * - paymentProofUrl: 用户上传的转账截图URL
         * - selectedBankCode: 用户选择的银行代码
         * - paymentProofUploadedAt: 截图上传时间（ISO格式）
         */
        paymentProofUrl: paymentProofUrl || null,
        selectedBankCode: selectedBank || null,
        paymentProofUploadedAt: paymentProofUrl ? new Date().toISOString() : null,
        // Only include pointsUsed if points are actually being used
        ...(totalPointsToUse > 0 && {
          pointsUsed: {
            amount: totalPointsToUse,
            discount_amount: finalPointsDiscount,
            exchange_rate: {
              points: 1, // 修正为1:1兑换率
              money: 1
            }
          }
        })
      }

      console.log('Submitting order:', orderData)
      console.log('💱 移动端发送的currency:', orderData.currency)

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.code === 200) {
          toast.success('订单提交成功！')
          // Clear cart items that were ordered
          // Navigate to order success page
          navigate('/order-success', { 
            state: { 
              orderId: result.data.id,
              orderData: result.data 
            } 
          })
        } else {
          throw new Error(result.message || '订单提交失败')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '订单提交失败')
      }
    } catch (err) {
      console.error('Error submitting order:', err)
      toast.error(err instanceof Error ? err.message : '订单提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // Format price
  // Component render starts here

  if (!checkoutItems || checkoutItems.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <Link to="/cart" className="mr-3">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-semibold">{t('checkout.title')}</h1>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="space-y-4 p-4">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('checkout.shipping_info')}</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    {t('checkout.recipient_name')}
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('checkout.name_placeholder')}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    {t('checkout.phone_number')}
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('checkout.phone_placeholder')}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {t('checkout.detailed_address')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('checkout.address_placeholder')}
                  />
                  {/* 隐藏的文件选择input */}
                  <input
                    ref={addressFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    capture="environment"
                    onChange={handleAddressPhotoUpload}
                    className="hidden"
                  />
                  {/* 相机按钮 */}
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    disabled={uploadingAddress}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 active:text-primary-600 active:bg-primary-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingAddress ? (
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                <p className="text-xs text-gray-400 mt-1">{t('checkout.address_photo_tip')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  {t('checkout.notes_optional')}
                </label>
                <textarea
                  value={shippingAddress.notes}
                  onChange={(e) => setShippingAddress({...shippingAddress, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={t('checkout.notes_example')}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-4">
              <Package className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('cart.product_list')}</h2>
              <span className="ml-2 text-sm text-gray-500">({checkoutItems.length}件)</span>
              {/* 调试信息：显示商品类型分析 */}
              <div className="ml-2 text-xs text-gray-400">
                {(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded mr-1">纯积分</span>}
                {pointsProducts.length > 0 && !(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) && <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded mr-1">混合</span>}
                {pointsProducts.length === 0 && <span className="bg-green-100 text-green-600 px-2 py-1 rounded mr-1">普通</span>}
                <span>积分:{pointsProducts.length}, 普通:{checkoutItems.length - pointsProducts.length}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {checkoutItems.map((item, index) => {
                // Support both checkout data format and cart item format
                const itemData = item.product || item
                const isPointsProduct = itemData.category === 'points' || itemData.category === '积分兑换'
                
                return (
                  <div key={index} className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {(() => {
                        // 视频显示逻辑
                        if (itemData.mediaType === 'video' && itemData.video) {
                          return (
                            <video
                              src={cleanImageUrl(itemData.video)}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              autoPlay
                              playsInline
                              poster={itemData.images?.[0] ? cleanImageUrl(itemData.images[0]) : undefined}
                              onError={(e) => {
                                const target = e.target as HTMLVideoElement;
                                const fallbackImg = document.createElement('img');
                                const fallbackSrc = itemData.images?.[0]
                                  ? cleanImageUrl(itemData.images[0])
                                  : itemData.image ? cleanImageUrl(itemData.image) : item.image ? cleanImageUrl(item.image) : undefined;

                                if (fallbackSrc) {
                                  fallbackImg.src = fallbackSrc;
                                  fallbackImg.className = 'w-full h-full object-cover';
                                  fallbackImg.alt = itemData.name || item.name;
                                  fallbackImg.onError = () => {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'w-full h-full flex items-center justify-center text-gray-400 bg-gray-100';
                                    placeholder.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm2 2v8h12V6H6zm3 3l1.5 2L12 9l3 4H7l2-2z"/></svg>';
                                    fallbackImg.parentNode?.replaceChild(placeholder, fallbackImg);
                                  };
                                  target.parentNode?.replaceChild(fallbackImg, target);
                                } else {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'w-full h-full flex items-center justify-center text-gray-400 bg-gray-100';
                                  placeholder.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm2 2v8h12V6H6zm3 3l1.5 2L12 9l3 4H7l2-2z"/></svg>';
                                  target.parentNode?.replaceChild(placeholder, target);
                                }
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          );
                        }

                        // 图片显示逻辑 - 优先使用 images 数组
                        let imageUrl = undefined;
                        if (itemData.images && itemData.images.length > 0) {
                          imageUrl = cleanImageUrl(itemData.images[0]);
                        } else if (itemData.image) {
                          imageUrl = cleanImageUrl(itemData.image);
                        } else if (item.image) {
                          imageUrl = cleanImageUrl(item.image);
                        }

                        if (imageUrl) {
                          return (
                            <img
                              src={imageUrl}
                              alt={itemData.name || item.name}
                              className="w-full h-full object-cover"
                            />
                          );
                        }

                        // 默认占位符
                        return (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                            <Package className="w-6 h-6" />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {itemData.name || item.name}
                      </h3>
                      {(item.property || item.selectedProperties) && Object.keys(item.property || item.selectedProperties || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {Object.entries(item.property || item.selectedProperties || {}).map(([key, value]) => (
                            <span key={key} className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        {isPointsProduct ? (
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-400 line-through mb-1">
                              {formatPrice(itemData.price || item.price || 0)}
                            </div>
                            <div className="text-sm font-bold text-orange-600 flex items-center">
                              <Star className="w-3 h-3 mr-1" />
                              {calculatePointsFromMoney(itemData.price || item.price || 0)}积分
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-primary-600">
                            {formatPrice(itemData.price || item.price || 0)}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          x{item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Shipping Methods */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-4">
              <Truck className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('checkout.shipping_method')}</h2>
              {/* 调试信息 */}
              <span className="ml-2 text-xs text-gray-400">
                ({shippingMethods.length}个选项)
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {shippingMethods.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  暂无配送方式可选
                </div>
              ) : (
                shippingMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedShippingMethod(method)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selectedShippingMethod?.id === method.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{method.icon}</span>
                        <div className="font-medium text-gray-900 text-sm">{method.nameZh}</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-1 line-clamp-2">{method.description}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">{method.estimatedDays}</div>
                        <div className="font-semibold text-primary-600 text-sm">
                          {method.price === 0 ? '免费' : formatPrice(method.price)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-4">
              <CreditCard className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">{t('checkout.payment_method')}</h2>
              {/* 调试信息 */}
              <span className="ml-2 text-xs text-gray-400">
                ({paymentMethods.length}个选项)
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  暂无支付方式可选
                </div>
              ) : (
                paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selectedPaymentMethod?.id === method.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{method.iconValue}</span>
                        <div className="font-medium text-gray-900 text-sm">{method.nameZh}</div>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">{method.description}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Bank Transfer Payment Section - 仅当选择 payment_slip 支付方式时显示（移动端） */}
          {selectedPaymentMethod?.code === 'payment_slip' && (
            <div className="space-y-4">
              {/* 银行账户选择 */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center mb-4">
                  <Building2 className="w-5 h-5 text-primary-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">{t('checkout.select_bank_account')}</h2>
                  {banksLoading && (
                    <span className="ml-2 text-xs text-gray-400">{t('common.loading')}</span>
                  )}
                </div>

                {banksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">加载银行账户...</p>
                    </div>
                  </div>
                ) : (
                  <BankAccountSelector
                    banks={bankAccounts.map(b => ({
                      id: b.id,
                      bankName: b.bankName,
                      bankCode: b.bankCode,
                      accountNumber: b.accountNumber,
                      accountName: b.accountName,
                      bankLogoUrl: b.bankLogoUrl,
                      qrCodeUrl: b.qrCodeUrl,
                      instructions: b.instructions
                    }))}
                    selectedBank={selectedBank}
                    onSelectBank={setSelectedBank}
                  />
                )}
              </div>

              {/* 支付截图上传 - 仅在选择银行后显示 */}
              {selectedBank && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <ImageUpload
                    onImageUploaded={setPaymentProofUrl}
                    currentImage={paymentProofUrl}
                    label="Upload payment screenshot"
                    description="Supports JPG and PNG formats, maximum file size 2MB."
                  />

                  {/* 转账提示 */}
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>💡 Kind tips：</strong><br />
                      1. Please complete the bank transfer first.<br />
                      2. Upload a clear screenshot of the transfer (including transfer time, amount, etc.).<br />
                      3. We will process your order as soon as possible after receiving the transfer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price Summary - 与PC端订单摘要保持一致 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.order_summary')}</h2>
            
            {/* Price Breakdown - 参考PC端样式和逻辑 */}
            <div className="space-y-3 mb-6 pt-4 border-t">
              <div className="flex justify-between text-gray-600">
                <span>{t('checkout.subtotal')}</span>
                <span>{formatPrice(subtotalAmount)}</span>
              </div>

              {/* 积分兑换商品抵扣 - 只在混合商品情况下显示 */}
              {checkoutHasMixedProducts && checkoutTotalPointsRequired > 0 && (
                <div className="flex justify-between text-orange-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    <span>积分兑换商品 ({checkoutTotalPointsRequired}积分)</span>
                  </div>
                  <span>-{formatPrice(subtotalAmount - checkoutNormalProductsSubtotal)}</span>
                </div>
              )}

              {/* 优惠券抵扣 - 与PC端一致 */}
              {appliedCoupon && parseFloat(couponDiscount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 mr-1" />
                    <span>{appliedCoupon.coupon.title}</span>
                  </div>
                  <span>-{formatPrice(parseFloat(couponDiscount))}</span>
                </div>
              )}

              {/* 积分抵扣 - 用于普通商品 */}
              {usePointsDiscount && parseFloat(pointsDiscount) > 0 && (
                <div className="flex justify-between text-blue-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    <span>
                      {checkoutHasMixedProducts
                        ? `普通商品积分抵扣 (${pointsToUse}积分)`
                        : `${t('checkout.points_discount')} (${pointsToUse}积分)`
                      }
                    </span>
                  </div>
                  <span>-{formatPrice(parseFloat(pointsDiscount))}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>{t('checkout.shipping_fee')}</span>
                <span>{shippingFee === 0 ? t('checkout.free_shipping') : formatPrice(shippingFee)}</span>
              </div>

              {/* 积分兑换商品特殊显示 - 只在纯积分商品情况下显示 */}
              {(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) && !(checkoutHasMixedProducts) && (
                <div className="flex justify-between text-orange-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    <span>积分兑换 ({totalPointsRequired || checkoutTotalPointsRequired}积分)</span>
                  </div>
                  <span>-{formatPrice(totalAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t">
                <span>{(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) ? '积分消耗' : t('checkout.total')}</span>
                <span className={(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) ? 'text-orange-600' : 'text-primary-600'}>
                  {(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) ? (
                    <span className="flex items-center">
                      <Star className="w-5 h-5 mr-1" />
                      {totalPointsRequired || checkoutTotalPointsRequired}积分
                    </span>
                  ) : (
                    formatPrice(calculateFinalPayableAmount())
                  )}
                </span>
              </div>

              {/* 积分商品显示现金支付（配送费等） */}
              {(hasOnlyPointsProducts || checkoutHasOnlyPointsProducts) && (
                <div className="flex justify-between text-sm text-gray-600 border-t pt-2">
                  <span>现金支付（配送费等）</span>
                  <span className="font-medium">{formatPrice(calculateFinalPayableAmount())}</span>
                </div>
              )}
            </div>

            {/* Security Notice - 与PC端一致 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm text-green-800">{t('checkout.secure_payment')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {!loading && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              submitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {submitting ? (
              selectedPaymentMethod?.processingMessage || t('checkout.submitting')
            ) : selectedPaymentMethod ? (
              t('checkout.confirm_order_with_payment', {
                payment: language === 'zh' ? selectedPaymentMethod.nameZh : selectedPaymentMethod.nameEn,
                amount: formatPrice(calculateFinalPayableAmount())
              })
            ) : (
              `${t('checkout.confirm_order')} ${formatPrice(calculateFinalPayableAmount())}`
            )}
          </button>
        </div>
      )}

      {/* Login Dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('login.required_title')}</h3>
            <p className="text-gray-600 text-sm mb-6">
              {t('login.required_message')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('login.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowLoginDialog(false)
                  navigate('/login', { state: { from: '/checkout', checkoutData: location.state } })
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('login.go_to_login')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}