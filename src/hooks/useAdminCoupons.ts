import { useState, useEffect } from 'react'
import { couponService, CouponTemplate, CouponDistribution } from '../services/couponService'
import { Coupon } from '../types'
import toast from 'react-hot-toast'

export const useAdminCoupons = () => {
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [userCoupons, setUserCoupons] = useState<(Coupon & { user_email?: string })[]>([])
  const [distributions, setDistributions] = useState<CouponDistribution[]>([])
  const [loading, setLoading] = useState(true)

  // 获取优惠券模板
  const fetchTemplates = async () => {
    try {
      const data = await couponService.getCouponTemplates()
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('获取优惠券模板失败')
    }
  }

  // 获取所有用户优惠券
  const fetchUserCoupons = async () => {
    try {
      const data = await couponService.getAllUserCoupons()
      setUserCoupons(data)
    } catch (error) {
      console.error('Error fetching user coupons:', error)
      toast.error('获取用户优惠券失败')
    }
  }

  // 获取发放记录
  const fetchDistributions = async () => {
    try {
      const data = await couponService.getCouponDistributions()
      setDistributions(data)
    } catch (error) {
      console.error('Error fetching distributions:', error)
      toast.error('获取发放记录失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchTemplates(),
          fetchUserCoupons(),
          fetchDistributions()
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 创建优惠券模板
  const createTemplate = async (template: Omit<CouponTemplate, 'id' | 'created_at' | 'updated_at' | 'used_quantity'>) => {
    try {
      // 检查代码是否已存在
      const codeExists = await couponService.checkCouponCodeExists(template.code)
      if (codeExists) {
        toast.error('优惠券代码已存在')
        return false
      }

      await couponService.createCouponTemplate(template)
      await fetchTemplates()
      toast.success('优惠券模板创建成功')
      return true
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('创建优惠券模板失败')
      return false
    }
  }

  // 更新优惠券模板
  const updateTemplate = async (id: string, updates: Partial<CouponTemplate>) => {
    try {
      // 如果更新代码，检查是否已存在
      if (updates.code) {
        const codeExists = await couponService.checkCouponCodeExists(updates.code, id)
        if (codeExists) {
          toast.error('优惠券代码已存在')
          return false
        }
      }

      await couponService.updateCouponTemplate(id, updates)
      await fetchTemplates()
      toast.success('优惠券模板更新成功')
      return true
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('更新优惠券模板失败')
      return false
    }
  }

  // 删除优惠券模板
  const deleteTemplate = async (id: string) => {
    try {
      await couponService.deleteCouponTemplate(id)
      await fetchTemplates()
      toast.success('优惠券模板删除成功')
      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('删除优惠券模板失败')
      return false
    }
  }

  // 发放优惠券给所有用户
  const distributeToAllUsers = async (templateId: string) => {
    try {
      const count = await couponService.distributeCouponToAllUsers(templateId)
      
      // 获取所有用户ID发送通知
      const template = templates.find(t => t.id === templateId)
      if (template) {
        // 这里简化处理，实际应该获取所有用户ID
        await couponService.sendCouponNotification([], template.title)
      }
      
      await Promise.all([fetchTemplates(), fetchUserCoupons(), fetchDistributions()])
      toast.success(`成功发放 ${count} 张优惠券`)
      return true
    } catch (error) {
      console.error('Error distributing to all users:', error)
      toast.error('发放优惠券失败')
      return false
    }
  }

  // 发放优惠券给特定用户
  const distributeToSpecificUsers = async (templateId: string, userIds: string[]) => {
    try {
      const count = await couponService.distributeCouponToSpecificUsers(templateId, userIds)
      
      // 发送通知
      const template = templates.find(t => t.id === templateId)
      if (template) {
        await couponService.sendCouponNotification(userIds, template.title)
      }
      
      await Promise.all([fetchTemplates(), fetchUserCoupons(), fetchDistributions()])
      toast.success(`成功发放 ${count} 张优惠券`)
      return true
    } catch (error) {
      console.error('Error distributing to specific users:', error)
      toast.error('发放优惠券失败')
      return false
    }
  }

  return {
    templates,
    userCoupons,
    distributions,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    distributeToAllUsers,
    distributeToSpecificUsers,
    refreshData: async () => {
      await Promise.all([fetchTemplates(), fetchUserCoupons(), fetchDistributions()])
    }
  }
}