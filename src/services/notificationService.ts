import { getStoredToken } from '../lib/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  readAt?: string
}

class NotificationService {
  private getHeaders() {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, page: number = 1, size: number = 50): Promise<Notification[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}?page=${page}&size=${size}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.code === 200 && result.data) {
        // Handle pagination response
        const records = result.data.records || []
        return records.map((item: any) => this.mapToNotification(item))
      }

      return []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}/unread-count`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.code === 200 && result.data !== null) {
        return result.data
      }

      return 0
    } catch (error) {
      console.error('Error fetching unread notification count:', error)
      return 0
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}/read-all`,
        {
          method: 'PUT',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  /**
   * Map backend notification format to frontend format
   */
  private mapToNotification(backendNotification: any): Notification {
    return {
      id: backendNotification.id,
      userId: backendNotification.userId,
      type: backendNotification.type || 'info',
      title: backendNotification.title,
      message: backendNotification.message,
      isRead: backendNotification.isRead || false,
      createdAt: backendNotification.createdAt,
      readAt: backendNotification.readAt
    }
  }
}

export const notificationService = new NotificationService()
