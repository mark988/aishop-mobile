import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Settings,
  Gift,
  CreditCard,
  ShoppingBag,
  Heart,
  LogOut,
  ChevronRight,
  Star,
  Coins,
  Edit,
  Lock,
  Bell,
  Phone,
  Mail
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useOrderStats } from '../hooks/useOrderStats'
import { useFavoritesStats } from '../hooks/useFavoritesStats'
import { usePointsData } from '../hooks/usePointsData'
import { useUserCoupons } from '../hooks/useUserCoupons'
import { useLanguage } from '../contexts/LanguageContext'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, isLoggedIn, logout, isLoading } = useAuth()
  const { stats: orderStats, loading: orderLoading } = useOrderStats()
  const { favoritesCount, loading: favoritesLoading } = useFavoritesStats()
  const { pointsData, loading: pointsLoading } = usePointsData()
  const { counts: couponCounts, loading: couponsLoading } = useUserCoupons()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success(t('auth.logout_success'))
    navigate('/')
    setShowLogoutDialog(false)
  }

  // If not logged in, show login prompt
  if (!isLoggedIn && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-900">{t('nav.profile')}</h1>
          </div>
        </div>

        {/* Enhanced Login Prompt */}
        <div className="flex flex-col items-center justify-center py-12 px-6">
          {/* Animated Avatar */}
          <div className="relative mb-8">
            <div className="w-28 h-28 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-14 h-14 text-primary-500" />
            </div>
            {/* Floating rings */}
            <div className="absolute inset-0 rounded-full border-2 border-primary-200 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border border-primary-300 animate-pulse"></div>
          </div>
          
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('profile.welcome')}</h3>
            <p className="text-gray-500 text-base leading-relaxed">
              {t('profile.login_prompt')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-sm space-y-4">
            <Link
              to="/login"
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-center block"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className="w-full border-2 border-primary-200 text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-2xl font-medium transition-all duration-200 text-center block"
            >
              {t('auth.register')}
            </Link>
          </div>

          {/* Benefits Preview */}
          <div className="mt-12 w-full max-w-sm">
            <h4 className="text-center text-sm font-semibold text-gray-700 mb-5">{t('profile.after_login')}:</h4>
            <div className="space-y-3">
              <div className="flex items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{t('profile.manage_orders')}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{t('profile.manage_orders_desc')}</p>
                </div>
              </div>
              <div className="flex items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{t('profile.favorites')}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{t('profile.favorites_desc')}</p>
                </div>
              </div>
              <div className="flex items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <Coins className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{t('profile.points_rewards')}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{t('profile.points_rewards_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Actions */}
          <div className="mt-8 w-full max-w-sm">
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-center text-sm text-gray-600 mb-3">{t('profile.skip_login')}</p>
              <div className="flex space-x-3">
                <Link
                  to="/"
                  className="flex-1 bg-white text-gray-700 py-2 px-4 rounded-xl text-sm font-medium text-center hover:bg-gray-50 transition-colors"
                >
                  {t('profile.continue_browsing')}
                </Link>
                <Link
                  to="/cart"
                  className="flex-1 bg-white text-gray-700 py-2 px-4 rounded-xl text-sm font-medium text-center hover:bg-gray-50 transition-colors"
                >
                  {t('profile.view_cart')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('profile.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">我的</h1>
        </div>
      </div>

      {/* User Info Section */}
      <div className="bg-white mt-2">
        <div className="px-4 py-6">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name || user.email}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-600" />
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                <Edit className="w-3 h-3 text-white" />
              </button>
            </div>
            
            {/* User Details */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {user?.name || '未设置姓名'}
              </h2>
              <div className="space-y-1">
                {user?.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {user.phone}
                  </div>
                )}
                {user?.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {user.email}
                  </div>
                )}
              </div>
            </div>
            
            {/* VIP Badge */}
            <div className="text-right">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs px-2 py-1 rounded-full font-medium mb-1">
                {pointsData?.level === 'platinum' ? t('profile.level.platinum') :
                 pointsData?.level === 'gold' ? t('profile.level.gold') :
                 pointsData?.level === 'silver' ? t('profile.level.silver') : t('profile.level.regular')}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                {t('profile.points_label')}: {pointsLoading ? '-' : (pointsData?.currentPoints?.toLocaleString() || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white mt-2">
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          <Link to="/orders?status=pending" className="flex flex-col items-center py-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {orderLoading ? '-' : orderStats.pending}
            </div>
            <div className="text-xs text-gray-500">{t('profile.status.pending')}</div>
          </Link>
          <Link to="/orders?status=processing" className="flex flex-col items-center py-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {orderLoading ? '-' : orderStats.processing}
            </div>
            <div className="text-xs text-gray-500">{t('profile.status.processing')}</div>
          </Link>
          <Link to="/orders?status=shipped" className="flex flex-col items-center py-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {orderLoading ? '-' : orderStats.shipped}
            </div>
            <div className="text-xs text-gray-500">{t('profile.status.shipped')}</div>
          </Link>
          <Link to="/orders?status=delivered" className="flex flex-col items-center py-4 hover:bg-gray-50">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {orderLoading ? '-' : orderStats.delivered}
            </div>
            <div className="text-xs text-gray-500">{t('profile.status.delivered')}</div>
          </Link>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2 mt-2">
        {/* Personal Center */}
        <div className="bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">{t('profile.settings')}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <Link to="/profile/edit" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('profile.personal_info')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
            {/* <Link to="/profile/settings" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('profile.account_settings')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link> */}
            <Link to="/profile/password" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('profile.change_password')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">{t('profile.benefits')}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <Link to="/points" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Coins className="w-5 h-5 text-yellow-500 mr-3" />
                <span className="text-gray-900">{t('profile.points_center')}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {pointsLoading ? '-' : (pointsData?.currentPoints?.toLocaleString() || 0)} {t('products.points')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link to="/coupons" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Gift className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-gray-900">{t('profile.coupons')}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {couponsLoading ? '-' : couponCounts.total} {t('profile.unit.count')}
                </span>
                {!couponsLoading && couponCounts.unused > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full mr-2">
                    {couponCounts.unused}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </div>
        </div>

        {/* Orders and Favorites */}
        <div className="bg-white">
          <div className="divide-y divide-gray-100">
            <Link to="/orders" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <ShoppingBag className="w-5 h-5 text-blue-500 mr-3" />
                <span className="text-gray-900">{t('profile.my_orders')}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {orderLoading ? '-' : orderStats.total} {t('profile.unit.orders')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link to="/favorites" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Heart className="w-5 h-5 text-pink-500 mr-3" />
                <span className="text-gray-900">{t('profile.my_favorites')}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {favoritesLoading ? '-' : favoritesCount} {t('profile.unit.items')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </div>
        </div>

        {/* Other Settings */}
        {/* <div className="bg-white">
          <div className="divide-y divide-gray-100">
            <Link to="/notifications" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-900">消息通知</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </div> */}

        {/* Logout */}
        <div className="bg-white">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-center px-4 py-3 hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-600 font-medium">{t('header.logout')}</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('auth.logout_confirm')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('auth.logout_confirm_message')}</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('profile.logout_cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  {t('profile.logout_confirm_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  )
}
