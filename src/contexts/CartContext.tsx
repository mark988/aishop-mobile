import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';

interface CartContextType {
  cart: CartItem[];
  addItem: (product: Product, quantity: number, selectedProperties?: Record<string, string>) => Promise<void>;
  removeFromCart: (productId: string) => void;
  increaseQuantity: (productId: string) => Promise<void>;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // 获取用户特定的localStorage key
  const getUserCartKey = (userId?: string) => {
    return userId ? `cart_${userId}` : 'cart_guest';
  };

  // 标准化购物车数据格式
  const normalizeCartData = (data: any[]): CartItem[] => {
    const normalized = data
      .filter(item => {
        return item && (
          (item.product && typeof item.product === 'object') ||
          (item.id && item.name && item.price !== undefined)
        );
      })
      .map(item => {
        let normalizedItem: CartItem;

        if (item.product && typeof item.product === 'object') {
          normalizedItem = item as CartItem;
        } else {
          normalizedItem = {
            id: item.id,
            product: item,
            quantity: item.quantity || 1,
            selectedProperties: item.selectedProperties || {}
          } as CartItem;
        }

        // SAFETY FIX: Clean selectedProperties in normalized data
        if (normalizedItem.selectedProperties) {
          const cleanSelectedProperties: Record<string, string> = {};
          Object.entries(normalizedItem.selectedProperties).forEach(([key, value]) => {
            if (typeof value === 'string' && value.includes(',')) {
              cleanSelectedProperties[key] = value.split(',')[0].trim();
            } else {
              cleanSelectedProperties[key] = value;
            }
          });
          normalizedItem.selectedProperties = cleanSelectedProperties;
        }

        return normalizedItem;
      });

    // 清理重复项：合并相同商品和属性的项目
    return deduplicateCartItems(normalized);
  };

  // 清理购物车重复项
  const deduplicateCartItems = (items: CartItem[]): CartItem[] => {
    const itemMap = new Map<string, CartItem>();
    
    items.forEach(item => {
      const newId = generateCartItemId(item.product, item.selectedProperties);
      const existing = itemMap.get(newId);
      
      if (existing) {
        // 合并数量
        existing.quantity += item.quantity;
      } else {
        // 更新ID以确保一致性
        itemMap.set(newId, {
          ...item,
          id: newId
        });
      }
    });
    
    return Array.from(itemMap.values());
  };

  // 刷新购物车商品信息（方案 A）
  const refreshCartItems = async (currentCart: CartItem[]) => {
    if (!currentCart || currentCart.length === 0) return;

    try {
      console.log('🔄 Refreshing cart items from server...');
      
      // 获取购物车中所有唯一的商品ID
      const productIds = Array.from(new Set(currentCart.map(item => item.product.id)));
      
      // 批量获取最新商品数据（如果 API 支持批量获取则更好，目前使用单个获取并 Promise.all）
      const updatedProductsMap = new Map<string, Product>();
      
      await Promise.all(productIds.map(async (id) => {
        try {
          const latestProduct = await apiService.getProductDetail(id);
          if (latestProduct) {
            updatedProductsMap.set(id, latestProduct);
          }
        } catch (err) {
          console.error(`Failed to refresh product ${id}:`, err);
        }
      }));

      if (updatedProductsMap.size === 0) return;

      // 更新购物车状态
      setCart(prevCart => {
        let hasChanges = false;
        const newCart = prevCart.map(item => {
          const latest = updatedProductsMap.get(item.product.id);
          if (latest) {
            // 检查关键数据是否发生变化
            if (
              latest.price !== item.product.price || 
              latest.name !== item.product.name ||
              JSON.stringify(latest.images) !== JSON.stringify(item.product.images)
            ) {
              hasChanges = true;
              return {
                ...item,
                product: latest
              };
            }
          }
          return item;
        });

        if (hasChanges) {
          console.log('✅ Cart items refreshed with latest data');
          return newCart;
        }
        return prevCart;
      });
    } catch (error) {
      console.error('Error refreshing cart items:', error);
    }
  };

