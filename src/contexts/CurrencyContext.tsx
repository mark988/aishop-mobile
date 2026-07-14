import React, { createContext, useContext, useState, useEffect } from 'react'
import { systemConfigService, CurrencyConfig } from '../services/systemConfigService'

interface CurrencyContextType {
  currency: CurrencyConfig
  formatPrice: (price: number) => string
  loading: boolean
  refreshCurrency: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyConfig>({
    code: 'CNY',
    symbol: '¥',
    name: '人民币'
  })
  const [loading, setLoading] = useState(true)

  const loadCurrency = async () => {
    try {
      setLoading(true)
      const config = await systemConfigService.getCurrencyConfig()
      console.log('Mobile - Loaded currency config:', config)
      setCurrency(config)
    } catch (error) {
      console.error('Mobile - Failed to load currency config:', error)
      // 使用默认值
      setCurrency({
        code: 'CNY',
        symbol: '¥',
        name: '人民币'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrency()
  }, [])

  const formatPrice = (price: number): string => {
    // 格式化数字，添加千分位分隔符
    const formattedNumber = price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })

    // 返回带货币符号的价格
    return `${currency.symbol}${formattedNumber}`
  }

  const refreshCurrency = async () => {
    await loadCurrency()
  }

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice, loading, refreshCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
