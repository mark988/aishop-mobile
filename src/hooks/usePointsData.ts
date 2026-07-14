import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

interface PointsData {
  id: string
  userId: string
  points: number
  currentPoints: number
  totalEarned: number
  totalSpent: number
  level: string
  createdAt: string
  updatedAt: string
}

export const usePointsData = () => {
  const { user, isLoggedIn } = useAuth()
  const [pointsData, setPointsData] = useState<PointsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPointsData = async () => {
    if (!user?.id || !isLoggedIn) {
      setPointsData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/points/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch points data')
      }
      
      const result = await response.json()
      if (result.code === 200) {
        setPointsData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch points data')
      }
    } catch (err) {
      console.error('Error fetching points data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch points data')
      setPointsData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPointsData()
  }, [user?.id, isLoggedIn])

  const refetch = () => {
    fetchPointsData()
  }

  return {
    pointsData,
    loading,
    error,
    refetch
  }
}