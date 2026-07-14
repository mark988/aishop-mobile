import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HeroBanner } from '../types';

export const useHeroBanners = () => {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取轮播图数据
  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching hero banners:', error);
        
        // 如果数据库查询失败，使用默认轮播图数据
        if (error.code === '42P01' || error.code === '42501' || error.message?.includes('relation "hero_banners" does not exist')) {
          console.log('Hero banners table not found or permission denied, using default banners');
        }
        
        // 使用默认的轮播图数据作为备用方案
        const defaultBanners: HeroBanner[] = [
          {
            id: '1',
            title: 'iPhone 15 Pro Max',
            subtitle: 'Revolutionary Camera System',
            description: 'Experience the most advanced iPhone camera ever',
            type: 'video',
            video: 'https://www.w3schools.com/html/mov_bbb.mp4',
            poster: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400',
            image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400',
            price: '¥1,199',
            original_price: '¥1,299',
            discount: 'Save ¥100',
            cta_text: 'Shop Now',
            cta_link: '/products?category=phone',
            is_active: true,
            sort_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            title: 'MacBook Pro 16"',
            subtitle: 'Supercharged by M3 Pro',
            description: 'The most powerful MacBook Pro ever built',
            type: 'image',
            image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400',
            price: '¥2,499',
            original_price: '¥2,699',
            discount: 'Limited Offer',
            cta_text: 'Learn More',
            cta_link: '/products?category=computer',
            is_active: true,
            sort_order: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '3',
            title: 'AirPods Pro',
            subtitle: 'Adaptive Audio Technology',
            description: 'Immersive sound with intelligent noise control',
            type: 'image',
            image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=400',
            price: '¥249',
            original_price: '¥299',
            discount: '20% OFF',
            cta_text: 'Buy Now',
            cta_link: '/products?category=accessories',
            is_active: true,
            sort_order: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        setBanners(defaultBanners);
      } else {
        // 处理数据，确保所有必要字段都有默认值
        const processedData = (data || []).map(banner => ({
          ...banner,
          type: banner.type || 'image',
          is_active: banner.is_active !== false,
          sort_order: banner.sort_order || 0,
          created_at: banner.created_at || new Date().toISOString(),
          updated_at: banner.updated_at || new Date().toISOString()
        }));
        
        setBanners(processedData);
      }
    } catch (error: any) {
      console.error('Error fetching hero banners:', error);
      setError(error.message || '获取轮播图失败');
      // 作为最后的备用方案，设置空数组
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取单个轮播图
  const getBannerById = async (id: string): Promise<HeroBanner | null> => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching banner:', error);
      return null;
    }
  };

  // 创建轮播图
  const createBanner = async (banner: Omit<HeroBanner, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .insert([{
          ...banner,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 刷新列表
      await fetchBanners();
      return data;
    } catch (error: any) {
      console.error('Error creating banner:', error);
      throw error;
    }
  };

  // 更新轮播图
  const updateBanner = async (id: string, updates: Partial<HeroBanner>) => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 刷新列表
      await fetchBanners();
      return data;
    } catch (error: any) {
      console.error('Error updating banner:', error);
      throw error;
    }
  };

  // 删除轮播图
  const deleteBanner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // 刷新列表
      await fetchBanners();
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  };

  // 切换轮播图状态
  const toggleBannerStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // 刷新列表
      await fetchBanners();
    } catch (error: any) {
      console.error('Error toggling banner status:', error);
      throw error;
    }
  };

  // 获取轮播图统计
  const getBannerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('is_active, type');

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        active: data?.filter(banner => banner.is_active).length || 0,
        inactive: data?.filter(banner => !banner.is_active).length || 0,
        videos: data?.filter(banner => banner.type === 'video').length || 0,
        images: data?.filter(banner => banner.type === 'image').length || 0
      };

      return stats;
    } catch (error: any) {
      console.error('Error fetching banner stats:', error);
      return { total: 0, active: 0, inactive: 0, videos: 0, images: 0 };
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return {
    banners,
    loading,
    error,
    fetchBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    getBannerStats,
    refetch: fetchBanners
  };
};