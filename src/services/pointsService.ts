import { supabase } from '../lib/supabase'

export interface PointsConfig {
  ratio: number // points per yuan (e.g., 10 points per 100 yuan)
  min_order_amount: number
}

export interface UserPoints {
  id: string
  user_id: string
  points: number
  total_earned: number
  created_at: string
  updated_at: string
}

export interface PointsHistory {
  id: string
  user_id: string
  order_id?: string
  points: number
  type: 'earned' | 'spent' | 'expired'
  description: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
  read_at?: string
}

class PointsService {
  // Get points configuration from database (using new system config service)
  async getPointsConfig(): Promise<PointsConfig> {
    const { systemConfigService } = await import('./systemConfigService')
    const config = await systemConfigService.getPointsConfig()
    
    // Convert to old interface format for backward compatibility
    return {
      ratio: config.points_reward_ratio,
      min_order_amount: config.points_per_order_amount
    }
  }

  // Calculate points earned from order amount
  async calculatePointsEarned(orderAmount: number): Promise<number> {
    const { calculatePointsForOrder } = await import('../utils/configUtils')
    const calculation = await calculatePointsForOrder(orderAmount)
    return calculation.pointsEarned
  }

  // Award points to user after successful order
  async awardPoints(userId: string, orderId: string, orderAmount: number): Promise<void> {
    const pointsEarned = await this.calculatePointsEarned(orderAmount)
    
    if (pointsEarned <= 0) {
      return
    }

    try {
      // Start a transaction-like operation
      
      // 1. Get or create user points record
      let { data: userPoints, error: fetchError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError
      }

      if (!userPoints) {
        // Create new user points record
        const { data: newUserPoints, error: createError } = await supabase
          .from('user_points')
          .insert([{
            user_id: userId,
            points: pointsEarned,
            total_earned: pointsEarned
          }])
          .select()
          .single()

        if (createError) throw createError
        userPoints = newUserPoints
      } else {
        // Update existing user points
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            points: userPoints.points + pointsEarned,
            total_earned: userPoints.total_earned + pointsEarned,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) throw updateError
      }

      // 2. Add points history record
      const { error: historyError } = await supabase
        .from('points_history')
        .insert([{
          user_id: userId,
          order_id: orderId,
          points: pointsEarned,
          type: 'earned',
          description: `订单完成获得积分：订单金额 ¥${orderAmount}, 获得 ${pointsEarned} 积分`
        }])

      if (historyError) throw historyError

      // 3. Create notification - This will trigger real-time updates
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title: '积分奖励',
          message: `恭喜！您的订单已完成，获得 ${pointsEarned} 积分奖励。订单金额：¥${orderAmount}`,
          type: 'success'
        }])

      if (notificationError) throw notificationError

    } catch (error) {
      console.error('Error awarding points:', error)
      throw error
    }
  }

  // Get user points balance
  async getUserPoints(userId: string): Promise<UserPoints | null> {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user points:', error)
      return null
    }

    return data || null
  }

  // Get user points history
  async getPointsHistory(userId: string, limit: number = 50): Promise<PointsHistory[]> {
    const { data, error } = await supabase
      .from('points_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching points history:', error)
      return []
    }

    return data || []
  }

  // Create notification
  async createNotification(userId: string, notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at' | 'read_at'>): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        ...notification
      }])

    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Get user notifications (limited to 50 most recent)
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50) // 限制为最新的50条通知

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  // Get unread notification count
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching unread notification count:', error)
      return 0
    }

    return count || 0
  }
}

export const pointsService = new PointsService()