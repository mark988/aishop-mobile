import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, MapPin, Camera, Save, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { profileService, UserProfile, UserProfileUpdate } from '../services/profileService'
import toast from 'react-hot-toast'

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user, refreshAuth } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })

  // 获取用户资料
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const profileData = await profileService.getUserProfile()
        setProfile(profileData)
        setFormData({
          name: profileData.name || '',
          phone: profileData.phone || '',
          email: profileData.email || '',
          address: profileData.address || ''
        })
      } catch (error) {
        console.error('获取用户资料失败:', error)
        toast.error('获取用户资料失败')
        // 使用当前用户信息作为备选
        if (user) {
          setFormData({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            address: user.address || ''
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入姓名')
      return
    }

    if (!formData.email.trim()) {
      toast.error('请输入邮箱')
      return
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('请输入有效的邮箱地址')
      return
    }

    if (!formData.phone.trim()) {
      toast.error('请输入手机号')
      return
    }

    // 简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(formData.phone)) {
      toast.error('请输入有效的手机号')
      return
    }

    setSaving(true)
    try {
      const updateData: UserProfileUpdate = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim()
      }

      await profileService.updateUserProfile(updateData)
      toast.success('个人信息更新成功')
      
      // 刷新认证状态以更新用户信息
      if (refreshAuth) {
        refreshAuth()
      }
      
      navigate('/profile')
    } catch (error: any) {
      console.error('更新个人信息失败:', error)
      toast.error(error.message || '更新失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="flex items-center px-4 py-4">
            <button 
              onClick={() => navigate('/profile')}
              className="mr-3 p-1"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">个人信息</h1>
          </div>
        </div>

        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/profile')}
              className="mr-3 p-1"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">个人信息</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存
              </>
            )}
          </button>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="bg-white mt-2">
        <div className="px-4 py-6">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name || profile.email}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-primary-600" />
                </div>
              )}
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-sm text-gray-500">点击更换头像</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white mt-2">
        <div className="px-4 py-6 space-y-6">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              姓名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="请输入您的姓名"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              手机号 *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="请输入您的手机号"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              邮箱 *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="请输入您的邮箱"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          {/* 地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              地址
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="请输入您的地址"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 mx-4 mt-4 p-4 rounded-lg">
        <p className="text-sm text-blue-600">
          <span className="font-medium">提示：</span>
          标有 * 的字段为必填项。请确保信息准确，以便我们为您提供更好的服务。
        </p>
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  )
}