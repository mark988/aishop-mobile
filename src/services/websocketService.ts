import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Notification } from '../types';

const WS_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export type NotificationCallback = (notification: Notification) => void;

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private notificationCallbacks: NotificationCallback[] = [];
  private userId: string | null = null;

  constructor() {
    this.client = new Client({
      // 使用SockJS作为WebSocket的fallback
      webSocketFactory: () => new SockJS(`${WS_BASE_URL}/ws`),
      
      // 连接头信息
      connectHeaders: {},
      
      // 调试信息
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      
      // 重连配置
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // 连接成功回调
    this.client.onConnect = (frame) => {
      console.log('WebSocket connected:', frame);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (this.userId) {
        this.subscribeToUserNotifications(this.userId);
      }
      
      // 发送连接消息
      this.client?.publish({
        destination: '/app/connect',
        body: JSON.stringify({ message: 'Client connected' })
      });
    };

    // 连接错误回调
    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame);
      this.isConnected = false;
      this.handleReconnect();
    };

    // WebSocket错误回调
    this.client.onWebSocketError = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
      this.handleReconnect();
    };

    // 断开连接回调
    this.client.onDisconnect = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
    };
  }

  /**
   * 连接WebSocket
   */
  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.userId === userId) {
        resolve();
        return;
      }

      this.userId = userId;
      
      // 设置认证头
      const authToken = localStorage.getItem('auth_token');
      this.client!.connectHeaders = {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'userId': userId,
        'X-Requested-With': 'WebSocket'
      };

      // 设置连接成功回调
      const originalOnConnect = this.client!.onConnect;
      this.client!.onConnect = (frame) => {
        originalOnConnect(frame);
        resolve();
      };

      // 设置连接错误回调
      const originalOnError = this.client!.onStompError;
      this.client!.onStompError = (frame) => {
        originalOnError(frame);
        reject(new Error('WebSocket connection failed'));
      };

      try {
        this.client!.activate();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client || !this.isConnected) {
        resolve();
        return;
      }

      // 发送断开连接消息
      this.client.publish({
        destination: '/app/disconnect',
        body: JSON.stringify({ message: 'Client disconnecting' })
      });

      this.client.onDisconnect = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.userId = null;
        resolve();
      };

      this.client.deactivate();
    });
  }

  /**
   * 订阅用户通知
   */
  private subscribeToUserNotifications(userId: string) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    // 订阅个人通知队列
    this.client.subscribe(`/user/queue/notifications`, (message) => {
      try {
        // 检查消息体是否为空或无效
        if (!message.body || typeof message.body !== 'string') {
          console.warn('Received empty or invalid message body:', message.body);
          return;
        }

        // 检查是否是有效的JSON格式
        if (!message.body.trim().startsWith('{') && !message.body.trim().startsWith('[')) {
          console.warn('Received non-JSON message:', message.body);
          return;
        }

        const notification: Notification = JSON.parse(message.body);
        console.log('Received notification:', notification);
        
        // 验证通知对象的基本结构
        if (!notification || typeof notification !== 'object') {
          console.warn('Invalid notification object:', notification);
          return;
        }
        
        // 调用所有注册的回调函数
        this.notificationCallbacks.forEach(callback => {
          try {
            callback(notification);
          } catch (error) {
            console.error('Error in notification callback:', error);
          }
        });
        
        // 显示浏览器通知
        this.showBrowserNotification(notification);
        
      } catch (error) {
        console.error('Error parsing notification:', error);
        console.error('Message body was:', message.body);
      }
    });

    // 订阅系统广播通知
    this.client.subscribe('/topic/notifications', (message) => {
      try {
        // 检查消息体是否为空或无效
        if (!message.body || typeof message.body !== 'string') {
          console.warn('Received empty or invalid broadcast message body:', message.body);
          return;
        }

        // 检查是否是有效的JSON格式
        if (!message.body.trim().startsWith('{') && !message.body.trim().startsWith('[')) {
          console.warn('Received non-JSON broadcast message:', message.body);
          return;
        }

        const notification: Notification = JSON.parse(message.body);
        console.log('Received broadcast notification:', notification);
        
        // 验证通知对象的基本结构
        if (!notification || typeof notification !== 'object') {
          console.warn('Invalid broadcast notification object:', notification);
          return;
        }
        
        // 调用所有注册的回调函数
        this.notificationCallbacks.forEach(callback => {
          try {
            callback(notification);
          } catch (error) {
            console.error('Error in notification callback:', error);
          }
        });
        
        // 显示浏览器通知
        this.showBrowserNotification(notification);
        
      } catch (error) {
        console.error('Error parsing broadcast notification:', error);
      }
    });

    console.log(`Subscribed to notifications for user: ${userId}`);
  }

  /**
   * 显示浏览器通知
   */
  private showBrowserNotification(notification: Notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false
      });
    }
  }

  /**
   * 添加通知回调函数
   */
  addNotificationCallback(callback: NotificationCallback) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * 移除通知回调函数
   */
  removeNotificationCallback(callback: NotificationCallback) {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId && !this.isConnected) {
        this.connect(this.userId).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 请求浏览器通知权限
   */
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

// 创建单例实例
export const websocketService = new WebSocketService();
export default websocketService;