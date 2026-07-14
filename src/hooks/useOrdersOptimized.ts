import { useState, useEffect, useCallback, useRef } from 'react'
import { Order } from '../types'
import { orderService } from '../services/orderService'

export const useOrdersOptimized = (userId?: string, isAdmin = false) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10
  
  // 缓存已获取的订单详情，避免重复请求
  const orderDetailsCache = useRef<Map<string, any>>(new Map())
  // 防止重复请求的标记
  const fetchingRef = useRef<Set<string>>(new Set())

  // 使用 useCallback 优化 fetchOrders 函数，避免不必要的重新创建
  const fetchOrders = useCallback(async (page = 1) => {
    try {
      console.log('=== fetchOrders 开始 ===')
      console.log('userId:', userId)
      console.log('isAdmin:', isAdmin)
      console.log('page:', page)
      
      if (!userId && !isAdmin) {
        console.log('❌ 没有userId且不是管理员，返回空数据')
        setOrders([])
        setLoading(false)
        return
      }

      // 防止重复请求
      const requestKey = `${userId}-${isAdmin}-${page}`
      if (fetchingRef.current.has(requestKey)) {
        console.log('⚠️ 请求已在进行中，跳过重复请求')
        return
      }
      
      fetchingRef.current.add(requestKey)
      setLoading(true)
      
      // 使用Java接口获取订单数据
      let ordersData
      if (!isAdmin && userId) {
        console.log('📞 调用 getUserOrders API...')
        ordersData = await orderService.getUserOrders(userId, page, pageSize)
      } else if (isAdmin) {
        console.log('📞 调用 getAllOrders API (管理员模式)...')
        ordersData = await orderService.getAllOrders(page, pageSize)
      }
      
      if (ordersData) {
        console.log('✅ API 响应:', ordersData)
        
        // 设置分页信息
        setTotalCount(ordersData.total || 0)
        setTotalPages(ordersData.pages || 1)
        setCurrentPage(page)
        console.log('📊 分页信息 - total:', ordersData.total, 'pages:', ordersData.pages)
        
        // 转换订单数据格式以匹配前端期望的格式
        const transformedOrders = (ordersData.records || []).map((order: any) => {
          console.log('🔍 原始订单数据:', order)
          
          const transformed = {
            ...order,
            // 使用后端返回的商品信息，包含商品名称和数量
            items: order.items || [],
            // 确保日期格式正确
            created_at: order.createdAt || order.created_at,
            updated_at: order.updatedAt || order.updated_at,
            // 转换字段名以匹配前端期望
            user_id: order.userId || order.user_id,
            // 确保 shipping_address 正确映射
            shipping_address: order.shippingAddress || order.shipping_address || null,
            payment_method: order.paymentMethod || order.payment_method,
            applied_coupon: order.appliedCoupon || order.applied_coupon,
            coupon_discount: order.couponDiscount || order.coupon_discount || 0,
            points_discount: order.pointsDiscount || order.points_discount || 0,
            shipping_fee: order.shippingFee || order.shipping_fee || 0,
            points_used: order.pointsUsed || order.points_used,
            shipping_method: order.shippingMethod || order.shipping_method
          }
          
          console.log('🔄 转换后的订单数据:', transformed)
          return transformed
        })
        
        console.log('🔄 转换后的订单数据:', transformedOrders)
        setOrders(transformedOrders)
      }
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
      console.error('错误详情:', error instanceof Error ? error.message : error)
      console.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack trace')
      setOrders([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      // 清除请求标记
      const requestKey = `${userId}-${isAdmin}-${page}`
      fetchingRef.current.delete(requestKey)
      console.log('=== fetchOrders 结束 ===')
    }
  }, [userId, isAdmin, pageSize])

  // 优化的获取订单详情函数，使用缓存避免重复请求
  const getOrderDetails = useCallback(async (orderId: string) => {
    // 检查缓存
    if (orderDetailsCache.current.has(orderId)) {
      console.log('🎯 从缓存获取订单详情:', orderId)
      return orderDetailsCache.current.get(orderId)
    }

    // 防止重复请求
    if (fetchingRef.current.has(`details-${orderId}`)) {
      console.log('⚠️ 订单详情请求已在进行中，跳过重复请求')
      return null
    }

    try {
      fetchingRef.current.add(`details-${orderId}`)
      console.log('🔍 获取订单详情:', orderId)
      
      const completeOrder = await orderService.getOrderWithItems(orderId)
      console.log('📦 完整订单信息:', completeOrder)
      
      // 处理商品信息
      let items = [];
      try {
        if (completeOrder.items) {
          if (Array.isArray(completeOrder.items)) {
            items = completeOrder.items;
          } else if (typeof completeOrder.items === 'string') {
            items = JSON.parse(completeOrder.items);
          } else if (typeof completeOrder.items === 'object') {
            items = [completeOrder.items];
          }
        } else if (completeOrder.orderItems) {
          items = completeOrder.orderItems;
        }
      } catch (error) {
        console.error('解析商品信息失败:', error);
        items = [];
      }

      const orderWithItems = {
        ...completeOrder,
        items: items,
        shipping_address: completeOrder.shippingAddress || completeOrder.shipping_address,
        applied_coupon: completeOrder.appliedCoupon || completeOrder.applied_coupon,
        coupon_discount: completeOrder.couponDiscount || completeOrder.coupon_discount || 0,
        points_used: completeOrder.pointsUsed || completeOrder.points_used,
        points_discount: completeOrder.pointsDiscount || completeOrder.points_discount || 0
      }
      
      // 缓存结果
      orderDetailsCache.current.set(orderId, orderWithItems)
      console.log('💾 订单详情已缓存:', orderId)
      
      return orderWithItems
    } catch (error) {
      console.error('❌ 获取订单详情失败:', error)
      throw error
    } finally {
      fetchingRef.current.delete(`details-${orderId}`)
    }
  }, [])

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      console.log('=== 开始更新订单状态 ===')
      console.log('订单ID:', orderId)
      console.log('新状态:', status)
      
      // 使用Java接口更新订单状态
      await orderService.updateOrderStatus(orderId, status)
      
      console.log('订单状态更新成功')
      
      // 立即更新本地状态
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status, updated_at: new Date().toISOString() }
            : order
        )
      )
      
      // 清除相关缓存
      orderDetailsCache.current.delete(orderId)
      
      console.log('本地状态已更新')
      
      // 然后重新获取数据确保同步
      await fetchOrders(currentPage)
      console.log('数据重新获取完成')
      
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }, [fetchOrders, currentPage])

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      console.log('=== 开始删除订单流程 ===')
      console.log('订单ID:', orderId)
      
      // 通过更新状态为cancelled来实现"删除"效果
      await updateOrderStatus(orderId, 'cancelled')
      
      // 清除缓存
      orderDetailsCache.current.delete(orderId)
      
      console.log('=== 订单已取消（模拟删除） ===')
      
    } catch (error) {
      console.error('=== 删除订单过程中出错 ===')
      console.error('错误详情:', error)
      throw error
    }
  }, [updateOrderStatus])

  // 只在 userId 或 isAdmin 变化时触发初始加载
  useEffect(() => {
    if (userId || isAdmin) {
      fetchOrders(1)
    }
  }, [userId, isAdmin, fetchOrders])

  return { 
    orders, 
    loading, 
    currentPage,
    totalPages,
    totalCount,
    updateOrderStatus, 
    deleteOrder,
    refetch: fetchOrders,
    goToPage: fetchOrders,
    getOrderDetails // 新增：提供优化的订单详情获取方法
  }
}