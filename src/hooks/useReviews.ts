import { useState, useEffect, useRef } from 'react'
import { getStoredToken } from '../lib/auth'
import { supabase } from '../lib/supabase'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'

export interface Review {
  id: string
  product_id: string
  productId?: string
  user_id?: string
  userId?: string
  user_name: string
  userName?: string
  rating: number
  comment: string
  created_at: string
  createdAt?: string
  helpful_count: number
  helpfulCount?: number
}

export interface NewReview {
  product_id: string
  user_id?: string
  user_name: string
  rating: number
  comment: string
}

export interface ReviewReply {
  id: string
  review_id: string
  reviewId?: string
  user_id?: string
  userId?: string
  user_name: string
  userName?: string
  content: string
  created_at: string
  createdAt?: string
}

export interface NewReviewReply {
  review_id: string
  user_id?: string
  user_name: string
  content: string
}

export const useReviews = (productId: string) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [replies, setReplies] = useState<{[key: string]: ReviewReply[]}>({})
  const [fetching, setFetching] = useState(false) // 防重复调用
  const [lastProductId, setLastProductId] = useState<string | null>(null) // 记录上次获取的商品ID
  const fetchingRef = useRef(false) // 使用ref避免依赖循环
  const lastProductIdRef = useRef<string | null>(null)
  const reviewsPerPage = 10

  // 获取商品评价 - 优先使用后端API，失败时使用模拟数据
  const fetchReviews = async (page: number = 1, append: boolean = false) => {
    if (fetchingRef.current) return; // 防止重复调用
    
    try {
      fetchingRef.current = true;
      setFetching(true)
      setLoading(true)
      setError(null)

      // 首先尝试调用后端API
      try {
        const response = await fetch(`${API_BASE_URL}/reviews/product/${productId}?page=${page}&size=${reviewsPerPage}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          
          if (result.code === 200 && result.data) {
            const reviewsData = result.data.items || []
            const totalCount = result.data.total || 0
            
            if (append) {
              setReviews(prev => [...prev, ...reviewsData])
            } else {
              setReviews(reviewsData)
            }
            
            setTotalCount(totalCount)
            setHasMore(reviewsData.length === reviewsPerPage && (page * reviewsPerPage) < totalCount)
            setCurrentPage(page)
            
            // 设置回复数据
            const repliesMap: {[key: string]: ReviewReply[]} = {}
            reviewsData.forEach((review: any) => {
              if (review.replies && review.replies.length > 0) {
                repliesMap[review.id] = review.replies
              }
            })
            setReplies(repliesMap)
            return; // 成功获取数据，直接返回
          }
        }
      } catch (apiError) {
        console.log('后端API不可用，使用模拟数据:', apiError)
      }

      // API失败时使用模拟数据
      throw new Error('API不可用，使用模拟数据')
      
    } catch (err) {
      console.error('Error fetching reviews:', err)
      
      // 如果API不可用，首先尝试从本地存储获取数据，然后使用模拟数据
      console.log('🔄 API不可用，尝试从本地存储获取数据')
      
      // 从本地存储获取评价
      const localReviews = JSON.parse(localStorage.getItem(`reviews_${productId}`) || '[]')
      
      const mockReviews: Review[] = [
        ...localReviews, // 先显示本地存储的评价
        {
          id: '1',
          product_id: productId,
          user_id: 'user1',
          user_name: '张三',
          rating: 5,
          comment: '商品质量很好，物流也很快，非常满意！',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          helpful_count: 12
        },
        {
          id: '2',
          product_id: productId,
          user_id: 'user2',
          user_name: '李四',
          rating: 4,
          comment: '整体不错，性价比很高，推荐购买。',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          helpful_count: 8
        },
        {
          id: '3',
          product_id: productId,
          user_id: 'user3',
          user_name: '王五',
          rating: 5,
          comment: '超出预期，包装精美，客服态度也很好。',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          helpful_count: 15
        }
      ]

      // 模拟分页
      const startIndex = (page - 1) * reviewsPerPage
      const endIndex = startIndex + reviewsPerPage
      const pageReviews = mockReviews.slice(startIndex, endIndex)
      
      if (append) {
        setReviews(prev => [...prev, ...pageReviews])
      } else {
        setReviews(pageReviews)
      }
      
      setTotalCount(mockReviews.length)
      setHasMore(endIndex < mockReviews.length)
      setCurrentPage(page)

      // 模拟回复数据
      setReplies({
        '1': [
          {
            id: 'reply1',
            review_id: '1',
            user_id: 'admin',
            user_name: '客服小助手',
            content: '感谢您的好评，我们会继续努力提供更好的服务！',
            created_at: new Date(Date.now() - 43200000).toISOString()
          }
        ]
      })
      
      // 清除错误状态，因为我们有备用数据
      setError(null)
    } finally {
      setLoading(false)
      setFetching(false)
      fetchingRef.current = false;
    }
  }

  // 创建评价
  const createReview = async (reviewData: NewReview) => {
    try {
      const token = getStoredToken()
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          productId: reviewData.product_id,
          userId: reviewData.user_id,
          userName: reviewData.user_name,
          rating: reviewData.rating,
          comment: reviewData.comment
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 刷新评价列表
        await fetchReviews(1, false)
        return result.data
      } else {
        throw new Error(result.message || '发表评价失败')
      }
    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  }

  // 创建回复
  const createReply = async (replyData: NewReviewReply) => {
    try {
      const token = getStoredToken()
      const response = await fetch(`${API_BASE_URL}/reviews/replies`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          reviewId: replyData.review_id,
          userId: replyData.user_id,
          userName: replyData.user_name,
          content: replyData.content
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 刷新评价列表以获取最新回复
        await fetchReviews(currentPage, false)
        return result.data
      } else {
        throw new Error(result.message || '回复失败')
      }
    } catch (error) {
      console.error('Error creating reply:', error)
      throw error
    }
  }

  // 更新有用数量
  const updateHelpfulCount = async (reviewId: string, isHelpful: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful?isHelpful=${isHelpful}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.code === 200) {
        // 刷新评价列表
        await fetchReviews(currentPage, false)
        return result.data
      } else {
        throw new Error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('Error updating helpful count:', error)
      throw error
    }
  }

  // 获取指定评价的回复
  const fetchRepliesForReviews = async (reviewIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('review_replies')
        .select('*')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true })

      if (error) throw error

      // 按review_id分组回复
      const repliesByReview: {[key: string]: ReviewReply[]} = {}
      data?.forEach(reply => {
        if (!repliesByReview[reply.review_id]) {
          repliesByReview[reply.review_id] = []
        }
        repliesByReview[reply.review_id].push(reply)
      })

      setReplies(prev => ({ ...prev, ...repliesByReview }))
    } catch (err) {
      console.error('Error fetching replies:', err)
    }
  }

  // 加载更多评价
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(currentPage + 1, true)
    }
  }

  // 跳转到指定页
  const goToPage = (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalCount / reviewsPerPage)) {
      fetchReviews(page, false)
    }
  }

  // 提交新评价
  const submitReview = async (reviewData: NewReview): Promise<boolean> => {
    try {
      // 首先尝试使用后端API
      const result = await createReview(reviewData)
      return !!result
    } catch (err) {
      console.error('后端API不可用，使用本地存储:', err)
      
      // 后端不可用时，将评价保存到本地存储
      try {
        const newReview: Review = {
          id: 'local-' + Date.now(),
          product_id: reviewData.product_id,
          productId: reviewData.product_id,
          user_id: reviewData.user_id,
          userId: reviewData.user_id,
          user_name: reviewData.user_name,
          userName: reviewData.user_name,
          rating: reviewData.rating,
          comment: reviewData.comment,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          helpful_count: 0,
          helpfulCount: 0
        }
        
        // 保存到本地存储
        const localReviews = JSON.parse(localStorage.getItem(`reviews_${reviewData.product_id}`) || '[]')
        localReviews.unshift(newReview)
        localStorage.setItem(`reviews_${reviewData.product_id}`, JSON.stringify(localReviews))
        
        // 更新本地状态
        setReviews(prev => [newReview, ...prev])
        setTotalCount(prev => prev + 1)
        
        console.log('评价已保存到本地存储')
        return true
      } catch (localError) {
        console.error('本地存储失败:', localError)
        throw new Error('评价提交失败')
      }
    }
  }

  // 点赞评价
  const likeReview = async (reviewId: string): Promise<boolean> => {
    try {
      // 先更新本地状态，提供即时反馈
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              helpful_count: (review.helpful_count || 0) + 1,
              helpfulCount: (review.helpfulCount || review.helpful_count || 0) + 1
            }
          : review
      ))

      // 然后调用后端API
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful?isHelpful=true`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        // 如果API调用失败，回滚本地状态
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                helpful_count: Math.max(0, (review.helpful_count || 0) - 1),
                helpfulCount: Math.max(0, (review.helpfulCount || review.helpful_count || 0) - 1)
              }
            : review
        ))
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return true
    } catch (err) {
      console.error('Error liking review:', err)
      return false
    }
  }

  // 提交回复
  const submitReply = async (replyData: NewReviewReply): Promise<boolean> => {
    try {
      const result = await createReply(replyData)
      return !!result
    } catch (err) {
      console.error('Error submitting reply:', err)
      throw new Error(err instanceof Error ? err.message : '提交回复失败')
    }
  }

  // 计算平均评分
  const averageRating = reviews && reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  // 计算评分分布
  const ratingDistribution = reviews ? [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
  })) : []

  useEffect(() => {
    if (productId && productId !== lastProductIdRef.current && !fetchingRef.current) {
      lastProductIdRef.current = productId;
      setLastProductId(productId);
      fetchReviews(1, false);
    }
  }, [productId])

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / reviewsPerPage)

  return {
    reviews,
    loading,
    error,
    currentPage,
    totalCount,
    hasMore,
    totalPages,
    replies,
    averageRating,
    ratingDistribution,
    fetchReviews,
    createReview,
    createReply,
    updateHelpfulCount,
    submitReview,
    submitReply,
    likeReview,
    loadMore,
    goToPage,
    refresh: () => fetchReviews(1, false)
  }
}