  // 从localStorage加载购物车
  const loadCartFromStorage = async () => {
    try {
      const cartKey = getUserCartKey(user?.id);
      let savedCart = localStorage.getItem(cartKey);
      
      // 如果localStorage没有数据，尝试从sessionStorage加载
      if (!savedCart) {
        savedCart = sessionStorage.getItem(cartKey);
        if (savedCart) {
          console.info('Loading cart from sessionStorage fallback');
        }
      }
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        // 检测数据格式并转换
        let normalizedCart: CartItem[];
        if (parsedCart.length > 0 && 'i' in parsedCart[0]) {
          // 新的压缩格式
          normalizedCart = parsedCart.map((item: any) => {
            // SAFETY FIX: Clean selectedProperties data during loading
            const cleanSelectedProperties: Record<string, string> = {};
            if (item.sp && typeof item.sp === 'object') {
              Object.entries(item.sp).forEach(([key, value]: [string, any]) => {
                if (typeof value === 'string' && value.includes(',')) {
                  cleanSelectedProperties[key] = value.split(',')[0].trim();
                } else {
                  cleanSelectedProperties[key] = value;
                }
              });
            }

            return {
              id: item.i,
              product: {
                id: item.p.i,
                name: item.p.n,
                price: item.p.pr,
                images: item.p.imgs || (item.p.im ? [item.p.im] : []), // 优先使用images数组，fallback到image
                category: item.p.c || '',
                property: item.p.prop || {},
                stock: item.p.st || 999,
                brand: item.p.b || '',
                mediaType: item.p.mt || 'image',
                video: item.p.v,
                description: '',
                salesCount: 0,
                sku: '',
                isActive: true,
                createdAt: '',
                updatedAt: ''
              },
              quantity: item.q,
              selectedProperties: cleanSelectedProperties
            };
          });
        } else {
          // 旧格式或标准格式
          normalizedCart = normalizeCartData(parsedCart);
        }

        setCart(normalizedCart);
        
        // 方案 A: 加载后异步刷新商品信息（价格、库存、名称等）
        if (normalizedCart.length > 0) {
          refreshCartItems(normalizedCart);
        }
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      // 如果解析失败，清理损坏的数据
      try {
        const cartKey = getUserCartKey(user?.id);
        localStorage.removeItem(cartKey);
        sessionStorage.removeItem(cartKey);
      } catch (cleanupError) {
        console.warn('Failed to cleanup corrupted cart data:', cleanupError);
      }
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存购物车到localStorage
  const saveCartToStorage = (cartData: CartItem[]) => {
    try {
      const cartKey = getUserCartKey(user?.id);
      
      // 超级压缩数据结构以减少存储空间
      const ultraCompactCart = cartData.map(item => ({
        i: item.id, // id
        p: { // product (只保留必要字段)
          i: item.product.id,
          n: item.product.name,
          pr: item.product.price,
          imgs: item.product.images, // 保存完整的images数组
          c: item.product.category,
          prop: item.product.property,
          st: item.product.stock,
          b: item.product.brand,
          mt: item.product.mediaType,
          v: item.product.video
        },
        q: item.quantity, // quantity
        sp: item.selectedProperties || {} // selectedProperties
      }));
      
      const cartString = JSON.stringify(ultraCompactCart);
      
      // 如果数据太大，先尝试清理localStorage
      if (cartString.length > 1024 * 1024) { // 1MB limit
        console.warn('Cart data large, cleaning up storage');
        // 清理其他用户的购物车数据
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cart_') && key !== cartKey) {
            localStorage.removeItem(key);
          }
        }
      }
      
      localStorage.setItem(cartKey, cartString);
      
    } catch (error: any) {
      console.error('Error saving cart to storage:', error);
      
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting aggressive cleanup');
        
        try {
          // 清理所有localStorage数据
          localStorage.clear();
          
          // 重新保存购物车（进一步压缩）
          const cartKey = getUserCartKey(user?.id);
          const essentialCart = cartData.slice(0, 15).map(item => ({ // 最多15个商品
            i: item.id,
            p: {
              i: item.product.id,
              n: item.product.name.substring(0, 30), // 限制名称长度
              pr: item.product.price,
              im: item.product.image
            },
            q: item.quantity
          }));
          
          localStorage.setItem(cartKey, JSON.stringify(essentialCart));
          console.info('Cart saved with essential data after quota cleanup');
          
        } catch (retryError) {
          console.error('Critical: All localStorage attempts failed:', retryError);
          
          // 最后的手段：使用sessionStorage
          try {
            const fallbackCart = cartData.slice(0, 5).map(item => ({
              i: item.id,
              p: { i: item.product.id, n: item.product.name, pr: item.product.price },
              q: item.quantity
            }));
            sessionStorage.setItem(getUserCartKey(user?.id), JSON.stringify(fallbackCart));
            console.warn('Emergency: Cart saved to sessionStorage');
          } catch (sessionError) {
            console.error('All storage methods exhausted:', sessionError);
          }
        }
      }
    }
  };

  // 用户变化时重新加载购物车
  useEffect(() => {
    loadCartFromStorage();
  }, [user?.id]);

  // 购物车变化时保存到localStorage
  useEffect(() => {
    if (!isLoading) {
      saveCartToStorage(cart);
    }
  }, [cart, isLoading]);

  // 生成唯一的购物车项ID
  const generateCartItemId = (product: Product, selectedProperties?: Record<string, string>) => {
    // 对属性进行排序以确保一致性
    const sortedProperties = selectedProperties && Object.keys(selectedProperties).length > 0
      ? JSON.stringify(selectedProperties, Object.keys(selectedProperties).sort())
      : '{}';
    return `${product.id}_${sortedProperties}`;
  };

  // 添加商品到购物车
  const addItem = async (product: Product, quantity: number, selectedProperties?: Record<string, string>) => {
    if (!product || quantity <= 0) return;

    // SAFETY CHECK: Ensure selectedProperties never contains comma-separated values
    const safeSelectedProperties: Record<string, string> = {};
    if (selectedProperties) {
      Object.entries(selectedProperties).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes(',')) {
          safeSelectedProperties[key] = value.split(',')[0].trim();
        } else {
          safeSelectedProperties[key] = value;
        }
      });
    }

    try {
      setCart(currentCart => {
        const cartItemId = generateCartItemId(product, safeSelectedProperties);

        // 只使用 cartItemId 来查找现有项目，避免重复逻辑
        const existingCartItem = currentCart.find((item) => item.id === cartItemId);

        let updatedCart: CartItem[];
        if (existingCartItem) {
          // 更新现有商品数量
          const newQuantity = existingCartItem.quantity + quantity;
          updatedCart = currentCart.map(item =>
            item.id === cartItemId
              ? { ...item, quantity: newQuantity }
              : item
          );
        } else {
          // 添加新商品
          const newItem: CartItem = {
            id: cartItemId,
            product,
            quantity,
            selectedProperties: safeSelectedProperties
          };
          updatedCart = [...currentCart, newItem];
        }

        return updatedCart;
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  };

  // 从购物车移除商品
  const removeFromCart = (productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== productId));
  };

  // 增加商品数量
  const increaseQuantity = async (productId: string) => {
    setCart(currentCart =>
      currentCart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // 减少商品数量
  const decreaseQuantity = (productId: string) => {
    setCart(currentCart =>
      currentCart.map(item =>
        item.id === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  // 清空购物车
  const clearCart = () => {
    setCart([]);
  };

  // 计算购物车商品总数
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        cartCount,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};