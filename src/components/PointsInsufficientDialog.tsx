import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface PointsInsufficientDialogProps {
  isOpen: boolean
  onClose: () => void
  requiredPoints: number
  currentPoints: number
}

export default function PointsInsufficientDialog({
  isOpen,
  onClose,
  requiredPoints,
  currentPoints
}: PointsInsufficientDialogProps) {
  if (!isOpen) return null

  const shortfall = requiredPoints - currentPoints

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 p-6 transform animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">积分不足</h3>
          <p className="text-sm text-gray-600 mb-4">
            抱歉，您的积分余额不足以兑换所选商品
          </p>

          {/* Points details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">需要积分：</span>
              <span className="font-semibold text-orange-600 flex items-center">
                <span className="mr-1">🪙</span>
                {requiredPoints.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">当前积分：</span>
              <span className="font-semibold text-blue-600 flex items-center">
                <span className="mr-1">🪙</span>
                {currentPoints.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">还需积分：</span>
                <span className="font-semibold text-red-600 flex items-center">
                  <span className="mr-1">🪙</span>
                  {shortfall.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              返回购物车
            </button>
           
          </div>
        </div>
      </div>
    </div>
  )
}