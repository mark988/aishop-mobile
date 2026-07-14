import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Mail, Phone, Lock, User } from 'lucide-react'
import { apiService, LoginRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { t } = useLanguage()

  // Get redirect path and checkout data from navigation state
  const from = (location.state as any)?.from || '/'
  const checkoutData = (location.state as any)?.checkoutData

  // Check if username is email or phone
  const isEmail = (str: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(str)
  }

  const isPhone = (str: string): boolean => {
    // 只要是纯数字就判断为手机号（支持不同国家的手机号格式）
    const phoneRegex = /^\d+$/
    return phoneRegex.test(str)
  }

  const getInputIcon = () => {
    if (formData.username) {
      if (isEmail(formData.username)) {
        return <Mail className="w-5 h-5 text-gray-400" />
      } else if (isPhone(formData.username)) {
        return <Phone className="w-5 h-5 text-gray-400" />
      }
    }
    return <User className="w-5 h-5 text-gray-400" />
  }

  const handleInputChange = (field: keyof LoginRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      toast.error(t('login.error.username_required'))
      return false
    }

    if (!formData.password.trim()) {
      toast.error(t('login.error.password_required'))
      return false
    }

    // Validate username format
    if (!isEmail(formData.username) && !isPhone(formData.username)) {
      toast.error(t('login.error.invalid_format'))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login form submitted with data:', formData)
    
    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }

    setIsLoading(true)
    console.log('Starting login process...')
    
    try {
      console.log('Calling API with:', formData)
      const response = await apiService.login(formData)
      console.log('API response:', response)
      
      if (response) {
        // Use AuthContext to handle login
        login(response.user, response.token)

        toast.success(t('login.success', { name: response.user.name || response.user.email }))

        // Check if there's a saved return path (from favorite button)
        const returnPath = sessionStorage.getItem('returnPath')
        if (returnPath) {
          sessionStorage.removeItem('returnPath')
          navigate(returnPath, { replace: true })
        } else if (from === '/checkout' && checkoutData) {
          // Redirect to checkout with original cart data
          navigate(from, { state: checkoutData, replace: true })
        } else if (from !== '/') {
          // Redirect to the page user came from
          navigate(from, { replace: true })
        } else {
          // Default redirect to home
          navigate('/')
        }
      } else {
        console.log('No response data received')
        toast.error(t('login.error.failed'))
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.message || t('login.error.failed')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      console.log('Login process completed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center px-4 py-4">
          <Link to="/" className="mr-3">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{t('login.title')}</h1>
        </div>
      </div>

      {/* Login Form */}
      <div className="px-4 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('login.welcome')}</h2>
            <p className="text-gray-500">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.username_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {getInputIcon()}
                </div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder={t('login.username_placeholder')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.password_label')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('login.password_placeholder')}
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

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => console.log('Login button clicked!')}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                isLoading
                  ? 'bg-primary-300 text-white cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('login.logging_in')}
                </div>
              ) : (
                t('login.button')
              )}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('login.no_account')}{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('login.register_now')}
              </Link>
            </p>
          </div>

          {/* Forgot Password */}
          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-gray-500 hover:text-gray-700">
              {t('login.forgot_password')}
            </Link>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 pb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">{t('login.tips_title')}</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>{t('login.tips_phone_email')}</li>
            <li>{t('login.tips_password_length')}</li>
            <li>{t('login.tips_contact')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
