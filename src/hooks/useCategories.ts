import { useState, useEffect } from 'react';
import { Category } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

// 全局缓存机制 - 避免重复调用 /api/home/categories
let categoriesCache: { 
  featured: { data: Category[]; timestamp: number } | null;
  all: { data: Category[]; timestamp: number } | null;
} = { featured: null, all: null }

let pendingCategoriesRequests: {
  featured: Promise<Category[]> | null;
  all: Promise<Category[]> | null;
} = { featured: null, all: null }

const CATEGORIES_CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

export const useCategories = (featuredOnly: boolean = false) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取分类数据 - 添加缓存机制
  const fetchCategories = async (): Promise<Category[]> => {
    const cacheKey = featuredOnly ? 'featured' : 'all'
    
    console.log(`🏷️ fetchCategories: 获取${featuredOnly ? '热门' : '全部'}分类数据`)
    
    try {
      // 检查缓存是否有效
      const cache = categoriesCache[cacheKey]
      if (cache && Date.now() - cache.timestamp < CATEGORIES_CACHE_DURATION) {
        console.log(`🎯 useCategories: 使用缓存的${featuredOnly ? '热门' : '全部'}分类数据`)
        return cache.data
      }

      // 如果有正在进行的请求，等待该请求完成
      const pendingRequest = pendingCategoriesRequests[cacheKey]
      if (pendingRequest) {
        console.log(`⏳ useCategories: 等待正在进行的${featuredOnly ? '热门' : '全部'}分类请求`)
        return await pendingRequest
      }

      // 创建新的请求
      const endpoint = featuredOnly ? '/home/categories' : '/categories'
      
      pendingCategoriesRequests[cacheKey] = (async () => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      console.log(`📡 fetchCategories: 响应状态: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log(`📦 fetchCategories: API响应:`, result)
      console.log(`📊 fetchCategories: 数据数量: ${result.data?.length || 0}`)
      
      if (result.code === 200 && result.data) {
        // 转换数据格式以匹配前端类型
        const transformedCategories = result.data.map((category: any) => ({
          id: category.id,
          name: category.name,
          key: category.key,
          image: category.image,
          icon: category.icon,
          color: category.color,
          description: category.description,
          product_count: typeof category.productCount === 'number' ? category.productCount : 0,
          is_featured: category.isFeatured === true,
          sort_order: category.sortOrder || 0,
          is_active: category.isActive === true,
          media_type: category.mediaType || 'image',
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        }))
        
          // 缓存结果
          categoriesCache[cacheKey] = {
            data: transformedCategories,
            timestamp: Date.now()
          }

          console.log(`✅ fetchCategories: ${featuredOnly ? '热门' : '全部'}分类数据获取成功`)
          return transformedCategories
        } else {
          console.error('API Error:', result.message)
          throw new Error(result.message || '获取分类失败')
        }
      })()

      try {
        const result = await pendingCategoriesRequests[cacheKey]!
        return result
      } finally {
        // 清除pending请求状态
        pendingCategoriesRequests[cacheKey] = null
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      pendingCategoriesRequests[cacheKey] = null
      throw error
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取分类失败'
      setError(errorMessage);
      
      // 使用默认的分类数据作为备用方案
      const defaultCategories: Category[] = [
        {
          id: '1',
          name: '智能手机',
          key: 'phone',
          image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=300',
          icon: '📱',
          color: 'from-blue-400 to-blue-600',
          description: '智能手机',
          product_count: 120,
          is_featured: true,
          sort_order: 1,
          is_active: true,
          media_type: 'image',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: '笔记本电脑',
          key: 'computer',
          image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=300',
          icon: '💻',
          color: 'from-purple-400 to-purple-600',
          description: '笔记本电脑',
          product_count: 85,
          is_featured: true,
          sort_order: 2,
          is_active: true,
          media_type: 'image',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        // ... 可以继续添加更多默认分类
      ];
      
      const filteredCategories = featuredOnly 
        ? defaultCategories.filter(cat => cat.is_featured)
        : defaultCategories;
      
      setCategories(filteredCategories);
    } finally {
      setLoading(false);
    }
  };

  // 获取单个分类
  const getCategoryByKey = async (key: string): Promise<Category | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${key}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        const category = result.data
        return {
          id: category.id,
          name: category.name,
          key: category.key,
          image: category.image,
          icon: category.icon,
          color: category.color,
          description: category.description,
          product_count: typeof category.productCount === 'number' ? category.productCount : 0,
          is_featured: category.isFeatured === true,
          sort_order: category.sortOrder || 0,
          is_active: category.isActive === true,
          media_type: category.mediaType || 'image',
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        }
      }

      return null
    } catch (error: any) {
      console.error('Error fetching category:', error);
      return null;
    }
  };

  // 计算分类的实际商品数量 (已由Java API处理，保留接口兼容性)
  const calculateActualProductCount = async (categories: Category[]) => {
    // Java API已经计算了商品数量，直接返回
    return categories;
  };

  const updateProductCount = async (categoryKey: string, count: number) => {
    try {
      // 这个方法在Java API中暂不实现，保留接口兼容性
      console.log(`updateProductCount called for ${categoryKey} with count ${count}`)
      
      // 更新本地状态
      setCategories(prev => 
        prev.map(cat => 
          cat.key === categoryKey 
            ? { ...cat, product_count: count }
            : cat
        )
      );
    } catch (error: any) {
      console.error('Error updating product count:', error);
    }
  };

  // 获取热门分类（直接查询categories表）
  const getFeaturedCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/home/categories`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Error fetching featured categories, fallback to normal fetch');
        return fetchCategories();
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        // 转换数据格式以匹配前端类型
        const transformedCategories = result.data.map((category: any) => ({
          id: category.id,
          name: category.name,
          key: category.key,
          image: category.image,
          icon: category.icon,
          color: category.color,
          description: category.description,
          product_count: typeof category.productCount === 'number' ? category.productCount : 0,
          is_featured: category.isFeatured === true,
          sort_order: category.sortOrder || 0,
          is_active: category.isActive === true,
          media_type: category.mediaType || 'image',
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        }))
        
        setCategories(transformedCategories)
      } else {
        console.error('API Error:', result.message)
        return fetchCategories();
      }
    } catch (error: any) {
      console.error('Error fetching featured categories:', error);
      setError(error.message || '获取热门分类失败');
      // 回退到普通的获取分类方法
      return fetchCategories();
    } finally {
      setLoading(false);
    }
  };

  // 搜索分类
  const searchCategories = async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);

      // Java API暂不支持搜索，使用现有数据进行前端过滤
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        // 前端搜索过滤
        const allCategories = result.data.map((category: any) => ({
          id: category.id,
          name: category.name,
          key: category.key,
          image: category.image,
          icon: category.icon,
          color: category.color,
          description: category.description,
          product_count: typeof category.productCount === 'number' ? category.productCount : 0,
          is_featured: category.isFeatured === true,
          sort_order: category.sortOrder || 0,
          is_active: category.isActive === true,
          media_type: category.mediaType || 'image',
          created_at: category.createdAt,
          updated_at: category.updatedAt,
        }))
        
        // 前端搜索过滤
        const filteredCategories = allCategories.filter((category: Category) => 
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        
        setCategories(filteredCategories)
      } else {
        throw new Error(result.message || '搜索分类失败')
      }
    } catch (error: any) {
      console.error('Error searching categories:', error);
      setError(error.message || '搜索分类失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取分类统计信息
  const getCategoryStats = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('is_active, is_featured')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        featured: data?.filter(cat => cat.is_featured).length || 0,
        active: data?.length || 0
      };

      return stats;
    } catch (error: any) {
      console.error('Error fetching category stats:', error);
      return { total: 0, featured: 0, active: 0 };
    }
  };

  // 格式化商品数量显示
  const formatProductCount = (count: number): string => {
    // 处理无效值 - 更宽松的处理
    if (count === null || count === undefined) {
      console.log('🔍 formatProductCount: count is null/undefined, showing default');
      return '0 件商品';
    }
    
    // 转换为数字
    const numCount = Number(count);
    if (isNaN(numCount) || numCount < 0) {
      console.log('🔍 formatProductCount: invalid count value:', count);
      return '0 件商品';
    }
    
    if (numCount === 0) return '0 件商品';
    if (numCount < 10) return `${numCount} 件商品`;
    if (numCount < 100) return `${numCount}+ 商品`;
    return `${Math.floor(numCount / 10) * 10}+ 商品`;
  };

  // 获取分类的完整显示信息
  const getCategoryDisplayInfo = (category: Category) => {
    return {
      ...category,
      displayCount: formatProductCount(category.product_count),
      hasProducts: category.product_count > 0,
      isPopular: category.product_count > 50
    };
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (featuredOnly) {
          await getFeaturedCategories();
        } else {
          const categoriesData = await fetchCategories();
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [featuredOnly]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getCategoryByKey,
    updateProductCount,
    getFeaturedCategories,
    searchCategories,
    getCategoryStats,
    formatProductCount,
    getCategoryDisplayInfo,
    refetch: fetchCategories
  };
};