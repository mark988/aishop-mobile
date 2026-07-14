import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface CouponTemplate {
  id: string
  code: string
  title: string
  description: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  min_order_amount: number
  max_discount_amount?: number
  total_quantity: number
  used_quantity: number
  expires_at: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserCoupon {
  id: string
  user_id: string
  template_id: string
  code: string
  title: string
  description: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  min_order_amount: number
  max_discount_amount?: number
  status: 'available' | 'used' | 'expired'
  used_at?: string
  expires_at: string
  order_id?: string
  created_at: string
  updated_at: string
}

export interface CouponDistribution {
  id: string
  template_id: string
  distributed_by: string
  distribution_type: 'all_users' | 'specific_users' | 'new_users'
  target_users: string[]
  distributed_count: number
  created_at: string
}

class CouponService {
  // 创建优惠券模板
  async createCouponTemplate(template: Omit<CouponTemplate, 'id' | 'used_quantity' | 'created_by' | 'created_at' | 'updated_at'>): Promise<CouponTemplate> {
    const { data, error } = await supabase
      .from('coupon_templates')
      .insert([{
        ...template,
        used_quantity: 0
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating coupon template:', error)
      throw new Error('创建优惠券模板失败')
    }

    return data
  }

  // 获取所有优惠券模板
  async getCouponTemplates(): Promise<CouponTemplate[]> {
    const { data, error } = await supabase
      .from('coupon_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching coupon templates:', error)
      throw new Error('获取优惠券模板失败')
    }

    return data || []
  }

  // 更新优惠券模板
  async updateCouponTemplate(id: string, updates: Partial<CouponTemplate>): Promise<CouponTemplate> {
    const { data, error } = await supabase
      .from('coupon_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating coupon template:', error)
      throw new Error('更新优惠券模板失败')
    }

    return data
  }

  // 删除优惠券模板
  async deleteCouponTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('coupon_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting coupon template:', error)
      throw new Error('删除优惠券模板失败')
    }
  }

  // 发放优惠券给用户
  async distributeCoupons(
    templateId: string,
    distributionType: 'all_users' | 'specific_users' | 'new_users',
    targetUsers: string[] = []
  ): Promise<{ success: boolean; distributedCount: number }> {
    try {
      // 获取优惠券模板
      const { data: template, error: templateError } = await supabase
        .from('coupon_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        throw new Error('优惠券模板不存在')
      }

      // 检查是否还有可发放的数量
      const remainingQuantity = template.total_quantity - template.used_quantity
      if (remainingQuantity <= 0) {
        throw new Error('优惠券已发放完毕')
      }

      let usersToDistribute: string[] = []

      // 根据发放类型获取目标用户
      if (distributionType === 'all_users') {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'customer')

        if (usersError) {
          throw new Error('获取用户列表失败')
        }

        usersToDistribute = users?.map(u => u.id) || []
      } else if (distributionType === 'specific_users') {
        usersToDistribute = targetUsers
      } else if (distributionType === 'new_users') {
        // 获取最近注册的用户（比如最近30天）
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'customer')
          .gte('created_at', thirtyDaysAgo.toISOString())

        if (usersError) {
          throw new Error('获取新用户列表失败')
        }

        usersToDistribute = users?.map(u => u.id) || []
      }

      // 限制发放数量
      const actualDistributeCount = Math.min(usersToDistribute.length, remainingQuantity)
      const finalUsersToDistribute = usersToDistribute.slice(0, actualDistributeCount)

      // 批量创建用户优惠券
      const userCoupons = finalUsersToDistribute.map(userId => ({
        user_id: userId,
        template_id: templateId,
        code: template.code,
        title: template.title,
        description: template.description,
        type: template.type,
        value: template.value,
        min_order_amount: template.min_order_amount,
        max_discount_amount: template.max_discount_amount,
        expires_at: template.expires_at,
        status: 'available' as const
      }))

      const { error: insertError } = await supabase
        .from('user_coupons')
        .insert(userCoupons)

      if (insertError) {
        console.error('Error inserting user coupons:', insertError)
        throw new Error('发放优惠券失败')
      }

      // 更新模板的已使用数量
      await this.updateCouponTemplate(templateId, {
        used_quantity: template.used_quantity + actualDistributeCount
      })

      // 记录发放记录
      await supabase
        .from('coupon_distributions')
        .insert([{
          template_id: templateId,
          distribution_type: distributionType,
          target_users: finalUsersToDistribute,
          distributed_count: actualDistributeCount
        }])

      // 发送通知给用户
      await this.sendCouponNotifications(finalUsersToDistribute, template)

      return {
        success: true,
        distributedCount: actualDistributeCount
      }
    } catch (error) {
      console.error('Error distributing coupons:', error)
      throw error
    }
  }

  // 发送优惠券通知
  private async sendCouponNotifications(userIds: string[], template: CouponTemplate): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'success' as const,
        title: '您收到了新的优惠券！',
        message: `恭喜您获得"${template.title}"优惠券，快去使用吧！`,
        is_read: false
      }))

      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) {
        console.error('Error sending coupon notifications:', error)
      }
    } catch (error) {
      console.error('Error in sendCouponNotifications:', error)
    }
  }

  // 获取用户的优惠券
  async getUserCoupons(userId: string): Promise<UserCoupon[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user coupons:', error)
      throw new Error('获取用户优惠券失败')
    }

    return data || []
  }

  // 获取所有用户优惠券（管理员用）
  async getAllUserCoupons(): Promise<(UserCoupon & { user_email?: string })[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select(`
        *,
        profiles!user_coupons_user_id_fkey(email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all user coupons:', error)
      throw new Error('获取所有用户优惠券失败')
    }

    return data?.map(item => ({
      ...item,
      user_email: item.profiles?.email
    })) || []
  }

  // 使用优惠券
  async useCoupon(couponId: string, orderId: string): Promise<void> {
    const { error } = await supabase
      .from('user_coupons')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        order_id: orderId
      })
      .eq('id', couponId)

    if (error) {
      console.error('Error using coupon:', error)
      throw new Error('使用优惠券失败')
    }
  }

  // 获取优惠券统计信息
  async getCouponStats(): Promise<{
    totalTemplates: number
    activeTemplates: number
    totalDistributed: number
    totalUsed: number
  }> {
    try {
      // 获取模板统计
      const { data: templates, error: templatesError } = await supabase
        .from('coupon_templates')
        .select('id, is_active, used_quantity')

      if (templatesError) {
        throw new Error('获取模板统计失败')
      }

      // 获取用户优惠券统计
      const { data: userCoupons, error: userCouponsError } = await supabase
        .from('user_coupons')
        .select('status')

      if (userCouponsError) {
        throw new Error('获取用户优惠券统计失败')
      }

      const totalTemplates = templates?.length || 0
      const activeTemplates = templates?.filter(t => t.is_active).length || 0
      const totalDistributed = userCoupons?.length || 0
      const totalUsed = userCoupons?.filter(c => c.status === 'used').length || 0

      return {
        totalTemplates,
        activeTemplates,
        totalDistributed,
        totalUsed
      }
    } catch (error) {
      console.error('Error getting coupon stats:', error)
      throw error
    }
  }
}

export const couponService = new CouponService()