import { useState, useEffect } from 'react'
import { profileService, UserProfile, UserProfileUpdate } from '../services/profileService'
import { useAuth } from '../contexts/AuthContext'

export const useProfile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    
    try {
      const profileData = await profileService.getUserProfile()
      setProfile(profileData)
    } catch (err: any) {
      console.error('获取用户资料失败:', err)
      setError(err.message || '获取用户资料失败')
      
      // 使用当前用户信息作为备选
      if (user) {
        setProfile({
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'customer',
          address: user.address || '',
          avatarUrl: user.avatarUrl || '',
          createdAt: user.createdAt || new Date().toISOString()
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updateData: UserProfileUpdate): Promise<UserProfile> => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedProfile = await profileService.updateUserProfile(updateData)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err: any) {
      console.error('更新用户资料失败:', err)
      setError(err.message || '更新用户资料失败')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (avatarFile: File): Promise<string> => {
    setLoading(true)
    setError(null)
    
    try {
      const avatarUrl = await profileService.uploadUserAvatar(avatarFile)
      
      // 更新profile中的头像URL
      if (profile) {
        setProfile({
          ...profile,
          avatarUrl
        })
      }
      
      return avatarUrl
    } catch (err: any) {
      console.error('上传头像失败:', err)
      setError(err.message || '上传头像失败')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar
  }
}