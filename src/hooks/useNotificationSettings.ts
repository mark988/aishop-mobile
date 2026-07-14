import { useState, useEffect } from 'react';
import { NotificationSettings } from '../types';
import { getStoredToken } from '../lib/auth';
import toast from 'react-hot-toast';

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api';

export const useNotificationSettings = (userId: string) => {
  const [settings, setSettings] = useState<Partial<NotificationSettings>>({
    order_updates: true,
    promotional_emails: false,
    product_recommendations: true,
    price_alerts: false,
    stock_alerts: true,
    newsletter: false,
    sms_notifications: false,
    push_notifications: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取请求头
  const getHeaders = () => {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  // 加载通知设置
  const loadSettings = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/notification-settings/user/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // 用户没有通知设置记录，使用默认设置
          console.log('用户尚未配置通知设置，使用默认设置');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json();
      
      if (result.code === 200) {
        const settingsData = result.data;
        
        if (settingsData) {
          // 转换后端字段名为前端期望的格式
          const transformedSettings = {
            order_updates: settingsData.orderUpdates ?? true,
            promotional_emails: settingsData.promotionalEmails ?? false,
            product_recommendations: settingsData.productRecommendations ?? true,
            price_alerts: settingsData.priceAlerts ?? false,
            stock_alerts: settingsData.stockAlerts ?? true,
            newsletter: settingsData.newsletter ?? false,
            sms_notifications: settingsData.smsNotifications ?? false,
            push_notifications: settingsData.pushNotifications ?? true,
          };
          setSettings(transformedSettings);
        }
      } else {
        throw new Error(result.message || '获取通知设置失败')
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      setError(error.message);
      // 使用默认设置，不显示错误提示
      console.warn('使用默认通知设置');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存通知设置
  const saveSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!userId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/notification-settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          userId: userId,
          ...newSettings
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json();
      
      if (result.code === 200) {
        setSettings(newSettings);
        toast.success('通知设置已保存');
        return true;
      } else {
        throw new Error(result.message || '保存通知设置失败')
      }
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      setError('保存设置失败');
      toast.error('保存设置失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 更新单个设置
  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    
    const success = await saveSettings(newSettings);
    return success;
  };

  // 重置为默认设置
  const resetToDefaults = () => {
    const defaultSettings = {
      order_updates: true,
      promotional_emails: false,
      product_recommendations: true,
      price_alerts: false,
      stock_alerts: true,
      newsletter: false,
      sms_notifications: false,
      push_notifications: true,
    };
    
    setSettings(defaultSettings);
    return defaultSettings;
  };

  // 获取特定设置的状态
  const getSetting = (key: keyof NotificationSettings): boolean => {
    return settings[key] as boolean ?? false;
  };

  // 检查是否启用了某个设置
  const isEnabled = (key: keyof NotificationSettings): boolean => {
    return settings[key] as boolean ?? false;
  };

  // 获取通知级别评分 (0-100)
  const getNotificationScore = (): number => {
    const notificationWeights = {
      order_updates: 20,
      promotional_emails: 10,
      product_recommendations: 15,
      price_alerts: 10,
      stock_alerts: 15,
      newsletter: 5,
      sms_notifications: 15,
      push_notifications: 10
    };

    let score = 0;
    Object.entries(notificationWeights).forEach(([key, weight]) => {
      if (settings[key as keyof NotificationSettings]) {
        score += weight;
      }
    });

    return score;
  };

  // 获取通知级别描述
  const getNotificationLevel = (): { level: string; color: string; description: string } => {
    const score = getNotificationScore();
    
    if (score >= 80) {
      return {
        level: '完全通知',
        color: 'text-blue-600',
        description: '您将接收所有类型的通知'
      };
    } else if (score >= 50) {
      return {
        level: '标准通知',
        color: 'text-green-600',
        description: '您将接收重要通知'
      };
    } else if (score >= 20) {
      return {
        level: '最少通知',
        color: 'text-yellow-600',
        description: '您只接收必要通知'
      };
    } else {
      return {
        level: '静音模式',
        color: 'text-gray-600',
        description: '您几乎不会收到通知'
      };
    }
  };

  // 获取推荐的通知设置
  const getRecommendedSettings = () => {
    return {
      order_updates: true,
      promotional_emails: false,
      product_recommendations: true,
      price_alerts: false,
      stock_alerts: true,
      newsletter: false,
      sms_notifications: false,
      push_notifications: true,
    };
  };

  useEffect(() => {
    if (userId) {
      loadSettings();
    }
  }, [userId]);

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    saveSettings,
    updateSetting,
    resetToDefaults,
    getSetting,
    isEnabled,
    getNotificationScore,
    getNotificationLevel,
    getRecommendedSettings,
    setSettings
  };
};