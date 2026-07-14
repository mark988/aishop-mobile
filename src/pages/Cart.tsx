import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Heart, Share2, Gift, Coins, ChevronDown, Star, Tag, Check, X, Info } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useUserRewards } from '../hooks/useUserRewards'
import { useLanguage } from '../contexts/LanguageContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { usePointsExchange } from '../contexts/PointsExchangeContext'
import { CartItem } from '../types'
import PointsInsufficientDialog from '../components/PointsInsufficientDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import ProgressDialog from '../components/ProgressDialog'
import MobileImageWithFallback from '../components/MobileImageWithFallback'
import toast from 'react-hot-toast'

// Helper function to clean image URLs - Enhanced version
const cleanImageUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    console.log('cleanImageUrl: No URL provided');
    return undefined;
  }
  
  let cleanUrl = url.trim()
  console.log('cleanImageUrl: Original URL:', url, 'Trimmed:', cleanUrl);
  
  // Remove surrounding quotes
  if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
    cleanUrl = cleanUrl.slice(1, -1)
    console.log('cleanImageUrl: Removed quotes:', cleanUrl);
  }
  
  // Handle empty strings
  if (!cleanUrl) {
    console.log('cleanImageUrl: Empty URL after cleaning');
    return undefined;
  }
  
  // Ensure we have a valid URL format
  if (cleanUrl && !cleanUrl.startsWith('http') && !cleanUrl.startsWith('/') && !cleanUrl.startsWith('data:')) {
    // If it's a relative path without leading slash, add one
    cleanUrl = '/' + cleanUrl
    console.log('cleanImageUrl: Added leading slash:', cleanUrl);
  }
  
  console.log('cleanImageUrl: Final URL:', cleanUrl);
  return cleanUrl
}

