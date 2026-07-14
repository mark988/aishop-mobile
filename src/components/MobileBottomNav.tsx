import { Link, useLocation } from 'react-router-dom'
import { Home, Package, Grid, ShoppingCart, User } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function MobileBottomNav() {
  const location = useLocation()
  const { cartCount } = useCart()
  const { t } = useLanguage()

  const navItems = [
    {
      to: '/',
      icon: Home,
      label: t('nav.home'),
      active: location.pathname === '/'
    },
    {
      to: '/categories',
      icon: Grid,
      label: t('nav.categories'),
      active: location.pathname === '/categories' || location.pathname.startsWith('/category/')
    },
    {
      to: '/products',
      icon: Package,
      label: t('nav.products'),
      active: location.pathname === '/products'
    },
    {
      to: '/cart',
      icon: ShoppingCart,
      label: t('nav.cart'),
      active: location.pathname === '/cart'
    },
    {
      to: '/profile',
      icon: User,
      label: t('nav.profile'),
      active: location.pathname === '/profile'
    }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 touch-size transition-colors ${
                item.active
                  ? 'text-primary-600'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className="relative inline-flex p-2">
                <Icon className="w-5 h-5" />
                {item.to === '/cart' && cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] leading-[16px] rounded-full w-4 h-4 flex items-center justify-center font-medium shadow-sm border border-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-full">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}