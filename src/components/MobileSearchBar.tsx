import { useState } from 'react'
import { X, Search } from 'lucide-react'

interface MobileSearchBarProps {
  onClose: () => void
}

export default function MobileSearchBar({ onClose }: MobileSearchBarProps) {
  const [query, setQuery] = useState('')

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 active:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索商品..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
              autoFocus
            />
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-gray-500 text-center">输入关键词搜索商品</p>
      </div>
    </div>
  )
}