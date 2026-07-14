import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { PointsExchangeProvider } from './contexts/PointsExchangeContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import CategoriesPage from './pages/CategoriesPage'
import Category from './pages/Category'
import Login from './pages/Login'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import PasswordChange from './pages/PasswordChange'
import Orders from './pages/Orders'
import Favorites from './pages/Favorites'
import Points from './pages/Points'
import Coupons from './pages/Coupons'
import AIRecommendations from './pages/AIRecommendations'
import FeaturedProducts from './pages/FeaturedProducts'
import Register from './pages/Register'
import RefundPolicy from './pages/RefundPolicy'
import WholesalePaymentNotice from './pages/WholesalePaymentNotice'
import MobileHeader from './components/MobileHeader'
import MobileBottomNav from './components/MobileBottomNav'
import MobileAIChat from './components/MobileAIChat'

// Component to handle layout based on route
function AppContent() {
  const location = useLocation()
  const isProductDetail = location.pathname.startsWith('/product/')
  const isLogin = location.pathname === '/login'
  const isRegister = location.pathname === '/register'
  const isCheckout = location.pathname === '/checkout'
  const isOrderSuccess = location.pathname === '/order-success'
  const isProfileEdit = location.pathname === '/profile/edit'
  const isPasswordChange = location.pathname === '/profile/password'
  const hideNavigation = isProductDetail || isLogin || isRegister || isCheckout || isOrderSuccess || isProfileEdit || isPasswordChange

  // 自动清理localStorage功能
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('clear') === '1') {
      console.log('🧹 Clearing localStorage and sessionStorage...')
      localStorage.clear()
      sessionStorage.clear()
      console.log('✅ Storage cleared!')
      // 重定向到首页
      window.location.href = '/'
    }
  }, [location])

  return (
    <div className="min-h-screen-mobile bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Mobile Header - only show on non-product detail and non-login pages */}
      {!hideNavigation && <MobileHeader />}
      
      {/* Main Content */}
      <main className={hideNavigation ? "" : "safe-top safe-bottom"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/wholesale-payment-notice" element={<WholesalePaymentNotice />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:category" element={<Category />} />
          <Route path="/products" element={<Products />} />
          <Route path="/ai-recommendations" element={<AIRecommendations />} />
          <Route path="/featured-products" element={<FeaturedProducts />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/profile/password" element={<PasswordChange />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/points" element={<Points />} />
          <Route path="/coupons" element={<Coupons />} />
        </Routes>
      </main>
      
      {/* Mobile Bottom Navigation - only show on non-product detail and non-login pages */}
      {!hideNavigation && <MobileBottomNav />}

      {/* AI 智能购物助手浮窗 - 与底部导航同步显示/隐藏 */}
      {!hideNavigation && <MobileAIChat />}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <CurrencyProvider>
            <CartProvider>
              <FavoritesProvider>
                <PointsExchangeProvider>
                  <Router>
                    <AppContent />
                  </Router>
                </PointsExchangeProvider>
              </FavoritesProvider>
            </CartProvider>
          </CurrencyProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App