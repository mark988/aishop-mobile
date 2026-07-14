const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export interface CreateReviewDTO {
  userId: string
  userName: string
  productId: string
  rating: number
  comment: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export const reviewService = {
  /**
   * 创建评价
   */
  async createReview(reviewData: CreateReviewDTO) {
    try {
      console.log('📝 提交评价:', reviewData)
      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<any> = await response.json()
      console.log('✅ 评价提交成功:', result.data)
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('❌ 提交评价失败:', error)
      throw error
    }
  },

  /**
   * 获取商品评价列表
   */
  async getProductReviews(productId: string, page: number = 1, size: number = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/product/${productId}?page=${page}&size=${size}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<any> = await response.json()
      return result.code === 200 ? result.data : null
    } catch (error) {
      console.error('❌ 获取评价列表失败:', error)
      throw error
    }
  },

  /**
   * 检查用户是否已评价某商品
   */
  async checkUserReview(userId: string, productId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/check?userId=${userId}&productId=${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<boolean> = await response.json()
      return result.code === 200 ? result.data : false
    } catch (error) {
      console.error('❌ 检查评价状态失败:', error)
      return false
    }
  }
}
