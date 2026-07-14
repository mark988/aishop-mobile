import { useState, useEffect } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface BankAccount {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  bankLogoUrl?: string
  qrCodeUrl?: string
  instructions?: any
  isEnabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const useBankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBankAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/bank-accounts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.code === 200) {
        // 转换字段名以保持前端兼容性
        const convertedData = (result.data || []).map((item: any) => ({
          id: item.id,
          bankName: item.bankName || item.bank_name,
          bankCode: item.bankCode || item.bank_code,
          accountNumber: item.accountNumber || item.account_number,
          accountName: item.accountName || item.account_name,
          bankLogoUrl: item.bankLogoUrl || item.bank_logo_url,
          qrCodeUrl: item.qrCodeUrl || item.qr_code_url,
          instructions: item.instructions,
          isEnabled: item.isEnabled !== undefined ? item.isEnabled : item.is_enabled,
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : item.sort_order || 0,
          createdAt: item.createdAt || item.created_at,
          updatedAt: item.updatedAt || item.updated_at
        }))
        // 只返回启用的银行账户，并按排序序号排序
        const enabledAccounts = convertedData
          .filter((acc: BankAccount) => acc.isEnabled)
          .sort((a: BankAccount, b: BankAccount) => a.sortOrder - b.sortOrder)
        setBankAccounts(enabledAccounts)
      } else {
        throw new Error(result.message || '获取银行账户失败')
      }
    } catch (err: any) {
      console.error('Error fetching bank accounts:', err)
      setError(err.message || '获取银行账户失败')
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBankAccounts()
  }, [])

  return {
    bankAccounts,
    loading,
    error,
    refetch: fetchBankAccounts
  }
}
