import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Globe, User, LogOut, Bell, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage, Language } from '../contexts/LanguageContext'
import { useNotificationContext } from '../contexts/NotificationContext'
import { useHomeInit } from '../hooks/useHomeInit'
import MobileNotificationCenter from './MobileNotificationCenter'
import toast from 'react-hot-toast'

export default function MobileHeader() {
  const { user, isLoggedIn, logout, isLoading } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { unreadCount } = useNotificationContext()
  const location = useLocation()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)

  // Only call useHomeInit on home page to avoid unnecessary API calls
  const isHomePage = location.pathname === '/' || location.pathname === '/home'
  const { initData } = useHomeInit(isHomePage)
  const brandConfig = initData?.brandConfig
  const brandLoading = !initData

  const handleLogout = () => {
    logout()
    toast.success(t('auth.logout_success'))
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    setShowLanguageDialog(false)
    const languageNames = {
      zh: '中文',
      en: 'English',
      my: 'မြန်မာ'
    }
    toast.success(`语言已切换至${languageNames[lang]}`)
  }

  const getLanguageFlag = (lang: Language) => {
    const flags = {
      zh: '🇨🇳',
      en: '🇦🇺 ',
      my: '🇲🇲'
    }
    return flags[lang]
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <ShoppingBag className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {brandLoading ? t('header.platform') : (brandConfig?.primaryName || t('header.platform'))}
              </h1>
              <p className="text-xs text-gray-500">
                {brandLoading ? 'Premium Mall' : (brandConfig?.secondaryName || 'Premium Mall')}
              </p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Bell - only show when logged in */}
          {isLoggedIn && user && (
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setShowLanguageDialog(true)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center"
          >
            <Globe className="w-5 h-5" />
            <span className="ml-1 text-sm">{getLanguageFlag(language)}</span>
          </button>

          {isLoading ? (
            <div className="w-12 h-6 bg-gray-200 animate-pulse rounded"></div>
          ) : isLoggedIn && user ? (
            <div className="flex items-center space-x-2">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name || user.email}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary-600" />
              )}
              <span className="text-sm font-medium text-gray-900 max-w-20 truncate">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                title={t('header.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-primary-600 font-medium hover:text-primary-700">
              {t('header.login')}
            </Link>
          )}
        </div>
      </div>
      
      {/* Mobile Notification Center */}
      {showNotifications && (
        <MobileNotificationCenter onClose={() => setShowNotifications(false)} />
      )}

      {/* Language Switcher Dialog */}
      {showLanguageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl animate-scale-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-primary-600" />
                选择语言 / Select Language
              </h3>

              <div className="space-y-2">
                {/* Chinese */}
                <button
                  onClick={() => handleLanguageChange('zh')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    language === 'zh'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🇨🇳</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">中文</p>
                      <p className="text-xs text-gray-500">Chinese (Simplified)</p>
                    </div>
                  </div>
                  {language === 'zh' && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </button>

                {/* English */}
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    language === 'en'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🇦🇺 </span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">English</p>
                      <p className="text-xs text-gray-500">English (US)</p>
                    </div>
                  </div>
                  {language === 'en' && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </button>

                {/* Myanmar */}
                <button
                  onClick={() => handleLanguageChange('my')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    language === 'my'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🇲🇲</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">မြန်မာ</p>
                      <p className="text-xs text-gray-500">Myanmar (Burmese)</p>
                    </div>
                  </div>
                  {language === 'my' && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowLanguageDialog(false)}
                className="w-full mt-6 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}