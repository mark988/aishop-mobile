import { useState, useEffect } from 'react';
import { HeroConfig, HeroBanner } from './useHeroConfig';
import { BrandConfig } from './useBrandConfig';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface Category {
  id: string;
  name: string;
  key?: string;
  description?: string;
  image?: string;
  icon?: string;
  color?: string;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
  mediaType?: string;
  productCount?: number;
  product_count?: number; // 添加这个字段以兼容前端组件
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeInitData {
  brandConfig: BrandConfig;
  heroConfig: HeroConfig;
  heroBanners: HeroBanner[];
  categories: Category[];
}

// 全局缓存和防重复请求机制
let homeInitCache: { data: HomeInitData; timestamp: number } | null = null
let pendingHomeInitRequest: Promise<HomeInitData | null> | null = null
const HOME_INIT_CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存

/**
 * 首页初始化数据Hook - 统一获取首页所需的所有配置数据
 * 整合了品牌配置、Hero配置、轮播图、热门分类等数据
 * 减少接口调用次数，提升页面加载性能
 * 添加缓存机制防止重复调用
 */
export const useHomeInit = (shouldFetch: boolean = true) => {
  const [initData, setInitData] = useState<HomeInitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeInitData = async (): Promise<HomeInitData | null> => {
    console.log('🏠 fetchHomeInitData: 开始获取首页初始化数据')
    
    try {
      // 检查缓存是否有效
      if (homeInitCache && 
          Date.now() - homeInitCache.timestamp < HOME_INIT_CACHE_DURATION) {
        console.log('🎯 useHomeInit: 使用缓存的首页数据')
        return homeInitCache.data
      }

      // 如果有正在进行的请求，等待该请求完成
      if (pendingHomeInitRequest) {
        console.log('⏳ useHomeInit: 等待正在进行的首页数据请求')
        return await pendingHomeInitRequest
      }

      // 创建新的请求
      pendingHomeInitRequest = (async () => {
        const response = await fetch(`${API_BASE_URL}/home/init`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.code === 200 && result.data) {
        const data = result.data;
        
        // 处理轮播图数据格式
        const processedBanners: HeroBanner[] = (data.heroBanners || []).map((banner: any) => ({
          id: banner.id,
          title: banner.title,
          description: banner.description,
          image: banner.image,
          video: banner.video,
          poster: banner.poster,
          type: banner.type || 'image',
          price: banner.price,
          original_price: banner.originalPrice,
          discount: banner.discount,
          cta_text: banner.ctaText,
          cta_link: banner.ctaLink,
          sort_order: banner.sortOrder || 0,
          is_active: banner.isActive !== false
        }));

        // 处理Hero配置数据
        const heroData = data.heroConfig;
        const processedHeroConfig: HeroConfig = {
          id: heroData?.id || 'default',
          badge_text: heroData?.badge_text || 'New Arrivals · Limited Offer',
          title: heroData?.title || '发现品质生活，尽在指尖',
          subtitle: heroData?.subtitle || '精选全球好物，为您提供最优质的购物体验。从智能数码到生活家居，一站式满足您的所有需求。',
          stat_users_count: heroData?.stat_users_count || '10K+',
          stat_users_label: heroData?.stat_users_label || 'Happy Users',
          stat_products_count: heroData?.stat_products_count || '500+',
          stat_products_label: heroData?.stat_products_label || 'Products',
          stat_rating_count: heroData?.stat_rating_count || '4.9',
          stat_rating_label: heroData?.stat_rating_label || 'Rating',
          primary_button_text: heroData?.primary_button_text || '开始购物',
          primary_button_link: heroData?.primary_button_link || '/products',
          secondary_button_text: heroData?.secondary_button_text || '了解更多',
          secondary_button_link: heroData?.secondary_button_link || '/about',
          trust_indicator_1_text: heroData?.trust_indicator_1_text || 'Authentic',
          trust_indicator_1_icon: heroData?.trust_indicator_1_icon || 'shield',
          trust_indicator_2_text: heroData?.trust_indicator_2_text || 'Free Ship',
          trust_indicator_2_icon: heroData?.trust_indicator_2_icon || 'truck',
          trust_indicator_3_text: heroData?.trust_indicator_3_text || 'Certified',
          trust_indicator_3_icon: heroData?.trust_indicator_3_icon || 'award',
          banners: processedBanners,
          is_active: heroData?.is_active !== false,
          created_at: heroData?.created_at || new Date().toISOString(),
          updated_at: heroData?.updated_at || new Date().toISOString()
        };

        // 4. 转换分类数据格式 - 修复字段名映射
        const transformedCategories = (data.categories || []).map((category: any) => ({
          id: category.id,
          name: category.name,
          key: category.key,
          image: category.image,
          icon: category.icon,
          color: category.color,
          description: category.description,
          isFeatured: category.isFeatured === true,
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive === true,
          mediaType: category.mediaType || 'image',
          product_count: category.productCount || 0, // 修复字段名映射
          productCount: category.productCount || 0, // 保持兼容性
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        }));

        const homeInitData: HomeInitData = {
          brandConfig: data.brandConfig,
          heroConfig: processedHeroConfig,
          heroBanners: processedBanners,
          categories: transformedCategories
        };

        // 缓存结果
        homeInitCache = {
          data: homeInitData,
          timestamp: Date.now()
        }
        
        console.log('✅ fetchHomeInitData: 首页数据获取成功')
        return homeInitData
      } else {
        throw new Error(result.message || '获取首页初始化数据失败');
      }
      })()

      try {
        const result = await pendingHomeInitRequest
        return result
      } finally {
        // 清除pending请求状态
        pendingHomeInitRequest = null
      }
    } catch (error: any) {
      console.error('Error fetching home init data:', error);
      pendingHomeInitRequest = null
      
      // 设置默认数据作为备用方案
      const defaultInitData: HomeInitData = {
        brandConfig: {
          primaryName: '优选商城',
          secondaryName: 'Premium Mall',
          logoIcon: 'shopping-cart',
          logoColorFrom: '#3B82F6',
          logoColorTo: '#1D4ED8',
          logoType: 'icon',
          logoCustomUrl: ''
        },
        heroConfig: {
          id: 'default',
          badge_text: 'New Arrivals · Limited Offer',
          title: '发现品质生活，尽在指尖',
          subtitle: '精选全球好物，为您提供最优质的购物体验。从智能数码到生活家居，一站式满足您的所有需求。',
          stat_users_count: '10K+',
          stat_users_label: 'Happy Users',
          stat_products_count: '500+',
          stat_products_label: 'Products',
          stat_rating_count: '4.9',
          stat_rating_label: 'Rating',
          primary_button_text: '开始购物',
          primary_button_link: '/products',
          secondary_button_text: '了解更多',
          secondary_button_link: '/about',
          trust_indicator_1_text: 'Authentic',
          trust_indicator_1_icon: 'shield',
          trust_indicator_2_text: 'Free Ship',
          trust_indicator_2_icon: 'truck',
          trust_indicator_3_text: 'Certified',
          trust_indicator_3_icon: 'award',
          banners: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        heroBanners: [],
        categories: []
      };
      
      return defaultInitData
    }
  };

  const loadInitData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchHomeInitData()
      if (data) {
        setInitData(data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取首页初始化数据失败'
      setError(errorMessage)
      
      // 设置默认数据作为备用方案
      const defaultInitData: HomeInitData = {
        brandConfig: {
          primaryName: '优选商城',
          secondaryName: 'Premium Mall',
          logoIcon: 'shopping-cart',
          logoColorFrom: '#3B82F6',
          logoColorTo: '#1D4ED8',
          logoType: 'icon',
          logoCustomUrl: ''
        },
        heroConfig: {
          id: 'default',
          badge_text: 'New Arrivals · Limited Offer',
          title: '发现品质生活，尽在指尖',
          subtitle: '精选全球好物，为您提供最优质的购物体验。从智能数码到生活家居，一站式满足您的所有需求。',
          stat_users_count: '10K+',
          stat_users_label: 'Happy Users',
          stat_products_count: '500+',
          stat_products_label: 'Products',
          stat_rating_count: '4.9',
          stat_rating_label: 'Rating',
          primary_button_text: '开始购物',
          primary_button_link: '/products',
          secondary_button_text: '了解更多',
          secondary_button_link: '/about',
          trust_indicator_1_text: 'Authentic',
          trust_indicator_1_icon: 'shield',
          trust_indicator_2_text: 'Free Ship',
          trust_indicator_2_icon: 'truck',
          trust_indicator_3_text: 'Certified',
          trust_indicator_3_icon: 'award',
          banners: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        heroBanners: [],
        categories: []
      };
      
      setInitData(defaultInitData)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFetch) {
      loadInitData();
    } else {
      setLoading(false);
    }
  }, [shouldFetch]);

  const clearCache = () => {
    homeInitCache = null
  }

  const refreshData = () => {
    clearCache()
    loadInitData()
  }

  return {
    initData,
    loading,
    error,
    refetch: refreshData,
    clearCache
  };
};