import React from 'react'
import { Building2, Copy, CheckCircle, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../contexts/LanguageContext'

interface BankAccount {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  bankLogoUrl?: string
  qrCodeUrl?: string
  instructions?: any
}

interface BankAccountSelectorProps {
  banks: BankAccount[]
  selectedBank: string | null
  onSelectBank: (bankCode: string) => void
  onImageClick?: (imageUrl: string) => void
}

export const BankAccountSelector: React.FC<BankAccountSelectorProps> = ({
  banks,
  selectedBank,
  onSelectBank,
  onImageClick
}) => {
  const { t } = useLanguage()

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // 方法1: 尝试使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        toast.success(`${label}${t('bank.copied')}`)
        return
      }

      // 方法2: 降级方案 - 使用传统的 execCommand
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful) {
          toast.success(`${label}${t('bank.copied')}`)
        } else {
          throw new Error('execCommand failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      // 如果复制失败，显示一个可选择的文本框
      toast.error(`${t('bank.copy_failed')}: ${text}`, { duration: 5000 })
    }
  }

  const getInstructions = (bank: BankAccount) => {
    if (!bank.instructions) return ''
    if (typeof bank.instructions === 'string') {
      try {
        const parsed = JSON.parse(bank.instructions)
        return parsed.zh || parsed.en || ''
      } catch {
        return bank.instructions
      }
    }
    return bank.instructions.zh || bank.instructions.en || ''
  }

  if (banks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm">{t('bank.no_accounts')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {banks.map((bank) => {
        const isSelected = selectedBank === bank.bankCode
        const instructions = getInstructions(bank)

        return (
          <div
            key={bank.id}
            className={`
              relative border-2 rounded-lg transition-all duration-300 cursor-pointer overflow-hidden
              ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200'
              }
            `}
          >
            {/* 银行头部 - 始终显示 */}
            <div
              onClick={() => onSelectBank(bank.bankCode)}
              className="flex items-center space-x-3 p-3"
            >
              {/* 银行Logo或图标 */}
              <div className="flex-shrink-0">
                {bank.bankLogoUrl ? (
                  <img
                    src={bank.bankLogoUrl}
                    alt={bank.bankName}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* 银行名称 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {bank.bankName}
                </h3>
                {!isSelected && (
                  <p className="text-xs text-gray-500 truncate">
                    {bank.accountNumber}
                  </p>
                )}
              </div>

              {/* 选中标记 */}
              <div className="flex-shrink-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary-500' : 'border-2 border-gray-300'
                }`}>
                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>

            {/* 详细信息 - 仅选中时显示 */}
            {isSelected && (
              <div className="px-3 pb-3 space-y-2 border-t border-primary-200 pt-2">
                {/* 账号信息 */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs text-gray-500">{t('bank.account_number')}</p>
                    <p className="text-sm font-mono font-medium text-gray-900 truncate">
                      {bank.accountNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(bank.accountNumber, t('bank.account_label'))
                    }}
                    className="flex-shrink-0 p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* 户名信息 */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs text-gray-500">{t('bank.account_name')}</p>
                    <p className="text-sm font-medium text-gray-900">
                      {bank.accountName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(bank.accountName, t('bank.name_label'))
                    }}
                    className="flex-shrink-0 p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* 转账说明 */}
                {instructions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <p className="text-xs text-amber-800">
                      💡 {instructions}
                    </p>
                  </div>
                )}

                {/* 二维码 */}
                {bank.qrCodeUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onImageClick?.(bank.qrCodeUrl!)
                    }}
                    className="w-full flex items-center justify-center space-x-2 text-sm text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 rounded-lg p-2 border border-gray-200 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{t('bank.view_qr_code')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