export default function Cart() {
  const { t } = useLanguage()
  const { cart, cartCount, clearCart, increaseQuantity, decreaseQuantity, removeFromCart, isLoading } = useCart()
  const { user } = useAuth()
  const { calculatePointsFromMoney } = usePointsExchange()
  const { formatPrice } = useCurrency()
  const navigate = useNavigate()
  const { 
    points, 
    userCoupons, 
    exchangeConfig,
    loading: rewardsLoading,
    refreshRewards,
    calculateMoneyFromPoints,
    calculateMaxUsablePoints,
    availableCoupons,
    exchangeRateText: rewardsExchangeRateText
  } = useUserRewards(user?.id || '')
  
  // 商品选择状态
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(true)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [clearingItemIds, setClearingItemIds] = useState<Set<string>>(new Set())
  const [clearingComplete, setClearingComplete] = useState(false)

  // 单个商品删除状态
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false)
  const [showItemDeleteProgress, setShowItemDeleteProgress] = useState(false)
  const [itemDeleteCompleted, setItemDeleteCompleted] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  
  const [usePointsDiscount, setUsePointsDiscount] = useState(false)
  const [showPointsInsufficientWarning, setShowPointsInsufficientWarning] = useState(false)
  const [showPointsInsufficientDialog, setShowPointsInsufficientDialog] = useState(false)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [maxPointsCanUse, setMaxPointsCanUse] = useState(0)
  const [pointsDiscount, setPointsDiscount] = useState(0)
  
  // 优惠券相关状态
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [showCouponList, setShowCouponList] = useState(false)
  const [showCouponSelector, setShowCouponSelector] = useState(false)

  // 分析购物车商品类型 - 移到前面，避免变量声明顺序问题
  const selectedCartItems = (cart || []).filter(item => selectedItems.has(item.id))
  const pointsProducts = selectedCartItems.filter(item => 
    item.product.category === 'points' || item.product.category === '积分兑换'
  )
  const normalProducts = selectedCartItems.filter(item => 
    item.product.category !== 'points' && item.product.category !== '积分兑换'
  )

  // 购物车类型判断
  const hasOnlyPointsProducts = pointsProducts.length > 0 && normalProducts.length === 0
  const hasOnlyNormalProducts = pointsProducts.length === 0 && normalProducts.length > 0
  const hasMixedProducts = pointsProducts.length > 0 && normalProducts.length > 0

  // 计算积分兑换商品的总积分需求
  const totalPointsRequired = pointsProducts.reduce((sum, item) =>
    sum + (item.product.points || calculatePointsFromMoney(item.product.price)) * item.quantity, 0
  )

  // 计算非积分商品的总金额
  const normalProductsSubtotal = normalProducts.reduce((sum, item) => 
    sum + item.product.price * item.quantity, 0
  )

  const subtotal = (cart || [])
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (item.product.price || 0) * (item.quantity || 1), 0)
  
  // 计算选中商品的数量统计
  const selectedItemsCount = selectedItems.size
  const selectedProductsCount = (cart || [])
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (item.quantity || 1), 0)
  
  // 优惠券计算
  const calculateCouponDiscount = (coupon: any, orderAmount: number) => {
    if (!coupon || orderAmount < coupon.min_order_amount) return 0
    
    switch (coupon.type) {
      case 'percentage':
        const percentageDiscount = orderAmount * (coupon.value / 100)
        return coupon.max_discount_amount ? Math.min(percentageDiscount, coupon.max_discount_amount) : percentageDiscount
      case 'fixed':
        return coupon.value
      case 'free_shipping':
        return 0 // 免运费在运费计算中处理
      default:
        return 0
    }
  }
  
  const couponDiscount = appliedCoupon ? calculateCouponDiscount(appliedCoupon.coupon, subtotal) : 0
  
  const afterCouponAmount = subtotal - couponDiscount
  
  // 计算最终总价 - 修正混合商品的计算逻辑
  let total: number;
  if (hasOnlyPointsProducts) {
    // 纯积分商品：无需现金支付
    total = 0;
  } else if (hasMixedProducts) {
    // 混合商品：积分商品用积分兑换（不影响现金总额），非积分商品可以用积分抵扣
    const pointsProductsCost = pointsProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const normalProductsCost = normalProductsSubtotal;

    // 现金支付部分 = 非积分商品金额 - 优惠券 - 积分抵扣
    total = Math.max(0, normalProductsCost - couponDiscount - pointsDiscount);

    console.log('Mixed products total calculation:', {
      pointsProductsCost,
      normalProductsCost,
      couponDiscount,
      pointsDiscount,
      total
    });
  } else {
    // 纯普通商品：使用原逻辑
    total = Math.max(0, afterCouponAmount - pointsDiscount);
  }

  // 当购物车类型变化时，自动设置积分抵扣状态
  useEffect(() => {
    if (hasOnlyPointsProducts) {
      // 只有积分商品时，强制开启积分抵扣
      setUsePointsDiscount(true)
    }
  }, [hasOnlyPointsProducts])

  // 初始化选中所有商品
  useEffect(() => {
    if (cart && cart.length > 0) {
      const allItemIds = new Set(cart.map(item => item.id))
      setSelectedItems(allItemIds)
    }
  }, [cart])

  // 动态计算积分相关数据 - 修正混合商品的积分计算逻辑
  useEffect(() => {
    if (!user?.id || !points) return

    try {
      // 对于混合商品，需要考虑积分商品所需积分和剩余积分
      let calculationBase = subtotal - couponDiscount;
      let availablePointsForDiscount = points.current_points;
      
      if (hasMixedProducts) {
        // 混合商品情况：先扣除积分商品所需积分，剩余积分用于抵扣普通商品
        availablePointsForDiscount = Math.max(0, points.current_points - totalPointsRequired);
        calculationBase = normalProductsSubtotal - couponDiscount;
        
        console.log('Mixed products - 积分计算逻辑:', {
          totalUserPoints: points.current_points,
          pointsRequiredForPointsProducts: totalPointsRequired,
          availablePointsForNormalProducts: availablePointsForDiscount,
          normalProductsSubtotal,
          couponDiscount,
          calculationBase
        });
      } else if (hasOnlyPointsProducts) {
        // 纯积分商品：强制积分抵扣整个金额，检查积分是否足够
        availablePointsForDiscount = points.current_points;
        calculationBase = subtotal - couponDiscount;
      } else {
        // 纯普通商品：可以抵扣部分金额
        availablePointsForDiscount = points.current_points;
        calculationBase = subtotal - couponDiscount;
      }

      // 使用剩余积分计算最大可用积分（用于抵扣普通商品）
      let maxPoints: number;
      
      if (hasMixedProducts) {
        // 混合商品：只用剩余积分抵扣普通商品
        const maxDiscount = Math.max(0, calculationBase) * 0.5; // 普通商品最多50%抵扣
        const maxPointsByDiscount = Math.floor(maxDiscount * 100); // 按100:1兑换率计算
        maxPoints = Math.min(availablePointsForDiscount, maxPointsByDiscount);
      } else {
        // 使用原有的计算逻辑
        const maxPointsData = calculateMaxUsablePoints(
          Math.max(0, calculationBase),
          hasOnlyPointsProducts ? 1.0 : 0.5  // 积分商品100%，普通商品50%
        )
        maxPoints = maxPointsData.maxPoints;
      }

      setMaxPointsCanUse(Math.max(0, maxPoints))

      // 如果当前使用的积分超过了最大值，调整为最大值
      if (pointsToUse > maxPoints) {
        setPointsToUse(maxPoints)
      }

    } catch (error) {
      console.error('Error calculating points data:', error)
      // 使用默认值
      if (points?.current_points) {
        const availablePoints = hasMixedProducts 
          ? Math.max(0, points.current_points - totalPointsRequired)
          : points.current_points;
        const fallbackMax = Math.min(availablePoints, Math.floor((subtotal - couponDiscount) * 0.5 * 100))
        setMaxPointsCanUse(Math.max(0, fallbackMax))
      }
    }
  }, [user, points, subtotal, couponDiscount, calculateMaxUsablePoints, hasMixedProducts, hasOnlyPointsProducts, normalProductsSubtotal, totalPointsRequired])

  // 实时计算积分折扣 - 使用优化后的同步计算确保滑动条响应速度
  useEffect(() => {
    if (usePointsDiscount && pointsToUse > 0) {
      // 使用优化后的同步计算
      const discount = calculateMoneyFromPoints(pointsToUse)
      setPointsDiscount(discount)
    } else {
      setPointsDiscount(0)
    }
  }, [pointsToUse, usePointsDiscount, calculateMoneyFromPoints])

  const applyCoupon = (userCoupon: any) => {
    const coupon = userCoupon.coupon;
    if (subtotal < coupon.min_order_amount) {
      setCouponError(t('cart.coupon_min_order', { amount: formatPrice(coupon.min_order_amount) }))
      return
    }

    setAppliedCoupon(userCoupon)
    setCouponError('')
    setShowCouponList(false)
    toast.success(t('cart.coupon_applied', { title: coupon.title }))
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
    toast.success(t('cart.coupon_removed'))
  }

  const applyCouponByCode = async () => {
    if (!couponCode.trim()) {
      setCouponError(t('cart.coupon_code_required'))
      return
    }

    const matchingCoupon = availableCoupons.find(uc => 
      uc.coupon.code.toLowerCase() === couponCode.toLowerCase()
    )

    if (matchingCoupon) {
      applyCoupon(matchingCoupon)
      setCouponCode('')
    } else {
      setCouponError(t('cart.coupon_invalid'))
    }
  }

  // 商品选择处理函数
  const handleItemSelect = (itemId: string, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems)
    if (checked) {
      newSelectedItems.add(itemId)
    } else {
      newSelectedItems.delete(itemId)
    }
    setSelectedItems(newSelectedItems)
    
    // 更新全选状态
    setSelectAll(newSelectedItems.size === cart?.length)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && cart) {
      const allItemIds = new Set(cart.map(item => item.id))
      setSelectedItems(allItemIds)
    } else {
      setSelectedItems(new Set())
    }
    setSelectAll(checked)
  }

  const handleClearCart = async () => {
    try {
      await clearCart()
      setSelectedItems(new Set())
      setSelectAll(false)
      setShowClearDialog(false)
      toast.success(t('cart.clear_success'))
    } catch (error) {
      toast.error(t('cart.clear_error'))
    }
  }

  const handleCheckout = () => {
    if (selectedItemsCount === 0) {
      toast.error(t('cart.select_items_error'))
      return
    }

    // 检查积分商品的积分是否足够 - 包括混合商品情况
    if ((hasOnlyPointsProducts || hasMixedProducts) && totalPointsRequired > 0) {
      const currentPoints = points?.current_points || 0
      if (currentPoints < totalPointsRequired) {
        setShowPointsInsufficientDialog(true)
        return
      }
    }
    
    // Navigate to checkout with state data - 修正混合商品的数据传递
    let checkoutData: any = {
      usePointsDiscount, 
      pointsToUse, 
      pointsDiscount: pointsDiscount.toFixed(2),
      appliedCoupon: hasOnlyPointsProducts ? null : appliedCoupon,
      couponDiscount: hasOnlyPointsProducts ? 0 : couponDiscount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      selectedItems: Array.from(selectedItems),
      hasOnlyPointsProducts,
      totalPointsRequired,
      hasMixedProducts,
      // 添加缺失的items数据 - checkout页面需要这个数据
      items: selectedCartItems.map(item => ({
        product: item.product,
        quantity: item.quantity,
        selectedProperties: item.selectedProperties,
        // 兼容旧格式
        name: item.product.name,
        price: item.product.price,
        image: item.product.images?.[0] || '',
        productId: item.product.id,
        property: item.selectedProperties || {}
      }))
    };
    
    // 混合商品时，调整数据以确保Checkout页面计算正确
    if (hasMixedProducts) {
      // 对于混合商品，传递详细的计算参数给checkout页面
      checkoutData.normalProductsSubtotal = normalProductsSubtotal.toFixed(2);
      checkoutData.pointsProductsSubtotal = (subtotal - normalProductsSubtotal).toFixed(2);
      
      // 重要：确保积分抵扣数据正确传递
      // 用户选择的积分抵扣只用于非积分商品，积分商品用积分兑换
      checkoutData.pointsUsedForNormalProducts = pointsDiscount.toFixed(2); // 用于非积分商品的积分抵扣
      checkoutData.pointsUsedForPointsProducts = (subtotal - normalProductsSubtotal).toFixed(2); // 积分商品用积分兑换的金额
      
      console.log('Checkout navigation - mixed products data (修复后):', {
        ...checkoutData,
        explanation: {
          normalProductsSubtotal: `非积分商品金额: ${normalProductsSubtotal}`,
          pointsProductsSubtotal: `积分商品金额: ${subtotal - normalProductsSubtotal}`,
          pointsUsedForNormalProducts: `用于非积分商品的{t('cart.points_discount_label')}: ${pointsDiscount}`,
          pointsUsedForPointsProducts: `积分商品兑换金额: ${subtotal - normalProductsSubtotal}`,
          finalTotal: `最终支付金额: ${total}`
        }
      });
    } else {
      console.log('Checkout navigation - single type products:', checkoutData);
    }
    
    navigate('/checkout', { state: checkoutData })
  }

  // 数量变更处理函数
  const handleQuantityChange = async (itemId: string, action: 'increase' | 'decrease') => {
    try {
      if (action === 'increase') {
        await increaseQuantity(itemId)
      } else {
        await decreaseQuantity(itemId)
      }
    } catch (error) {
      toast.error(t('cart.update_quantity_failed'))
    }
  }

  // 删除商品处理函数
  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId)
      // 更新选中状态
      const newSelectedItems = new Set(selectedItems)
      newSelectedItems.delete(itemId)
      setSelectedItems(newSelectedItems)
      setSelectAll(newSelectedItems.size === (cart?.length || 0) - 1)
      toast.success(t('cart.item_deleted'))
    } catch (error) {
      toast.error(t('cart.delete_failed'))
    }
  }

  // 单个商品删除处理
  const handleItemDelete = async () => {
    if (!itemToDelete) return

    setShowItemDeleteConfirm(false)
    setShowItemDeleteProgress(true)
    setItemDeleteCompleted(false)

    try {
      await removeFromCart(itemToDelete.id)
      // 更新选中状态
      const newSelectedItems = new Set(selectedItems)
      newSelectedItems.delete(itemToDelete.id)
      setSelectedItems(newSelectedItems)
      setSelectAll(newSelectedItems.size === (cart?.length || 0) - 1)

      setItemDeleteCompleted(true)
      setTimeout(() => {
        setShowItemDeleteProgress(false)
        setItemToDelete(null)
      }, 2000)
    } catch (error) {
      console.error('删除商品失败:', error)
      setShowItemDeleteProgress(false)
      setItemToDelete(null)
      toast.error(t('cart.delete_failed'))
    }
  }

  const openItemDeleteConfirm = (item: any) => {
    setItemToDelete({ id: item.id, name: item.product.name })
    setShowItemDeleteConfirm(true)
  }

  // 积分输入处理函数
  const handlePointsChange = (newPoints: number) => {
    const validPoints = Math.max(0, Math.min(newPoints, maxPointsCanUse))
    setPointsToUse(validPoints)
  }

  // 优惠券选择处理函数
  const handleCouponSelect = (userCoupon: any) => {
    if (userCoupon) {
      applyCoupon(userCoupon)
    } else {
      removeCoupon()
    }
    setShowCouponSelector(false)
  }

  // 确认清空购物车 - 带动画效果
  const confirmClearCart = async () => {
    if (!cart || cart.length === 0) return
    
    setIsClearingCart(true)
    setClearingComplete(false)
    
    // 获取所有购物车商品ID
    const allItemIds = cart.map(item => item.id)
    
    // 逐个添加到清理动画队列，创建渐进清理效果
    for (let i = 0; i < allItemIds.length; i++) {
      setTimeout(() => {
        setClearingItemIds(prev => new Set([...prev, allItemIds[i]]))
      }, i * 80) // 每80ms清理一个商品，动画更快一些
    }
    
    // 显示清理完成状态
    setTimeout(() => {
      setClearingComplete(true)
    }, allItemIds.length * 80 + 200)
    
    // 等待动画完成后真正清理购物车
    setTimeout(async () => {
      try {
        await clearCart()
        setSelectedItems(new Set())
        setSelectAll(false)
        setShowClearDialog(false)
        setIsClearingCart(false)
        setClearingItemIds(new Set())
        setClearingComplete(false)
        toast.success(t('cart.clear_success'))
      } catch (error) {
        toast.error(t('cart.clear_error'))
        setIsClearingCart(false)
        setClearingItemIds(new Set())
        setClearingComplete(false)
      }
    }, allItemIds.length * 80 + 1000) // 清理完成后再等1秒让用户看到成功状态
  }

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 检查是否登录
  const isLoggedIn = !!user

  // 计算选中商品数量
  const selectedCount = selectedItemsCount
  const totalAmount = total

  // 获取可用优惠券列表
  const coupons = availableCoupons || []

  // 当前选中的优惠券
  const selectedCoupon = appliedCoupon

  // 积分信息
  const pointsInfo = points ? {
    currentPoints: points.current_points,
    exchangeRate: exchangeConfig?.exchange_rate || 100
  } : null

  // 实际使用的积分数量
  const actualPointsToUse = usePointsDiscount ? pointsToUse : 0

  // Show loading state while cart data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <Link to="/" className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold">{t('cart.title')}</h1>
          </div>
        </div>
        
        {/* Loading */}
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('cart.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Link to="/" className="mr-3">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold">{t('cart.title')}</h1>
            <span className="ml-2 text-sm text-gray-500">({cartCount})</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setShowClearDialog(true)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {t('cart.clear_cart')}
            </button>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        // Empty Cart - Enhanced UI
        <div className="flex flex-col items-center justify-center py-16 px-6">
          {/* Animated Shopping Bag */}
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-16 h-16 text-primary-400" />
            </div>
            {/* Floating dots animation */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary-200 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-primary-300 rounded-full animate-pulse delay-300"></div>
          </div>
          
          {/* Main Message */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('cart.empty_title')}</h3>
            <p className="text-gray-500 text-base leading-relaxed mb-6">
              {t('cart.empty_message')}<br/>
              {t('cart.empty_description')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-xs space-y-3">
            <Link
              to="/"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-center block"
            >
              {t('cart.start_shopping')}
            </Link>
            <Link
              to="/categories"
              className="w-full border-2 border-primary-200 text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-2xl font-medium transition-all duration-200 text-center block"
            >
              {t('cart.browse_categories')}
            </Link>
          </div>

          {/* Promotional Banner */}
          {/* <div className="mt-12 bg-gradient-to-r from-orange-50 to-pink-50 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">🎉</div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">新用户专享</h4>
              <p className="text-xs text-gray-600">首单立减20元，满100可用</p>
            </div>
          </div> */}
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <label className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {t('cart.select_all')}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {t('cart.selected_items', {types: selectedItemsCount, total: selectedProductsCount})}
              </div>
            </label>
          </div>

          {/* Cart Items */}
          <div className="space-y-2 p-4">
            {cart.map((item: CartItem) => {
              const isClearing = clearingItemIds.has(item.id)
              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-lg p-4 shadow-sm transition-all duration-500 transform ${
                    isClearing 
                      ? 'opacity-0 scale-95 translate-x-4 pointer-events-none' 
                      : 'opacity-100 scale-100 translate-x-0'
                  }`}
                  style={{
                    transitionDelay: isClearing ? '0ms' : '100ms'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
                    />

                    {/* Product Image/Video */}
                    <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                      {item.product.mediaType === 'video' && item.product.video ? (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <video
                            src={cleanImageUrl(item.product.video)}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            poster={item.product.images?.[0] ? cleanImageUrl(item.product.images[0]) : undefined}
                          >
                          </video>
                        </div>
                      ) : item.product.images && item.product.images.length > 0 ? (
                        <MobileImageWithFallback
                          src={cleanImageUrl(item.product.images[0]) || ''}
                          alt={item.product.name}
                          className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <ShoppingBag className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.product.id}`}>
                        <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {item.product.name}
                        </h3>
                      </Link>
                      
                      {/* Selected Properties */}
                      {item.selectedProperties && Object.keys(item.selectedProperties).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(item.selectedProperties).map(([key, value]) => {
                            // SAFETY FIX: Ensure we only display the first value if somehow a comma-separated string got stored
                            let displayValue = value;
                            if (typeof value === 'string' && value.includes(',')) {
                              displayValue = value.split(',')[0].trim();
                            }

                            return (
                              <span
                                key={key}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {key}: {displayValue}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Price and Controls */}
                      <div className="flex items-center justify-between">
                        {/* 价格显示区域 - 积分商品特殊处理，与PC端一致 */}
                        {item.product.category === 'points' || item.product.category === '积分兑换' ? (
                          <div className="flex flex-col">
                            {/* 划掉的原价 */}
                            <div className="text-xs text-gray-400 line-through mb-1">
                              {formatPrice(item.product.price)}
                            </div>
                            {/* 所需积分 */}
                            <div className="text-sm font-bold text-orange-600 flex items-center">
                              {item.product.points || calculatePointsFromMoney(item.product.price)}{t('products.points')}
                            </div>
                          </div>
                        ) : (
                          <div className="text-primary-600 font-semibold">
                            {formatPrice(item.product.price)}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              onClick={() => handleQuantityChange(item.id, 'decrease')}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 'increase')}
                              disabled={item.quantity >= item.product.stock}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => openItemDeleteConfirm(item)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Stock Info */}
                      {item.product.stock <= 10 && (
                        <div className="text-xs text-orange-600 mt-1">
                          仅剩 {item.product.stock} 件
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Coupons and Points Section */}
      {cart.length > 0 && isLoggedIn && (
        <div className="bg-white mx-4 mb-4 rounded-xl shadow-sm overflow-hidden">
          {/* Coupon Selection - 只有积分商品时不显示 */}
          {!hasOnlyPointsProducts && (
            <div className="px-4 py-3 border-b border-gray-100">
              {/* 可用优惠券提示区域 */}
              {coupons.length > 0 && !appliedCoupon && (
                <div className="mb-3 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gift className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-800">
                      {t('cart.you_have_available', {count: coupons.length})}
                    </span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                      立即使用
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mb-2">{t('cart.choose_and_save')}</p>
                </div>
              )}

              {appliedCoupon ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{appliedCoupon.coupon.title}</p>
                        <p className="text-xs text-green-600">{appliedCoupon.coupon.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-green-600">-{formatPrice(couponDiscount)}</span>
                      <button
                        onClick={removeCoupon}
                        className="w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors"
                        title={t('cart.remove_coupon')}
                      >
                        <X className="w-3 h-3 text-green-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 优惠券列表 - 直接显示可用的优惠券 */}
                  {coupons.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 font-medium">{t('cart.choose_coupon')}</p>
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {coupons.slice(0, 3).map((userCoupon) => {
                          const coupon = userCoupon.coupon;
                          const canUse = subtotal >= (coupon.min_order_amount || 0);
                          const discount = canUse ? calculateCouponDiscount(coupon, subtotal) : 0;
                          
                          return (
                            <button
                              key={userCoupon.id}
                              onClick={() => canUse ? applyCoupon(userCoupon) : null}
                              disabled={!canUse}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                                canUse 
                                  ? 'border-primary-200 bg-primary-50 hover:border-primary-300 hover:bg-primary-100 cursor-pointer transform hover:scale-[1.02]' 
                                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Tag className={`w-3 h-3 ${canUse ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <p className={`text-sm font-medium ${canUse ? 'text-gray-900' : 'text-gray-500'}`}>
                                      {coupon.title}
                                    </p>
                                  </div>
                                  <p className={`text-xs ${canUse ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {coupon.code} •
                                    {coupon.type === 'percentage' ? ` ${coupon.value}%折扣` :
                                     coupon.type === 'fixed' ? ` 减${formatPrice(coupon.value)}` : ' 免运费'}
                                    {coupon.min_order_amount && ` • 满${formatPrice(coupon.min_order_amount)}`}
                                  </p>
                                  {!canUse && coupon.min_order_amount && (
                                    <p className="text-xs text-red-500 mt-1">
                                      还需消费${formatPrice(coupon.min_order_amount - subtotal)}可用
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end">
                                  {canUse && (
                                    <span className="text-sm font-bold text-green-600">
                                      -{formatPrice(discount)}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    canUse ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {canUse ? '立即使用' : '不可用'}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {coupons.length > 3 && (
                        <button
                          onClick={() => setShowCouponList(true)}
                          className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-2"
                        >
                          {t('cart.view_more_coupons', {count: coupons.length - 3})}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 mb-1">{t('cart.no_coupons_available')}</p>
                      <p className="text-xs text-gray-500">{t('cart.complete_tasks')}</p>
                    </div>
                  )}

                  {/* 手动输入优惠券代码 */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-600 font-medium mb-2">{t('cart.enter_coupon_code_label')}</p>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder={t('cart.coupon_code_placeholder')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={applyCouponByCode}
                        disabled={!couponCode.trim()}
                        className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {t('cart.apply')}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-500 mt-1">{couponError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 积分商品提示 */}
          {hasOnlyPointsProducts && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <span className="text-xs mr-1">⭐</span>
                <span className="text-sm text-orange-600 font-medium">
                  {t('cart.points_required', {points: totalPointsRequired})}
                </span>
              </div>
              {pointsInfo && pointsInfo.currentPoints < totalPointsRequired && (
                <div className="text-xs text-red-500 mt-1">
                  {t('cart.points_insufficient', {points: totalPointsRequired - pointsInfo.currentPoints})}
                </div>
              )}
            </div>
          )}

          {/* Points Section - 显示积分相关信息 */}
          {pointsInfo && exchangeConfig && selectedItemsCount > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {t(hasOnlyPointsProducts ? 'cart.points_exchange' : 'cart.points_deduction')}
                  </span>
                  {hasOnlyPointsProducts && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                      {t('cart.only_points_products')}
                    </span>
                  )}
                </div>
                
                {/* 只有在不是纯积分商品时才显示抵扣开关 */}
                {!hasOnlyPointsProducts && (
                  <div className="flex items-center space-x-2">
                    {/* 积分抵扣开关 */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePointsDiscount}
                        onChange={(e) => {
                          setUsePointsDiscount(e.target.checked)
                          if (!e.target.checked) {
                            setPointsToUse(0)
                          } else {
                            // 设置为最大可用积分，但至少为1（如果有积分的话）
                            const initialValue = maxPointsCanUse > 0 ? Math.min(maxPointsCanUse, Math.max(1, Math.floor(maxPointsCanUse / 2))) : 0
                            setPointsToUse(initialValue)
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                        usePointsDiscount ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                          usePointsDiscount ? 'translate-x-5' : 'translate-x-0'
                        }`}>
                          {usePointsDiscount && (
                            <div className="flex items-center justify-center w-full h-full">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`ml-3 text-sm font-medium transition-colors duration-300 ${
                        usePointsDiscount ? 'text-yellow-700' : 'text-gray-500'
                      }`}>
                        {t(usePointsDiscount ? 'cart.discount_enabled' : 'cart.discount_disabled')}
                      </span>
                    </label>
                  </div>
                )}
              </div>
              
              {hasOnlyPointsProducts ? (
                // 积分商品显示积分消耗信息
                <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('cart.total_points_required')}:</span>
                    <span className="font-medium text-orange-600 flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      {totalPointsRequired.toLocaleString()}{t('products.points')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('cart.available_points')}:</span>
                    <span className={`font-medium ${pointsInfo.currentPoints >= totalPointsRequired ? 'text-green-600' : 'text-red-600'}`}>
                      {pointsInfo.currentPoints.toLocaleString()}{t('products.points')}
                    </span>
                  </div>
                  {pointsInfo.currentPoints >= totalPointsRequired ? (
                    <div className="text-center py-2">
                      <div className="text-sm text-green-600 flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('cart.points_sufficient')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <div className="text-sm text-red-600 flex items-center justify-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {t('cart.cannot_exchange')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 普通商品的积分抵扣功能
                <>
                  {/* Points Input - 只有开启积分抵扣时才显示 */}
                  {usePointsDiscount ? (
                    <div className="space-y-2 mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 animate-in slide-in-from-top-2 fade-in duration-300">
                      {/* 混合商品时显示积分分配详情 */}
                      {hasMixedProducts && (
                        <div className={`border rounded-lg p-2 mb-3 ${
                          pointsInfo.currentPoints >= totalPointsRequired 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className={`text-xs font-medium mb-2 ${
                            pointsInfo.currentPoints >= totalPointsRequired 
                              ? 'text-green-800' 
                              : 'text-red-800'
                          }`}>
                            {t('cart.points_usage_detail')}
                          </div>
                          <div className="space-y-1">
                            <div className={`flex justify-between text-xs ${
                              pointsInfo.currentPoints >= totalPointsRequired 
                                ? 'text-green-700' 
                                : 'text-red-700'
                            }`}>
                              <span>{t('cart.points_for_product_exchange')}</span>
                              <span className="font-medium">{totalPointsRequired}{t('cart.points_unit')}</span>
                            </div>
                            <div className={`flex justify-between text-xs ${
                              pointsInfo.currentPoints >= totalPointsRequired 
                                ? 'text-green-700' 
                                : 'text-red-700'
                            }`}>
                              <span>{t('cart.remaining_usable_points')}</span>
                              <span className="font-medium">{Math.max(0, pointsInfo.currentPoints - totalPointsRequired).toLocaleString()}积分</span>
                            </div>
                            {pointsInfo.currentPoints < totalPointsRequired && (
                              <div className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded border border-red-300">
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span className="font-medium">{t('cart.points_insufficient_warning', {count: totalPointsRequired - pointsInfo.currentPoints})}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>
                          {hasMixedProducts
                            ? `${t('cart.remaining_available_points')}: ${Math.max(0, pointsInfo.currentPoints - totalPointsRequired).toLocaleString()}`
                            : `${t('cart.available_points')}: ${pointsInfo.currentPoints.toLocaleString()}`
                          }
                        </span>
                        <span>{rewardsExchangeRateText}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {t(hasMixedProducts ? 'cart.for_normal_products' : 'cart.use_for')}
                        </span>
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max={maxPointsCanUse}
                            step={Math.min(10, Math.max(1, Math.floor(maxPointsCanUse / 10)))} // 动态步长：最大值的1/10，最小1，最大10
                            value={pointsToUse}
                            onChange={(e) => setPointsToUse(Number(e.target.value))}
                            disabled={maxPointsCanUse <= 0}
                            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${maxPointsCanUse > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                            style={{
                              background: maxPointsCanUse > 0 ? `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(pointsToUse / maxPointsCanUse) * 100}%, #e5e7eb ${(pointsToUse / maxPointsCanUse) * 100}%, #e5e7eb 100%)` : '#e5e7eb'
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-yellow-600 whitespace-nowrap min-w-[60px]">
                          {pointsToUse}{t('cart.points_unit')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          {t(hasMixedProducts ? 'cart.normal_product_deduction' : 'cart.discount_amount')}
                        </span>
                        <span className="font-medium text-green-600">-{formatPrice(pointsDiscount)}</span>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          {t(hasMixedProducts ? 'cart.final_remaining' : 'cart.remaining_points')}
                        </span>
                        <span>
                          {hasMixedProducts 
                            ? (pointsInfo.currentPoints - totalPointsRequired - pointsToUse).toLocaleString()
                            : (pointsInfo.currentPoints - pointsToUse).toLocaleString()
                          }
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <div className="flex items-center justify-center space-x-2 text-gray-500">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                        <span className="text-sm">{t('cart.open_points_discount')}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {hasMixedProducts ? (
                          pointsInfo.currentPoints >= totalPointsRequired ? (
                            <>{t('cart.need_points_tip', {required: totalPointsRequired, remaining: Math.max(0, pointsInfo.currentPoints - totalPointsRequired)})}</>
                          ) : (
                            <span className="text-red-500">
                              {t('cart.insufficient_points_alert', {required: totalPointsRequired, current: pointsInfo.currentPoints})}
                            </span>
                          )
                        ) : (
                          `${t('cart.available_points')}: ${pointsInfo.currentPoints.toLocaleString()} (${rewardsExchangeRateText})`
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Bar - Always show when cart has items */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t('cart.select_all_checkbox')}</span>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">
                {t('cart.selected_count', {count: selectedCount})}
              </div>
              {/* Price breakdown */}
              <div className="space-y-1">
                {hasOnlyPointsProducts ? (
                  /* 积分商品显示积分需求 */
                  <div className="text-lg font-semibold text-orange-600 flex items-center">
                    <span className="text-xs mr-1">⭐</span>
                    {totalPointsRequired}{t('cart.points_unit')}
                  </div>
                ) : (
                  /* 普通商品显示金额明细 */
                  <>
                    <div className="text-sm text-gray-600">
                      {t('cart.subtotal_label')}: {formatPrice(subtotal)}
                    </div>
                    {couponDiscount > 0 && (
                      <div className="text-sm text-red-500">
                        {t('cart.coupon_discount')}: -{formatPrice(couponDiscount)}
                      </div>
                    )}
                    {usePointsDiscount && pointsDiscount > 0 && (
                      <div className="text-sm text-yellow-600">
                        {t('cart.points_discount_label')}: -{formatPrice(pointsDiscount)}
                      </div>
                    )}
                    <div className="text-lg font-semibold text-primary-600 border-t pt-1">
                      {t('cart.actual_payment')}: {formatPrice(totalAmount)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 积分不足特别提示 - 只在全部积分商品且积分不足时显示 */}
          {hasOnlyPointsProducts && (!pointsInfo || pointsInfo.currentPoints < totalPointsRequired) && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600">⚠️</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-orange-800 mb-1">{t('cart.points_insufficient_cannot_exchange_title')}</h4>
                  <p className="text-xs text-orange-700">
                    需要 <span className="font-bold">{totalPointsRequired}</span> 积分兑换商品，
                    当前仅有 <span className="font-bold">{pointsInfo?.currentPoints || 0}</span> 积分
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    还差 <span className="font-bold">{Math.max(0, totalPointsRequired - (pointsInfo?.currentPoints || 0))}</span> 积分
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={selectedCount === 0 || ((hasOnlyPointsProducts || hasMixedProducts) && (!pointsInfo || pointsInfo.currentPoints < totalPointsRequired))}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
              selectedCount === 0 || ((hasOnlyPointsProducts || hasMixedProducts) && (!pointsInfo || pointsInfo.currentPoints < totalPointsRequired))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : hasOnlyPointsProducts
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/25 active:scale-[0.98]'
                : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-primary-500/25 active:scale-[0.98]'
            }`}
          >
            {selectedCount === 0 ? t('cart.select_items_button') :
             hasOnlyPointsProducts ?
               (pointsInfo && pointsInfo.currentPoints >= totalPointsRequired ?
                t('cart.points_checkout', {count: selectedCount}) :
                t('cart.insufficient_points_alert', {required: totalPointsRequired, current: pointsInfo?.currentPoints || 0})
               ) :
             hasMixedProducts ?
               (pointsInfo && pointsInfo.currentPoints >= totalPointsRequired ?
                t('cart.checkout_with_count', {count: selectedCount}) :
                t('cart.insufficient_checkout')
               ) :
             t('cart.checkout_with_count', {count: selectedCount})}
          </button>
        </div>
      )}

      {/* Add bottom padding to prevent content being hidden behind fixed button */}
      {cart.length > 0 && <div className="h-32"></div>}

      {/* Custom Clear Cart Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto shadow-2xl">
            <div className="text-center">
              {!isClearingCart ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('cart.clear_confirm')}</h3>
                  <p className="text-gray-500 text-sm mb-6">{t('cart.clear_message')}</p>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowClearDialog(false)}
                      disabled={isClearingCart}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={confirmClearCart}
                      disabled={isClearingCart}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </>
              ) : clearingComplete ? (
                <>
                  {/* 清理完成状态 */}
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('cart.clear_complete')}</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    {t('cart.clear_complete_message', {count: cart?.length || 0})}
                  </p>

                  {/* 成功动画圆环 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                    <div className="bg-green-500 h-2 rounded-full w-full transition-all duration-500 ease-out"></div>
                  </div>

                  <p className="text-xs text-green-600 font-medium">
                    {t('cart.clear_complete_success')}
                  </p>
                </>
              ) : (
                <>
                  {/* 清理动画状态 */}
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="relative">
                      <ShoppingBag className="w-8 h-8 text-orange-600" />
                      {/* 旋转动画指示器 */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('cart.clearing')}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {t('cart.clearing_items', {current: clearingItemIds.size, total: cart?.length || 0})}
                  </p>

                  {/* 进度条 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${cart?.length ? (clearingItemIds.size / cart.length) * 100 : 0}%`
                      }}
                    ></div>
                  </div>

                  {/* 提示文字 */}
                  <p className="text-xs text-gray-400">
                    {t('cart.clearing_wait')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 积分不足弹窗 */}
      <PointsInsufficientDialog
        isOpen={showPointsInsufficientDialog}
        onClose={() => setShowPointsInsufficientDialog(false)}
        requiredPoints={totalPointsRequired}
        currentPoints={pointsInfo?.currentPoints || 0}
      />

      {/* 单个商品删除确认对话框 */}
     <ConfirmDialog
        isOpen={showItemDeleteConfirm}
        title={t('cart.confirm_remove')} 
        message={t('cart.confirm_delete_message', { 
          name: itemToDelete?.name ?? '' 
        })} 
        confirmText={t('cart.confirm_delete_button') || '确认删除'} 
        cancelText={t('common.cancel') || '取消'}
        type="danger"
        onConfirm={handleItemDelete}
        onCancel={() => {
          setShowItemDeleteConfirm(false);
          setItemToDelete(null);
        }}
      />

      {/* 单个商品删除进度对话框 */}
      <ProgressDialog
        isOpen={showItemDeleteProgress}
        title="正在删除商品"
        message={`正在从购物车中删除「${itemToDelete?.name}」...`}
        isCompleted={itemDeleteCompleted}
        completedMessage="商品已成功删除！"
      />
    </div>
  )
}