import { useState, useEffect } from 'react';
import { PrivacySettings } from '../types';
import { getStoredToken } from '../lib/auth';
import toast from 'react-hot-toast';

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api';

export const usePrivacySettings = (userId: string) => {
  const [settings, setSettings] = useState<Partial<PrivacySettings>>({
    profile_visibility: 'public',
    show_email: false,
    show_phone: false,
    show_address: false,
    show_purchase_history: false,
    show_favorites: true,
    show_reviews: true,
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

  // 加载隐私设置
  const loadSettings = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/privacy-settings/user/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // 用户没有隐私设置记录，使用默认设置
          console.log('用户尚未配置隐私设置，使用默认设置');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json();
      
      if (result.code === 200) {
        const settingsData = result.data;
        
        if (settingsData) {
          // 更新设置状态
          setSettings(prevSettings => ({
            ...prevSettings,
            ...settingsData
          }));
        }
      } else {
        throw new Error(result.message || '获取隐私设置失败')
      }
    } catch (error: any) {
      console.error('Error loading privacy settings:', error);
      setError(error.message);
      // 使用默认设置，不显示错误提示
      console.warn('使用默认隐私设置');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存隐私设置
  const saveSettings = async (newSettings: Partial<PrivacySettings>) => {
    if (!userId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/privacy-settings`, {
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
        toast.success('隐私设置已保存');
        return true;
      } else {
        throw new Error(result.message || '保存隐私设置失败')
      }
    } catch (error: any) {
      console.error('Error saving privacy settings:', error);
      setError('保存设置失败');
      toast.error('保存设置失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 更新单个设置
  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
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
      profile_visibility: 'public' as const,
      show_email: false,
      show_phone: false,
      show_address: false,
      show_purchase_history: false,
      show_favorites: true,
      show_reviews: true,
    };
    
    setSettings(defaultSettings);
    return defaultSettings;
  };

  // 获取特定设置的状态
  const getSetting = (key: keyof PrivacySettings): any => {
    return settings[key];
  };

  // 检查是否启用了某个设置
  const isEnabled = (key: keyof PrivacySettings): boolean => {
    return settings[key] as boolean ?? false;
  };

  // 获取隐私级别评分 (0-100)
  const getPrivacyScore = (): number => {
    const privacyWeights = {
      profile_visibility: { private: 40, friends: 20, public: 0 },
      show_email: { false: 15, true: 0 },
      show_phone: { false: 15, true: 0 },
      show_address: { false: 20, true: 0 },
      show_purchase_history: { false: 5, true: 0 },
      show_favorites: { false: 3, true: 0 },
      show_reviews: { false: 2, true: 0 }
    };

    let score = 0;
    Object.entries(privacyWeights).forEach(([key, weights]) => {
      const value = settings[key as keyof PrivacySettings];
      if (value !== undefined) {
        score += weights[value as keyof typeof weights] || 0;
      }
    });

    return score;
  };

  // 获取隐私级别描述
  const getPrivacyLevel = (): { level: string; color: string; description: string } => {
    const score = getPrivacyScore();
    
    if (score >= 80) {
      return {
        level: '高度隐私',
        color: 'text-green-600',
        description: '您的隐私保护级别很高'
      };
    } else if (score >= 50) {
      return {
        level: '中等隐私',
        color: 'text-yellow-600',
        description: '您的隐私保护级别适中'
      };
    } else if (score >= 20) {
      return {
        level: '基础隐私',
        color: 'text-orange-600',
        description: '建议提高隐私保护级别'
      };
    } else {
      return {
        level: '低隐私',
        color: 'text-red-600',
        description: '建议加强隐私保护设置'
      };
    }
  };

  // 检查是否有敏感信息公开
  const hasSensitiveDataExposed = (): boolean => {
    return !!(
      settings.show_email ||
      settings.show_phone ||
      settings.show_address
    );
  };

  // 获取推荐的隐私设置
  const getRecommendedSettings = () => {
    return {
      profile_visibility: 'friends' as const,
      show_email: false,
      show_phone: false,
      show_address: false,
      show_purchase_history: false,
      show_favorites: true,
      show_reviews: true,
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
    getPrivacyScore,
    getPrivacyLevel,
    hasSensitiveDataExposed,
    getRecommendedSettings,
    setSettings
  };
};