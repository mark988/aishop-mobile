import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface BrandConfig {
  primaryName: string
  secondaryName: string
  logoIcon: string
  logoColorFrom: string
  logoColorTo: string
  logoType: 'icon' | 'custom'
  logoCustomUrl: string
}

const defaultBrandConfig: BrandConfig = {
  primaryName: '优选商城',
  secondaryName: 'Premium Mall',
  logoIcon: 'shopping-cart',
  logoColorFrom: '#3B82F6',
  logoColorTo: '#1D4ED8',
  logoType: 'icon',
  logoCustomUrl: ''
}

// 品牌配置缓存和防重复请求机制
let brandConfigCache: { config: BrandConfig; timestamp: number } | null = null
let pendingBrandConfigRequest: Promise<BrandConfig | null> | null = null
const BRAND_CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存

// 实际的API调用函数
const fetchBrandConfigAPI = async (): Promise<BrandConfig | null> => {
  console.log('🏢 fetchBrandConfigAPI: 从API获取品牌配置')
  
  try {
    const response = await fetch(`${API_BASE_URL}/system/config/brand`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Error fetching brand config, using defaults')
      return defaultBrandConfig
    }

    const result = await response.json()
    
    if (result.code === 200 && result.data) {
      const configData = result.data
      
      const newBrandConfig: BrandConfig = {
        primaryName: configData.primaryName || defaultBrandConfig.primaryName,
        secondaryName: configData.secondaryName || defaultBrandConfig.secondaryName,
        logoIcon: configData.logoIcon || defaultBrandConfig.logoIcon,
        logoColorFrom: configData.logoColorFrom || defaultBrandConfig.logoColorFrom,
        logoColorTo: configData.logoColorTo || defaultBrandConfig.logoColorTo,
        logoType: configData.logoType || defaultBrandConfig.logoType,
        logoCustomUrl: configData.logoCustomUrl || defaultBrandConfig.logoCustomUrl
      }

      console.log('✅ fetchBrandConfigAPI: 品牌配置获取成功')
      return newBrandConfig
    } else {
      console.error('API Error:', result.message)
      return defaultBrandConfig
    }
  } catch (err) {
    console.error('Failed to fetch brand config:', err)
    return defaultBrandConfig
  }
}

export const useBrandConfig = () => {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(defaultBrandConfig)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrandConfig = useCallback(async () => {
    try {
      // 检查缓存是否有效
      if (brandConfigCache && 
          Date.now() - brandConfigCache.timestamp < BRAND_CACHE_DURATION) {
        console.log('🎯 useBrandConfig: 使用缓存的品牌配置')
        setBrandConfig(brandConfigCache.config)
        setLoading(false)
        return
      }

      // 如果有正在进行的请求，等待该请求完成
      if (pendingBrandConfigRequest) {
        console.log('⏳ useBrandConfig: 等待正在进行的品牌配置请求')
        const config = await pendingBrandConfigRequest
        if (config) {
          setBrandConfig(config)
        }
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      // 创建新的请求
      pendingBrandConfigRequest = fetchBrandConfigAPI()
      
      try {
        const config = await pendingBrandConfigRequest
        
        if (config) {
          // 缓存结果
          brandConfigCache = {
            config,
            timestamp: Date.now()
          }
          
          setBrandConfig(config)
        }
      } finally {
        // 清除pending请求状态
        pendingBrandConfigRequest = null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load brand configuration'
      setError(errorMessage)
      setBrandConfig(defaultBrandConfig)
      pendingBrandConfigRequest = null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrandConfig()
  }, [fetchBrandConfig])

  const refreshConfig = useCallback(() => {
    // 清除缓存，强制重新获取
    brandConfigCache = null
    fetchBrandConfig()
  }, [fetchBrandConfig])

  return {
    brandConfig,
    loading,
    error,
    refreshConfig
  }
}