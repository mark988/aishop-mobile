import { getStoredToken } from '../lib/auth'

// Java 后端 API 基础 URL
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface PointsConfig {
  points_per_order_amount: number  // Minimum order amount to earn points
  points_reward_ratio: number      // Points earned per currency unit
  points_enabled: boolean          // Global points system toggle
}

export interface PointsToMoneyConfig {
  points: number    // 积分数量
  money: number     // 对应的现金金额
}

export interface CurrencyConfig {
  code: string  // 'CNY' | 'USD' | 'MMK'
  symbol: string  // '¥' | '$' | 'Ks'
  name: string  // '人民币' | '美元' | '缅币'
}

export interface SystemConfigCache {
  [key: string]: {
    value: any
    timestamp: number
    ttl: number
  }
}

class SystemConfigService {
  private cache: SystemConfigCache = {}
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Default configuration values (fallback only)
  private readonly DEFAULT_POINTS_CONFIG: PointsConfig = {
    points_per_order_amount: 1000,   // 默认最低消费1000元
    points_reward_ratio: 1,          // 默认获得1积分
    points_enabled: true
  }

  private readonly DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
    code: 'CNY',
    symbol: '¥',
    name: '人民币'
  }

  // 获取请求头
  private getHeaders() {
    const token = getStoredToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  /**
   * Get a configuration value by key with caching
   */
  async getConfigValue<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    const cached = this.cache[key]
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value as T
    }

    try {
      const response = await fetch(`${API_BASE_URL}/system/config/${key}`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.warn(`Failed to fetch config for key "${key}": HTTP ${response.status}`)
        return defaultValue as T
      }

      const result = await response.json()
      let value = defaultValue as T

      if (result.code === 200 && result.data !== null) {
        value = result.data as T
      }

      // Cache the value
      this.cache[key] = {
        value,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      }

      return value
    } catch (error) {
      console.error(`Error fetching config for key "${key}":`, error)
      return defaultValue as T
    }
  }

  /**
   * Get points configuration with fallback to defaults
   * Supports multiple data formats for backward compatibility
   */
  async getPointsConfig(): Promise<PointsConfig> {
    try {
      // Method 1: Try to get individual config values from separate keys
      const [pointsPerOrderAmount, pointsRewardRatio, pointsEnabled] = await Promise.all([
        this.getConfigValue<number>('points_per_order_amount', null),
        this.getConfigValue<number>('points_reward_ratio', null),
        this.getConfigValue<boolean>('points_enabled', this.DEFAULT_POINTS_CONFIG.points_enabled)
      ])

      // If individual keys exist, use them
      if (pointsPerOrderAmount !== null && pointsRewardRatio !== null) {
        return {
          points_per_order_amount: typeof pointsPerOrderAmount === 'number' && pointsPerOrderAmount > 0
            ? pointsPerOrderAmount
            : this.DEFAULT_POINTS_CONFIG.points_per_order_amount,
          points_reward_ratio: typeof pointsRewardRatio === 'number' && pointsRewardRatio > 0
            ? pointsRewardRatio
            : this.DEFAULT_POINTS_CONFIG.points_reward_ratio,
          points_enabled: Boolean(pointsEnabled)
        }
      }

      // Method 2: Legacy support removed since we now use separate keys

      // Method 3: Use defaults
      console.log('No points configuration found, using defaults')
      return this.DEFAULT_POINTS_CONFIG

    } catch (error) {
      console.error('Error fetching points configuration, using defaults:', error)
      return this.DEFAULT_POINTS_CONFIG
    }
  }

  /**
   * Refresh cache by clearing all cached values
   */
  refreshCache(): void {
    this.cache = {}
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key: string): void {
    delete this.cache[key]
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { [key: string]: { age: number; ttl: number; expired: boolean } } {
    const status: { [key: string]: { age: number; ttl: number; expired: boolean } } = {}

    for (const [key, cached] of Object.entries(this.cache)) {
      const age = Date.now() - cached.timestamp
      status[key] = {
        age,
        ttl: cached.ttl,
        expired: age >= cached.ttl
      }
    }

    return status
  }

  /**
   * Get points to money exchange rate configuration
   */
  async getPointsToMoneyConfig(): Promise<PointsToMoneyConfig> {
    try {
      // 直接调用专门的积分兑换配置接口
      const response = await fetch(`${API_BASE_URL}/system/config/points/exchange-rate`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        const config = result.data
        
        // 如果返回的是对象格式 {points: 100, money: 1}
        if (typeof config === 'object' && config.points && config.money) {
          return { 
            points: parseInt(config.points), 
            money: parseInt(config.money) 
          }
        }
        
        // 如果返回的是字符串格式 "100:1"
        if (typeof config === 'string' && config.includes(':')) {
          const parts = config.split(':')
          const points = parseInt(parts[0].trim())
          const money = parseInt(parts[1].trim())
          
          if (!isNaN(points) && !isNaN(money) && points > 0 && money > 0) {
            return { points, money }
          }
        }
      }
      
      console.warn('Invalid points_to_money format, using default 100:1')
      return { points: 100, money: 1 }
    } catch (error) {
      console.error('Error fetching points to money config:', error)
      return { points: 100, money: 1 }
    }
  }

  /**
   * Calculate money value from points
   */
  async calculateMoneyFromPoints(pointsAmount: number): Promise<number> {
    const config = await this.getPointsToMoneyConfig()
    return (pointsAmount / config.points) * config.money
  }

  /**
   * Calculate points needed for money amount
   */
  async calculatePointsFromMoney(moneyAmount: number): Promise<number> {
    const config = await this.getPointsToMoneyConfig()
    return Math.ceil((moneyAmount / config.money) * config.points)
  }

  /**
   * Validate points configuration values
   */
  validatePointsConfig(config: Partial<PointsConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.points_per_order_amount !== undefined) {
      if (typeof config.points_per_order_amount !== 'number' || config.points_per_order_amount < 0) {
        errors.push('points_per_order_amount must be a non-negative number')
      }
    }

    if (config.points_reward_ratio !== undefined) {
      if (typeof config.points_reward_ratio !== 'number' || config.points_reward_ratio < 0) {
        errors.push('points_reward_ratio must be a non-negative number')
      }
    }

    if (config.points_enabled !== undefined) {
      if (typeof config.points_enabled !== 'boolean') {
        errors.push('points_enabled must be a boolean value')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get currency configuration
   */
  async getCurrencyConfig(): Promise<CurrencyConfig> {
    try {
      const currencyData = await this.getConfigValue<any>('currency', null)

      if (currencyData) {
        // 如果返回的是对象格式
        if (typeof currencyData === 'object' && currencyData.code) {
          return {
            code: currencyData.code || this.DEFAULT_CURRENCY_CONFIG.code,
            symbol: currencyData.symbol || this.DEFAULT_CURRENCY_CONFIG.symbol,
            name: currencyData.name || this.DEFAULT_CURRENCY_CONFIG.name
          }
        }

        // 如果返回的是字符串格式（只有货币代码）
        if (typeof currencyData === 'string') {
          return this.getCurrencyByCode(currencyData)
        }
      }

      console.log('No currency configuration found, using default (CNY)')
      return this.DEFAULT_CURRENCY_CONFIG
    } catch (error) {
      console.error('Error fetching currency configuration, using default:', error)
      return this.DEFAULT_CURRENCY_CONFIG
    }
  }

  /**
   * Get currency config by currency code
   */
  private getCurrencyByCode(code: string): CurrencyConfig {
    const currencyMap: { [key: string]: CurrencyConfig } = {
      'CNY': { code: 'CNY', symbol: '¥', name: '人民币' },
      'USD': { code: 'USD', symbol: '$', name: '美元' },
      'MMK': { code: 'MMK', symbol: 'Ks', name: '缅币' }
    }

    return currencyMap[code.toUpperCase()] || this.DEFAULT_CURRENCY_CONFIG
  }
}

// Export singleton instance
export const systemConfigService = new SystemConfigService()