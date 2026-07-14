import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { Notification } from '../types'
import toast from 'react-hot-toast'
import websocketService from '../services/websocketService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  addNotification: (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at'>) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read && !n.isRead).length

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('未登录')
      }

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { 
            ...n, 
            is_read: true, 
            isRead: true, // 同时更新两个字段
            read_at: new Date().toISOString() 
          } : n)
        )
      } else {
        throw new Error(result.message || 'Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('标记已读失败')
    }
  }

  const markAllAsRead = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token || !user?.id) {
        throw new Error('未登录')
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/notifications/user/${user.id}/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权，请重新登录')
        } else if (response.status === 404) {
          throw new Error('接口不存在')
        } else if (response.status === 500) {
          throw new Error('服务器内部错误')
        } else {
          throw new Error(`请求失败: HTTP ${response.status}`)
        }
      }

      const result = await response.json()
      console.log('Mark all as read API response:', result) // Debug logging
      
      if (result.code === 200) {
        // Update local state - mark all unread notifications as read
        setNotifications(prev =>
          prev.map(n => (n.is_read && n.isRead) ? n : { 
            ...n, 
            is_read: true, 
            isRead: true, // 同时更新两个字段
            read_at: new Date().toISOString() 
          })
        )
        toast.success('所有消息已标记为已读')
      } else {
        console.error('API returned error:', result) // Debug logging
        // If no unread notifications, still show success
        if (result.message && result.message.includes('没有未读通知')) {
          toast.success('所有消息已是已读状态')
          return
        }
        throw new Error(result.message || '标记失败')
      }

    } catch (error: any) {
      console.error('Error marking all notifications as read:', error)
      
      // Specific error handling with fallback
      if (error.name === 'AbortError') {
        toast.error('请求超时，已在本地标记为已读')
        // Fallback: Mark as read locally
        setNotifications(prev =>
          prev.map(n => n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() })
        )
      } else if (error.message === '未登录' || error.message === '未授权，请重新登录') {
        toast.error(error.message)
      } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        toast.error('网络连接失败，已在本地标记为已读')
        // Fallback: Mark as read locally if server is unreachable
        setNotifications(prev =>
          prev.map(n => n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() })
        )
      } else {
        toast.error(`批量标记失败: ${error.message}`)
      }
    }
  }

  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('未登录')
      }

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status}`)
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('消息已删除')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('删除消息失败')
    }
  }

  const addNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at'>): Promise<void> => {
    // This is for local testing - in production, notifications should be created by backend
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      user_id: user?.id || '',
      is_read: false,
      created_at: new Date().toISOString()
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const refreshNotifications = async (): Promise<void> => {
    if (!user?.id) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No auth token found, cannot fetch notifications')
        return
      }

      console.log('🔄 刷新通知列表，用户ID:', user.id)

      const response = await fetch(`${API_BASE_URL}/notifications/user/${user.id}?page=1&size=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      const result = await response.json()
      console.log('📥 通知API响应:', result)
      
      if (result.code === 200) {
        // Handle paginated response from Java backend
        const notificationData = result.data.records || result.data || []
        console.log('📊 通知数据统计:', {
          total: notificationData.length,
          unread: notificationData.filter(n => !n.isRead && !n.is_read).length
        })
        setNotifications(notificationData)
      } else {
        console.error('Failed to fetch notifications:', result.message)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      console.log('Notification system initialized - connecting to WebSocket')
      
      // 初始加载通知列表
      refreshNotifications()
      
      // 连接WebSocket
      const connectWebSocket = async () => {
        try {
          await websocketService.connect(user.id)
          console.log('WebSocket connected successfully')
          
          // 请求浏览器通知权限
          await websocketService.requestNotificationPermission()
          
        } catch (error) {
          console.error('Failed to connect WebSocket:', error)
          // WebSocket连接失败时，降级到轮询模式
          console.log('Falling back to polling mode')
          const interval = setInterval(() => {
            refreshNotifications()
          }, 30000)
          
          return () => clearInterval(interval)
        }
      }
      
      connectWebSocket()
      
      // 添加WebSocket通知回调
      const handleWebSocketNotification = (notification: Notification) => {
        console.log('Received WebSocket notification:', notification)
        
        // 过滤掉WebSocket连接提示消息，只在控制台显示日志
        if (notification.message?.includes('WebSocket连接已建立') || 
            notification.message?.includes('您将收到实时通知')) {
          console.log('📡 WebSocket连接已建立，您将收到实时通知')
          return // 不显示toast，不添加到通知列表
        }
        
        // 更新通知列表
        setNotifications(prev => [notification, ...prev])
        
        // 显示toast通知
        const getToastIcon = (type: string) => {
          switch (type) {
            case 'success': return '✅'
            case 'warning': return '⚠️'
            case 'error': return '❌'
            default: return '📢'
          }
        }
        
        toast(notification.message, {
          icon: getToastIcon(notification.type),
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }
        })
      }
      
      websocketService.addNotificationCallback(handleWebSocketNotification)
      
      // 清理函数
      return () => {
        websocketService.removeNotificationCallback(handleWebSocketNotification)
        websocketService.disconnect()
      }
    }
  }, [user?.id])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      addNotification,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}