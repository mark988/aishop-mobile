import { useState, useEffect } from 'react'
import { notificationService, Notification as BackendNotification } from '../services/notificationService'
import toast from 'react-hot-toast'

export interface Notification {
  id: string
  user_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  is_read: boolean
  created_at: string
  read_at?: string
}

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return

      try {
        setLoading(true)
        const backendNotifications = await notificationService.getUserNotifications(userId, 1, 50)
        const unreadCount = await notificationService.getUnreadNotificationCount(userId)

        // Convert backend format to frontend format
        const formattedNotifications = backendNotifications.map((n: BackendNotification) => ({
          id: n.id,
          user_id: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          is_read: n.isRead,
          created_at: n.createdAt,
          read_at: n.readAt
        }))

        setNotifications(formattedNotifications)
        setUnreadCount(unreadCount)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('标记已读失败')
    }
  }

  const markAllAsRead = async () => {
    try {
      if (!userId) {
        toast.error('用户未登录')
        return
      }

      await notificationService.markAllAsRead(userId)

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)

      toast.success('所有消息已标记为已读')

    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('批量标记已读失败')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)

      // Update local state
      const notification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      toast.success('消息已删除')

    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('删除消息失败')
    }
  }

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission
  }
}