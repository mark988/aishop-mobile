import { Link } from 'react-router-dom'
import { X, Home, Package, Grid, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MobileSidebarProps {
  onClose: () => void
}

export default function MobileSidebar({ onClose }: MobileSidebarProps) {
  const { user } = useAuth()

  const menuItems = [
    { to: '/', icon: Home, label: '首页' },
    { to: '/products', icon: Package, label: '商品' },
    { to: '/categories', icon: Grid, label: '分类' },
    ...(user ? [
      { to: '/profile', icon: User, label: '个人中心' },
      { to: '/orders', icon: Package, label: '我的订单' },
      { to: '/favorites', icon: Package, label: '我的收藏' },
    ] : [
      { to: '/login', icon: User, label: '登录' },
    ])
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}>
      <div className="fixed top-0 left-0 w-80 max-w-[80vw] h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">菜单</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-600 active:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="py-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 active:bg-gray-100 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}