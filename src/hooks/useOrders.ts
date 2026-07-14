import { useState, useEffect } from 'react'
import { Order } from '../types'
import { orderService } from '../services/orderService'

export const useOrders = (userId?: string, isAdmin = false) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  useEffect(() => {
    if (userId || isAdmin) {
      fetchOrders()
    }
  }, [userId, isAdmin])

  const fetchOrders = async (page = 1) => {
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

      setLoading(true)
      
      // 使用Java接口获取订单数据
      if (!isAdmin && userId) {
        console.log('📞 调用 getUserOrders API...')
        // 普通用户获取自己的订单
        const ordersData = await orderService.getUserOrders(userId, page, pageSize)
        console.log('✅ getUserOrders API 响应:', ordersData)
        
        // 设置分页信息
        setTotalCount(ordersData.total || 0)
        setTotalPages(ordersData.pages || 1)
        setCurrentPage(page)
        console.log('📊 分页信息 - total:', ordersData.total, 'pages:', ordersData.pages)
        
        // 转换订单数据格式以匹配前端期望的格式
        const transformedOrders = (ordersData.records || []).map((order: any) => {
          console.log('🔍 原始订单数据:', order)
          console.log('🔍 原始shippingAddress:', order.shippingAddress)
          console.log('🔍 原始shipping_address:', order.shipping_address)
          
          const transformed = {
            ...order,
            // 🔧 修复：使用后端返回的商品信息，包含商品名称和数量
            items: order.items || [],
            // 确保日期格式正确
            created_at: order.createdAt || order.created_at,
            updated_at: order.updatedAt || order.updated_at,
            // 转换字段名以匹配前端期望
            user_id: order.userId || order.user_id,
            // 🔧 修复：确保 shipping_address 正确映射
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
          console.log('🔄 转换后的shipping_address:', transformed.shipping_address)
          
          return transformed
        })
        
        console.log('🔄 转换后的订单数据:', transformedOrders)
        setOrders(transformedOrders)
      } else if (isAdmin) {
        console.log('📞 调用 getAllOrders API (管理员模式)...')
        // 管理员模式 - 获取所有订单
        const ordersData = await orderService.getAllOrders(page, pageSize)
        
        // 设置分页信息
        setTotalCount(ordersData.total || 0)
        setTotalPages(ordersData.pages || 1)
        setCurrentPage(page)
        
        // 转换订单数据格式以匹配前端期望的格式
        const transformedOrders = (ordersData.records || []).map((order: any) => {
          console.log('🔍 [管理员] 原始订单数据:', order)
          console.log('🔍 [管理员] 原始shippingAddress:', order.shippingAddress)
          console.log('🔍 [管理员] 原始shipping_address:', order.shipping_address)
          
          const transformed = {
            ...order,
            // 🔧 修复：使用后端返回的商品信息（管理员模式）
            items: order.items || [],
            // 确保日期格式正确
            created_at: order.createdAt || order.created_at,
            updated_at: order.updatedAt || order.updated_at,
            // 转换字段名以匹配前端期望
            user_id: order.userId || order.user_id,
            // 🔧 修复：确保 shipping_address 正确映射（管理员模式）
            shipping_address: order.shippingAddress || order.shipping_address || null,
            payment_method: order.paymentMethod || order.payment_method,
            applied_coupon: order.appliedCoupon || order.applied_coupon,
            coupon_discount: order.couponDiscount || order.coupon_discount || 0,
            points_discount: order.pointsDiscount || order.points_discount || 0,
            shipping_fee: order.shippingFee || order.shipping_fee || 0,
            points_used: order.pointsUsed || order.points_used,
            shipping_method: order.shippingMethod || order.shipping_method
          }
          
          console.log('🔄 [管理员] 转换后的订单数据:', transformed)
          console.log('🔄 [管理员] 转换后的shipping_address:', transformed.shipping_address)
          
          return transformed
        })
        
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
      console.log('=== fetchOrders 结束 ===')
    }
  }

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      console.log('=== 开始更新订单状态 ===')
      console.log('订单ID:', orderId)
      console.log('新状态:', status)
      console.log('用户ID:', userId)
      console.log('是否管理员:', isAdmin)
      
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
      
      console.log('本地状态已更新')
      
      // 然后重新获取数据确保同步
      await fetchOrders(currentPage)
      console.log('数据重新获取完成')
      
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      console.log('=== 开始删除订单流程 ===')
      console.log('订单ID:', orderId)
      console.log('用户ID:', userId)
      
      // TODO: Java后端暂未提供删除订单接口
      // 暂时通过更新状态为cancelled来实现"删除"效果
      await updateOrderStatus(orderId, 'cancelled')
      
      console.log('=== 订单已取消（模拟删除） ===')
      
    } catch (error) {
      console.error('=== 删除订单过程中出错 ===')
      console.error('错误详情:', error)
      throw error
    }
  }

  return { 
    orders, 
    loading, 
    currentPage,
    totalPages,
    totalCount,
    updateOrderStatus, 
    deleteOrder,
    refetch: fetchOrders,
    goToPage: fetchOrders
  }
}
