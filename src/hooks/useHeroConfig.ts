import { useState, useEffect } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface HeroBanner {
  id: string;
  title: string;
  description?: string;
  image: string;
  video?: string;
  poster?: string;
  type: 'image' | 'video';
  price?: string;
  original_price?: string;
  discount?: string;
  cta_text?: string;
  cta_link?: string;
  sort_order: number;
  is_active: boolean;
}

export interface HeroConfig {
  id: string;
  badge_text: string;
  title: string;
  subtitle: string;
  stat_users_count: string;
  stat_users_label: string;
  stat_products_count: string;
  stat_products_label: string;
  stat_rating_count: string;
  stat_rating_label: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link: string;
  trust_indicator_1_text: string;
  trust_indicator_1_icon: string;
  trust_indicator_2_text: string;
  trust_indicator_2_icon: string;
  trust_indicator_3_text: string;
  trust_indicator_3_icon: string;
  banners: HeroBanner[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useHeroConfig = () => {
  const [heroConfig, setHeroConfig] = useState<HeroConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取Hero配置和轮播图
  const fetchHeroConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行获取Hero配置和轮播图
      const [heroResponse, bannersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/home/hero-config`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/home/hero-banners`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
      ]);

      let heroData = null;
      let bannersData: HeroBanner[] = [];

      // 处理Hero配置
      if (heroResponse.ok) {
        const heroResult = await heroResponse.json();
        if (heroResult.code === 200 && heroResult.data) {
          heroData = heroResult.data;
        }
      } else {
        console.error('Error fetching hero config:', heroResponse.status);
      }

      // 处理轮播图数据
      if (bannersResponse.ok) {
        const bannersResult = await bannersResponse.json();
        if (bannersResult.code === 200 && bannersResult.data) {
          bannersData = bannersResult.data.map((banner: any) => ({
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
        }
      } else {
        console.error('Error fetching banners:', bannersResponse.status);
      }

      // 创建完整的Hero配置
      const completeHeroConfig: HeroConfig = {
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
        banners: bannersData,
        is_active: heroData?.is_active !== false,
        created_at: heroData?.created_at || new Date().toISOString(),
        updated_at: heroData?.updated_at || new Date().toISOString()
      };

      setHeroConfig(completeHeroConfig);
    } catch (error: any) {
      console.error('Error fetching hero config:', error);
      setError(error.message || '获取Hero配置失败');
      
      // 作为最后的备用方案，设置默认配置
      const defaultConfig: HeroConfig = {
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
      };
      
      setHeroConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroConfig();
  }, []);

  return {
    heroConfig,
    loading,
    error,
    fetchHeroConfig,
    refetch: fetchHeroConfig
  };
};