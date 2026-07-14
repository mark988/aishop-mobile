import { useState, useEffect, useCallback } from 'react'
import { systemConfigService, PointsConfig } from '../services/systemConfigService'
import { PointsEstimate } from '../types'
import { getPointsEstimate } from '../utils/configUtils'

/**
 * Hook for accessing system configuration in React components
 */
export const useSystemConfig = () => {
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPointsConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const config = await systemConfigService.getPointsConfig()
      setPointsConfig(config)
    } catch (err) {
      console.error('Failed to fetch points config:', err)
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPointsConfig()
  }, [fetchPointsConfig])

  const refreshConfig = useCallback(() => {
    systemConfigService.refreshCache()
    fetchPointsConfig()
  }, [fetchPointsConfig])

  return {
    pointsConfig,
    loading,
    error,
    refreshConfig
  }
}

/**
 * Hook for getting points estimates for cart/checkout
 */
export const usePointsEstimate = (cartTotal: number) => {
  const [estimate, setEstimate] = useState<PointsEstimate | null>(null)
  const [loading, setLoading] = useState(false)

  const updateEstimate = useCallback(async (total: number) => {
    if (total <= 0) {
      setEstimate(null)
      return
    }

    try {
      setLoading(true)
      const newEstimate = await getPointsEstimate(total)
      setEstimate(newEstimate)
    } catch (error) {
      console.error('Failed to calculate points estimate:', error)
      setEstimate({
        pointsToEarn: 0,
        isEligible: false,
        message: '无法计算积分奖励'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    updateEstimate(cartTotal)
  }, [cartTotal, updateEstimate])

  return {
    estimate,
    loading,
    refresh: () => updateEstimate(cartTotal)
  }
}