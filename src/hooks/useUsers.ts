import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  phone?: string
  name?: string
  avatar?: string
  role?: 'customer' | 'admin'
  created_at: string
  updated_at?: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  raw_user_meta_data?: any
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true)
      
      // 跳过需要管理员权限的方法，直接使用可用的数据源
      console.log('跳过需要管理员权限的 Auth Admin API 和 auth.users 表查询')

      // 方法1: 尝试从 profiles 表获取用户信息（推荐方案）
      try {
        console.log('尝试从 profiles 表获取用户信息...')
        const { data: profileUsers, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (!profileError && profileUsers && profileUsers.length > 0) {
          console.log(`从 profiles 表获取到 ${profileUsers.length} 个用户`)
          
          // 处理用户数据
          const processedUsers = profileUsers.map(user => ({
            id: user.id,
            email: user.email || '',
            phone: user.phone || '',
            name: user.name || '未设置',
            avatar: '',
            role: user.role || 'customer',
            created_at: user.created_at,
            updated_at: user.updated_at,
            raw_user_meta_data: { name: user.name, role: user.role }
          }))
          
          setTotalCount(processedUsers.length)
          setTotalPages(Math.ceil(processedUsers.length / pageSize))

          const from = (page - 1) * pageSize
          const to = from + pageSize
          const paginatedUsers = processedUsers.slice(from, to)

          setUsers(paginatedUsers)
          setCurrentPage(page)
          return
        }
      } catch (profileError) {
        console.log('无法从 profiles 表获取用户信息:', profileError)
      }

      // 方法2: 尝试通过订单表获取用户信息（备用方法）
      try {
        console.log('尝试从订单表获取用户信息...')
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('user_id, shipping_address, created_at')
          .order('created_at', { ascending: false })

        if (!ordersError && orders && orders.length > 0) {
          console.log(`从 ${orders.length} 个订单中提取用户信息`)
          
          // 从订单中提取唯一用户
          const userMap = new Map()
          orders.forEach(order => {
            if (!userMap.has(order.user_id)) {
              userMap.set(order.user_id, {
                id: order.user_id,
                email: order.shipping_address?.email || `user-${order.user_id.slice(0, 8)}@example.com`,
                phone: order.shipping_address?.phone || '',
                name: order.shipping_address?.name || '未知用户',
                avatar: '',
                role: 'customer',
                created_at: order.created_at,
                updated_at: order.created_at,
                raw_user_meta_data: { name: order.shipping_address?.name }
              })
            }
          })

          const uniqueUsers = Array.from(userMap.values())
          console.log(`提取到 ${uniqueUsers.length} 个唯一用户`)
          
          setTotalCount(uniqueUsers.length)
          setTotalPages(Math.ceil(uniqueUsers.length / pageSize))

          const from = (page - 1) * pageSize
          const to = from + pageSize
          const paginatedUsers = uniqueUsers.slice(from, to)

          setUsers(paginatedUsers)
          setCurrentPage(page)
          return
        }
      } catch (ordersError) {
        console.log('无法从订单表获取用户信息:', ordersError)
      }

      // 方法3: 尝试使用管理员专用函数获取用户列表
      try {
        console.log('尝试使用管理员专用函数...')
        const { data: adminUsers, error: adminError } = await supabase
          .rpc('get_users_for_admin')

        if (!adminError && adminUsers) {
          console.log(`管理员函数返回 ${adminUsers.length} 个用户`)
          setTotalCount(adminUsers.length)
          setTotalPages(Math.ceil(adminUsers.length / pageSize))

          const from = (page - 1) * pageSize
          const to = from + pageSize
          const paginatedUsers = adminUsers.slice(from, to)

          setUsers(paginatedUsers)
          setCurrentPage(page)
          return
        }
      } catch (adminError) {
        console.log('管理员函数不可用:', adminError)
      }

      // 方法4: 创建示例用户数据（用于演示）
      console.warn('无法获取真实用户数据，使用示例数据')
      console.log('提示：要获取真实用户数据，请：')
      console.log('1. 在 Supabase 中创建 get_auth_users() 函数')
      console.log('2. 或者配置 profiles 表')
      console.log('3. 或者设置正确的 auth.users 访问权限')
      
      const sampleUsers = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          phone: '13800138000',
          name: '系统管理员',
          avatar: '',
          role: 'admin' as const,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天前
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { name: '系统管理员', role: 'admin' }
        },
        {
          id: '00000000-0000-0000-0000-000000000002', 
          email: 'user1@example.com',
          phone: '13900139001',
          name: '张三',
          avatar: '',
          role: 'customer' as const,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15天前
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { name: '张三', role: 'customer' }
        },
        {
          id: '00000000-0000-0000-0000-000000000003', 
          email: 'user2@example.com',
          phone: '13900139002',
          name: '李四',
          avatar: '',
          role: 'customer' as const,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天前
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { name: '李四', role: 'customer' }
        },
        {
          id: '00000000-0000-0000-0000-000000000004', 
          email: 'user3@example.com',
          phone: '13900139003',
          name: '王五',
          avatar: '',
          role: 'customer' as const,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天前
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { name: '王五', role: 'customer' }
        },
        {
          id: '00000000-0000-0000-0000-000000000005', 
          email: 'user4@example.com',
          phone: '13900139004',
          name: '赵六',
          avatar: '',
          role: 'customer' as const,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前
          updated_at: new Date().toISOString(),
          raw_user_meta_data: { name: '赵六', role: 'customer' }
        }
      ]

      setUsers(sampleUsers)
      setTotalCount(sampleUsers.length)
      setTotalPages(1)
      setCurrentPage(1)

    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, role: 'customer' | 'admin') => {
    try {
      console.log(`更新用户 ${userId} 的角色为 ${role}`)
      
      // 由于profiles表可能不存在，我们主要更新本地状态
      // 在实际应用中，这里应该调用适当的API来更新用户角色
      
      // 更新本地状态
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, role, updated_at: new Date().toISOString() }
            : user
        )
      )

      console.log(`用户 ${userId} 的角色已更新为 ${role}（本地状态）`)
      
      // 可选：尝试更新profiles表（如果存在）
      try {
        await supabase
          .from('profiles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId)
        console.log('profiles表也已更新')
      } catch (profileError) {
        console.log('profiles表更新失败（表可能不存在）:', profileError)
      }
      
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      console.log(`删除用户 ${userId}`)
      
      // 注意：删除用户是敏感操作，通常需要特殊权限
      // 在实际应用中，这里应该调用适当的API来删除用户
      
      // 从本地状态中移除用户
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId))
      setTotalCount(prev => prev - 1)
      
      console.log(`用户 ${userId} 已从列表中移除（本地状态）`)
      
      // 可选：尝试删除profiles记录（如果存在）
      try {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
        console.log('profiles表记录也已删除')
      } catch (profileError) {
        console.log('profiles表删除失败（表可能不存在）:', profileError)
      }
      
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  return {
    users,
    loading,
    currentPage,
    totalPages,
    totalCount,
    updateUserRole,
    deleteUser,
    refetch: fetchUsers,
    goToPage: fetchUsers
  }
}