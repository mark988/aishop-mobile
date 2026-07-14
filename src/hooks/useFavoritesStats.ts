import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  brand: string
  salesCount: number
  video: string
  mediaType: string
  origin: string
  sku: string
  isActive: boolean
  createdAt: string
  property: any
  updatedAt: string
  images: string[]
}

interface Favorite {
  id: string
  userId: string
  productId: string
  product: Product
  createdAt: string
}

interface FavoritesResponse {
  code: number
  message: string
  data: {
    records: Favorite[]
    total: number
    size: number
    current: number
    pages: number
  }
}

export function useFavoritesStats() {
  const { user, isLoggedIn, token } = useAuth()
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      setFavoritesCount(0)
      return
    }

    const fetchFavoritesStats = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Use token from AuthContext
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${API_BASE_URL}/api/favorites/list?page=1&size=1`, {
          method: 'GET',
          headers,
          credentials: 'include' // Include cookies for authentication
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, set count to 0
            setFavoritesCount(0)
            return
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data: FavoritesResponse = await response.json()
        
        if (data.code === 200) {
          setFavoritesCount(data.data.total)
        } else {
          // If API returns error but user is logged in, show 0 instead of error
          console.warn('Favorites API returned error:', data.message)
          setFavoritesCount(0)
        }
      } catch (err) {
        console.error('Error fetching favorites stats:', err)
        // Set count to 0 instead of showing error to user
        setFavoritesCount(0)
        setError(null) // Don't show error to user
      } finally {
        setLoading(false)
      }
    }

    fetchFavoritesStats()
  }, [user?.id, isLoggedIn, token])

  return { favoritesCount, loading, error }
}