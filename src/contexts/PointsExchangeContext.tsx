import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { systemConfigService, PointsToMoneyConfig } from '../services/systemConfigService'

interface PointsExchangeContextType {
  exchangeRate: PointsToMoneyConfig | null
  loading: boolean
  error: string | null
  calculatePointsFromMoney: (moneyAmount: number) => number
  refreshExchangeRate: () => Promise<void>
}

const PointsExchangeContext = createContext<PointsExchangeContextType | undefined>(undefined)

interface PointsExchangeProviderProps {
  children: ReactNode
}

export function PointsExchangeProvider({ children }: PointsExchangeProviderProps) {
  const [exchangeRate, setExchangeRate] = useState<PointsToMoneyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExchangeRate = async () => {
    try {
      setLoading(true)
      setError(null)
      const rate = await systemConfigService.getPointsToMoneyConfig()
      setExchangeRate(rate)
    } catch (err) {
      console.error('Failed to fetch points exchange rate:', err)
      setError('获取积分兑换率失败')
      // 设置默认兑换率作为备用方案 - 修正为1:1而不是100:1
      setExchangeRate({ points: 1, money: 1 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExchangeRate()
  }, [])

  const calculatePointsFromMoney = (moneyAmount: number): number => {
    if (!exchangeRate) {
      // 默认兑换率 - 修正为1:1而不是100:1
      return Math.round(moneyAmount * 1)
    }
    return Math.ceil((moneyAmount / exchangeRate.money) * exchangeRate.points)
  }

  const refreshExchangeRate = async () => {
    await fetchExchangeRate()
  }

  const value: PointsExchangeContextType = {
    exchangeRate,
    loading,
    error,
    calculatePointsFromMoney,
    refreshExchangeRate
  }

  return (
    <PointsExchangeContext.Provider value={value}>
      {children}
    </PointsExchangeContext.Provider>
  )
}

export function usePointsExchange(): PointsExchangeContextType {
  const context = useContext(PointsExchangeContext)
  if (context === undefined) {
    throw new Error('usePointsExchange must be used within a PointsExchangeProvider')
  }
  return context
}