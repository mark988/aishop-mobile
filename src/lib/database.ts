// Browser-compatible database layer
// Uses mock database for development, will be replaced with API calls in production

import { query as mockQuery, transaction as mockTransaction } from './mockDatabase'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

if (isBrowser) {
  console.log('🔧 Using mock database for browser environment')
  console.log('💡 In production, this should be replaced with API calls to your backend')
}

// 数据库查询函数
export const query = async (text: string, params?: any[]) => {
  if (isBrowser) {
    // Use mock database in browser
    return await mockQuery(text, params)
  } else {
    // This would be used in a Node.js environment
    throw new Error('Server-side database connection not implemented yet')
  }
}

// 事务处理
export const transaction = async (callback: (client: any) => Promise<any>) => {
  if (isBrowser) {
    // Use mock transaction in browser
    return await mockTransaction(callback)
  } else {
    // This would be used in a Node.js environment
    throw new Error('Server-side database transaction not implemented yet')
  }
}