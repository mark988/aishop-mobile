import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface OrderStats {
  pending: number
  processing: number
  shipped: number
  delivered: number
  cancelled: number
  total: number
}

interface OrderItem {
  name: string
  image: string
  price: number
  property?: any
  quantity: number
  productId: string
}

interface Order {
  id: string
  total: number
  status: string
  subtotal: number
  items: OrderItem[]
  userId: string
  createdAt: string
  updatedAt: string
}

interface OrderResponse {
  code: number
  message: string
  data: {
    records: Order[]
    total: number
    size: number
    current: number
    pages: number
  }
}

export function useOrderStats() {
  const { user, isLoggedIn, token } = useAuth()
  const [stats, setStats] = useState<OrderStats>({
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      setStats({
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        total: 0
      })
      return
    }

    const fetchOrderStats = async () => {
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

        const response = await fetch(`${API_BASE_URL}/api/orders/user/${user.id}?page=1&size=100`, {
          method: 'GET',
          headers,
          credentials: 'include' // Include cookies for authentication
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, set stats to 0
            setStats({
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
              cancelled: 0,
              total: 0
            })
            return
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data: OrderResponse = await response.json()
        
        if (data.code === 200) {
          const orders = data.data.records
          const newStats: OrderStats = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            total: orders.length
          }

          orders.forEach(order => {
            switch (order.status) {
              case 'pending':
                newStats.pending++
                break
              case 'processing':
                newStats.processing++
                break
              case 'shipped':
                newStats.shipped++
                break
              case 'delivered':
                newStats.delivered++
                break
              case 'cancelled':
                newStats.cancelled++
                break
            }
          })

          setStats(newStats)
        } else {
          // If API returns error but user is logged in, show 0 instead of error
          console.warn('Orders API returned error:', data.message)
          setStats({
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            total: 0
          })
        }
      } catch (err) {
        console.error('Error fetching order stats:', err)
        // Set stats to 0 instead of showing error to user
        setStats({
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          total: 0
        })
        setError(null) // Don't show error to user
      } finally {
        setLoading(false)
      }
    }

    fetchOrderStats()
  }, [user?.id, isLoggedIn, token])

  return { stats, loading, error }
}