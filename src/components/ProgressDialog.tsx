import React, { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'

interface ProgressDialogProps {
  isOpen: boolean
  title: string
  message: string
  isCompleted?: boolean
  completedMessage?: string
  showCountdown?: boolean
  countdownSeconds?: number
}

export default function ProgressDialog({
  isOpen,
  title,
  message,
  isCompleted = false,
  completedMessage = '操作完成',
  showCountdown = true,
  countdownSeconds = 3
}: ProgressDialogProps) {
  const [countdown, setCountdown] = useState(countdownSeconds)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isOpen || isCompleted) {
      setCountdown(countdownSeconds)
      setProgress(0)
      return
    }

    // 模拟进度条动画 (0-80% 在处理过程中)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 80) {
          return prev + Math.random() * 10
        }
        return prev
      })
    }, 200)

    return () => clearInterval(progressInterval)
  }, [isOpen, isCompleted, countdownSeconds])

  useEffect(() => {
    if (!isCompleted || !showCountdown) return

    // 完成后进度条跳到100%
    setProgress(100)

    // 倒计时
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isCompleted, countdown, showCountdown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-lg max-w-sm w-full p-6 transform animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isCompleted ? 'bg-green-50' : 'bg-blue-50'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {isCompleted ? completedMessage : message}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-gradient-to-r from-green-400 to-green-500'
                  : 'bg-gradient-to-r from-blue-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Progress percentage */}
          <div className="text-xs text-gray-500 mb-2">
            {Math.round(Math.min(progress, 100))}%
          </div>

          {/* Countdown */}
          {isCompleted && showCountdown && countdown > 0 && (
            <div className="text-xs text-gray-400">
              {countdown} 秒后自动关闭
            </div>
          )}
        </div>
      </div>
    </div>
  )
}