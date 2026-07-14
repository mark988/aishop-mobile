// 用户行为数据收集服务
import { supabase } from '../lib/supabase';

export interface UserBehaviorData {
  user_id?: string;
  ip_address: string;
  operating_system: string;
  browser: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  screen_resolution: string;
  network_status: string;
  location_coordinates?: {
    latitude: number;
    longitude: number;
  };
  page_stay_time: number; // 页面停留时间（秒）
  click_actions: ClickAction[];
  shopping_cart_items: number;
  page_url: string;
  referrer: string;
  timestamp: string;
}

export interface ClickAction {
  element_type: string;
  element_id?: string;
  element_class?: string;
  action_type: 'click' | 'scroll' | 'hover' | 'focus';
  timestamp: string;
  coordinates: {
    x: number;
    y: number;
  };
}

class UserBehaviorService {
  private startTime: number = Date.now();
  private clickActions: ClickAction[] = [];
  private isTracking: boolean = false;

  // 获取用户IP地址
  private async getIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Failed to get IP address:', error);
      return 'unknown';
    }
  }

  // 检测操作系统
  private getOperatingSystem(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    
    return 'Unknown';
  }

  // 检测浏览器
  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  // 检测设备类型
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (screenWidth > 768) return 'tablet';
      return 'mobile';
    }
    
    if (screenWidth <= 768) return 'mobile';
    if (screenWidth <= 1024) return 'tablet';
    return 'desktop';
  }

  // 获取屏幕分辨率
  private getScreenResolution(): string {
    return `${window.screen.width}x${window.screen.height}`;
  }

  // 获取网络状态
  private getNetworkStatus(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  // 获取地理位置
  private async getLocationCoordinates(): Promise<{ latitude: number; longitude: number } | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Failed to get location:', error);
          resolve(undefined);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  // 获取购物车商品数量
  private getShoppingCartItems(): number {
    try {
      const cartData = localStorage.getItem('shopping-cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        return cart.items?.length || 0;
      }
    } catch (error) {
      console.warn('Failed to get cart items:', error);
    }
    return 0;
  }

  // 开始追踪用户行为
  public startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.startTime = Date.now();
    this.clickActions = [];

    // 监听点击事件
    document.addEventListener('click', this.handleClick.bind(this));
    
    // 监听滚动事件
    document.addEventListener('scroll', this.handleScroll.bind(this));
    
    // 监听鼠标悬停事件
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    
    // 监听焦点事件
    document.addEventListener('focus', this.handleFocus.bind(this), true);
  }

  // 停止追踪
  public stopTracking(): void {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    document.removeEventListener('click', this.handleClick.bind(this));
    document.removeEventListener('scroll', this.handleScroll.bind(this));
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('focus', this.handleFocus.bind(this), true);
  }

  // 处理点击事件
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    this.clickActions.push({
      element_type: target.tagName.toLowerCase(),
      element_id: target.id || undefined,
      element_class: target.className || undefined,
      action_type: 'click',
      timestamp: new Date().toISOString(),
      coordinates: {
        x: event.clientX,
        y: event.clientY
      }
    });
  }

  // 处理滚动事件
  private handleScroll(): void {
    this.clickActions.push({
      element_type: 'window',
      action_type: 'scroll',
      timestamp: new Date().toISOString(),
      coordinates: {
        x: window.scrollX,
        y: window.scrollY
      }
    });
  }

  // 处理鼠标悬停事件
  private handleMouseOver(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // 只记录重要元素的悬停
    if (target.tagName.toLowerCase() === 'button' || 
        target.tagName.toLowerCase() === 'a' ||
        target.classList.contains('product-card')) {
      
      this.clickActions.push({
        element_type: target.tagName.toLowerCase(),
        element_id: target.id || undefined,
        element_class: target.className || undefined,
        action_type: 'hover',
        timestamp: new Date().toISOString(),
        coordinates: {
          x: event.clientX,
          y: event.clientY
        }
      });
    }
  }

  // 处理焦点事件
  private handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    this.clickActions.push({
      element_type: target.tagName.toLowerCase(),
      element_id: target.id || undefined,
      element_class: target.className || undefined,
      action_type: 'focus',
      timestamp: new Date().toISOString(),
      coordinates: {
        x: 0,
        y: 0
      }
    });
  }

  // 收集并保存用户行为数据
  public async collectAndSave(userId?: string): Promise<boolean> {
    try {
      const behaviorData: UserBehaviorData = {
        user_id: userId,
        ip_address: await this.getIPAddress(),
        operating_system: this.getOperatingSystem(),
        browser: this.getBrowser(),
        device_type: this.getDeviceType(),
        screen_resolution: this.getScreenResolution(),
        network_status: this.getNetworkStatus(),
        location_coordinates: await this.getLocationCoordinates(),
        page_stay_time: Math.floor((Date.now() - this.startTime) / 1000),
        click_actions: this.clickActions,
        shopping_cart_items: this.getShoppingCartItems(),
        page_url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      };

      // 保存到数据库
      const { error } = await supabase
        .from('user_behavior_logs')
        .insert([behaviorData]);

      if (error) {
        console.error('Failed to save user behavior data:', error);
        return false;
      }

      console.log('User behavior data saved successfully');
      return true;

    } catch (error) {
      console.error('Error collecting user behavior data:', error);
      return false;
    }
  }

  // 获取页面停留时间
  public getPageStayTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // 获取点击行为数量
  public getClickActionsCount(): number {
    return this.clickActions.length;
  }
}

// 导出单例实例
export const userBehaviorService = new UserBehaviorService();