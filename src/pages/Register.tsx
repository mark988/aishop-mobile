import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Mail, Phone, Lock, User } from 'lucide-react'
import { apiService, RegisterRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [formData, setFormData] = useState<RegisterRequest>({
    name: '',
    emailOrPhone: '',
    password: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useLanguage()

  // 判断输入的是邮箱还是手机号
  const isEmail = (str: string): boolean => {
    const emailRegex = /^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/
    return emailRegex.test(str)
  }

  const isPhone = (str: string): boolean => {
    const phoneRegex = /^\d+$/
    return phoneRegex.test(str)
  }

  const getInputIcon = () => {
    if (formData.emailOrPhone) {
      if (isEmail(formData.emailOrPhone)) {
        return <Mail className="w-5 h-5 text-gray-400" />
      } else if (isPhone(formData.emailOrPhone)) {
        return <Phone className="w-5 h-5 text-gray-400" />
      }
    }
    return <User className="w-5 h-5 text-gray-400" />
  }

  const handleInputChange = (field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error(t('register.error.name_required'))
      return false
    }

    if (!formData.emailOrPhone.trim()) {
      toast.error(t('register.error.username_required'))
      return false
    }

    // 验证邮箱或手机号格式
    if (!isEmail(formData.emailOrPhone) && !isPhone(formData.emailOrPhone)) {
      toast.error(t('register.error.invalid_format'))
      return false
    }

    if (!formData.password.trim()) {
      toast.error(t('register.error.password_required'))
      return false
    }

    if (formData.password.length < 6) {
      toast.error(t('register.error.password_too_short'))
      return false
    }

    if (formData.password !== confirmPassword) {
      toast.error(t('register.error.password_mismatch'))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Register form submitted with data:', formData)

    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }

    setIsLoading(true)
    console.log('Starting registration process...')

    try {
      console.log('Calling API with:', formData)
      const response = await apiService.register(formData)
      console.log('API response:', response)

      if (response) {
        // 使用 AuthContext 处理登录
        login(response.user, response.token)

        toast.success(t('register.success', { name: response.user.name }), {
          duration: 3000,
          icon: '🎉',
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        console.log('No response data received')
        toast.error(t('register.error.failed'))
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.message || t('register.error.failed')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      console.log('Registration process completed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center px-4 py-4">
          <Link to="/login" className="mr-3">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{t('register.title')}</h1>
        </div>
      </div>

      {/* Register Form */}
      <div className="px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('register.create_account')}</h2>
            <p className="text-gray-500">{t('register.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.name_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('register.name_placeholder')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email/Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.username_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {getInputIcon()}
                </div>
                <input
                  type="text"
                  value={formData.emailOrPhone}
                  onChange={(e) => handleInputChange('emailOrPhone', e.target.value)}
                  placeholder={t('register.username_placeholder')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
              </div>
              {formData.emailOrPhone && (
                <div className="mt-2 text-xs">
                  {isEmail(formData.emailOrPhone) && (
                    <span className="text-green-600">{t('register.detected_email')}</span>
                  )}
                  {isPhone(formData.emailOrPhone) && (
                    <span className="text-green-600">{t('register.detected_phone')}</span>
                  )}
                  {!isEmail(formData.emailOrPhone) && !isPhone(formData.emailOrPhone) && (
                    <span className="text-red-600">{t('register.invalid_format')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.password_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('register.password_placeholder')}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.confirm_password_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('register.confirm_password_placeholder')}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                isLoading
                  ? 'bg-primary-300 text-white cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('register.registering')}
                </div>
              ) : (
                t('register.create_button')
              )}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('register.already_have_account')}{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('register.login_now')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 pb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">{t('register.tips_title')}</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>{t('register.tips_phone_email')}</li>
            <li>{t('register.tips_password_length')}</li>
            <li>{t('register.tips_auto_login')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
