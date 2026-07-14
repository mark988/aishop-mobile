/**
 * 网站统计埋点脚本 - 类似 Google Analytics
 * 用于收集用户行为数据和网站访问统计
 */
(function() {
  'use strict';

  // 配置项
  const CONFIG = {
    // 通过 Nginx 代理访问后端，获取真实客户端 IP
    apiEndpoint: '/api/track',
    sessionTimeout: 30 * 60 * 1000, // 30分钟会话超时
    heartbeatInterval: 30 * 1000, // 30秒心跳间隔
    scrollThreshold: [25, 50, 75, 90], // 滚动深度阈值
    clickTracking: true,
    scrollTracking: true,
    performanceTracking: true,
    errorTracking: true
  };

  // 全局变量
  let sessionId = null;
  let userId = null;
  let pageStartTime = Date.now();
  let lastActivityTime = Date.now();
  let scrollDepthReached = [];
  let heartbeatTimer = null;
  let isPageVisible = true;

  /**
   * 生成唯一ID
   */
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 获取或创建会话ID
   */
  function getSessionId() {
    if (sessionId) return sessionId;

    // 尝试从localStorage获取
    const stored = localStorage.getItem('analytics_session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (Date.now() - session.timestamp < CONFIG.sessionTimeout) {
          sessionId = session.id;
          return sessionId;
        }
      } catch (e) {
        console.warn('Invalid session data:', e);
      }
    }

    // 创建新会话
    sessionId = generateId();
    localStorage.setItem('analytics_session', JSON.stringify({
      id: sessionId,
      timestamp: Date.now()
    }));

    return sessionId;
  }

  /**
   * 获取用户ID（如果已登录）
   */
  function getUserId() {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id || null;
      }
    } catch (e) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 获取设备和浏览器信息
   */
  function getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine
    };
  }

  /**
   * 获取购物车商品数量
   */
  function getShoppingCartItems() {
    try {
      // 尝试获取已登录用户的购物车
      const userId = getUserId();
      let cartData = null;

      if (userId) {
        // 已登录：cart_{userId}
        cartData = localStorage.getItem(`cart_${userId}`);
      }

      // 如果已登录用户没有购物车，或者用户未登录，尝试获取访客购物车
      if (!cartData) {
        cartData = localStorage.getItem('cart_guest');
      }

      if (cartData) {
        const cart = JSON.parse(cartData);
        // 数据本身就是数组
        if (Array.isArray(cart)) {
          return cart.length;
        }
      }
    } catch (e) {
      console.warn('Failed to get shopping cart items:', e);
    }
    return 0;
  }

  /**
   * 获取地理位置坐标（异步）
   */
  function getLocationCoordinates() {
    return new Promise((resolve) => {
      // 检查是否支持地理位置 API
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        resolve(null);
        return;
      }

      // 检查是否是 HTTPS 或 localhost
      const isSecureContext = window.isSecureContext ||
                             window.location.protocol === 'https:' ||
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';

      if (!isSecureContext) {
        console.warn('Geolocation requires HTTPS or localhost. Current protocol:', window.location.protocol);
        resolve(null);
        return;
      }

      console.log('Requesting geolocation permission...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Geolocation permission granted:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let errorMsg = 'Unknown geolocation error';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'User denied the request for Geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = 'The request to get user location timed out';
              break;
          }
          console.warn('Geolocation error:', errorMsg, error);
          resolve(null);
        },
        {
          timeout: 10000,  // 增加超时时间到 10 秒
          enableHighAccuracy: false,
          maximumAge: 300000  // 缓存 5 分钟
        }
      );
    });
  }

  /**
   * 获取页面信息
   */
  function getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      domain: window.location.hostname
    };
  }

  /**
   * 发送数据到后台
   */
  async function sendData(eventType, eventData = {}) {
    // 异步获取地理位置（只在首次页面访问时获取）
    let locationCoordinates = null;
    if (eventType === 'pageview') {
      locationCoordinates = await getLocationCoordinates();
    }

    const data = {
      sessionId: getSessionId(),
      userId: getUserId(),
      timestamp: new Date().toISOString(),
      eventType: eventType,
      page: getPageInfo(),
      device: getDeviceInfo(),
      eventData: eventData,
      // 添加购物车和地理位置数据
      shoppingCartItems: getShoppingCartItems(),
      locationCoordinates: locationCoordinates
    };

    // 使用 sendBeacon 优先，fallback 到 fetch
    const payload = JSON.stringify(data);

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const success = navigator.sendBeacon(CONFIG.apiEndpoint, blob);
      if (!success) {
        // sendBeacon 失败时使用 fetch
        fallbackToFetch(payload);
      }
    } else {
      fallbackToFetch(payload);
    }

    // 调试日志
    console.log('📊 Analytics event sent:', eventType, {
      ...eventData,
      shoppingCartItems: data.shoppingCartItems,
      hasLocation: !!locationCoordinates
    });
  }

  /**
   * Fetch API 备用方案
   */
  function fallbackToFetch(payload) {
    fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload,
      keepalive: true
    }).catch(err => {
      console.warn('Analytics tracking failed:', err);
    });
  }

  /**
   * 页面访问事件
   */
  function trackPageView() {
    const performanceData = {};
    
    if (CONFIG.performanceTracking && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        performanceData.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        performanceData.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        performanceData.firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
        performanceData.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
      }
    }

    sendData('pageview', {
      performance: performanceData,
      timestamp: pageStartTime
    });
  }

  /**
   * 点击事件追踪
   */
  function trackClick(event) {
    if (!CONFIG.clickTracking) return;

    const element = event.target;
    const tagName = element.tagName.toLowerCase();
    
    // 只追踪重要的点击事件
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName) || 
        element.onclick || element.getAttribute('data-track')) {
      
      const clickData = {
        tagName: tagName,
        text: element.textContent?.trim().substring(0, 100) || '',
        href: element.href || '',
        id: element.id || '',
        className: element.className || '',
        dataTrack: element.getAttribute('data-track') || '',
        x: event.clientX,
        y: event.clientY
      };

      sendData('click', clickData);
    }
  }

  /**
   * 滚动深度追踪
   */
  function trackScrollDepth() {
    if (!CONFIG.scrollTracking) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    const viewportHeight = window.innerHeight;
    const scrollPercent = Math.round((scrollTop + viewportHeight) / documentHeight * 100);

    CONFIG.scrollThreshold.forEach(threshold => {
      if (scrollPercent >= threshold && !scrollDepthReached.includes(threshold)) {
        scrollDepthReached.push(threshold);
        sendData('scroll', {
          depth: threshold,
          scrollTop: scrollTop,
          documentHeight: documentHeight,
          viewportHeight: viewportHeight
        });
      }
    });
  }

  /**
   * 页面停留时间追踪
   */
  function trackTimeOnPage() {
    const timeOnPage = Date.now() - pageStartTime;
    sendData('time_on_page', {
      duration: timeOnPage,
      isVisible: isPageVisible
    });
  }

  /**
   * 错误追踪
   */
  function trackError(error, source, lineno, colno, errorObj) {
    if (!CONFIG.errorTracking) return;

    sendData('error', {
      message: error,
      source: source,
      line: lineno,
      column: colno,
      stack: errorObj?.stack || '',
      userAgent: navigator.userAgent
    });
  }

  /**
   * 页面可见性变化追踪
   */
  function handleVisibilityChange() {
    isPageVisible = !document.hidden;
    
    if (isPageVisible) {
      // 页面变为可见
      lastActivityTime = Date.now();
      startHeartbeat();
    } else {
      // 页面变为隐藏
      stopHeartbeat();
      trackTimeOnPage();
    }
  }

  /**
   * 心跳机制 - 定期发送活跃信号
   */
  function startHeartbeat() {
    if (heartbeatTimer) return;
    
    heartbeatTimer = setInterval(() => {
      if (isPageVisible && Date.now() - lastActivityTime < CONFIG.sessionTimeout) {
        sendData('heartbeat', {
          timeOnPage: Date.now() - pageStartTime
        });
      }
    }, CONFIG.heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  /**
   * 用户活动更新
   */
  function updateActivity() {
    lastActivityTime = Date.now();
  }

  /**
   * 页面卸载事件
   */
  function handlePageUnload() {
    stopHeartbeat();
    trackTimeOnPage();
    
    // 发送会话结束事件
    sendData('session_end', {
      totalTime: Date.now() - pageStartTime,
      scrollDepthReached: Math.max(...scrollDepthReached, 0)
    });
  }

  /**
   * 初始化追踪
   */
  function init() {
    // 检查是否已经初始化
    if (window._analyticsInitialized) return;
    window._analyticsInitialized = true;

    console.log('🔍 Analytics tracker initialized');

    // 立即追踪页面访问
    trackPageView();

    // 绑定事件监听器
    document.addEventListener('click', trackClick, true);
    document.addEventListener('scroll', trackScrollDepth, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 用户活动监听
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // 页面卸载监听
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);

    // 错误监听
    if (CONFIG.errorTracking) {
      window.addEventListener('error', (e) => {
        trackError(e.message, e.filename, e.lineno, e.colno, e.error);
      });

      window.addEventListener('unhandledrejection', (e) => {
        trackError('Unhandled Promise Rejection: ' + e.reason, '', 0, 0, e.reason);
      });
    }

    // 启动心跳
    startHeartbeat();
  }

  /**
   * 公开API
   */
  window.analytics = {
    track: function(eventType, eventData) {
      sendData(eventType, eventData);
    },
    
    setUserId: function(id) {
      userId = id;
    },
    
    getSessionId: function() {
      return getSessionId();
    },
    
    getUserId: function() {
      return getUserId();
    }
  };

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();