import { getStoredToken } from '../lib/auth'
import { getVisitorId } from '../lib/visitor'
import { AIProductCard, AiAnswerType } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081') + '/api'
const AI_ENDPOINT = `${API_BASE}/ai/ask`
const AI_CLICK_ENDPOINT = `${API_BASE}/ai/click`

// HF Serverless Inference 冷启动可能需要 30-60s
const REQUEST_TIMEOUT_MS = 45_000

export interface AiAskResult {
  queryId: string
  answer: string
  products: AIProductCard[]
  type?: AiAnswerType
}

const buildHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const token = getStoredToken()
  const visitorId = getVisitorId()
  return {
    'Content-Type': 'application/json',
    ...(visitorId ? { 'X-Visitor-Id': visitorId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  }
}

export const aiService = {
  async ask(question: string): Promise<AiAskResult> {
    const url = `${AI_ENDPOINT}?q=${encodeURIComponent(question)}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`AI service ${response.status}`)
      }

      const data = await response.json()
      const rawType = typeof data?.type === 'string' ? data.type : undefined
      const type: AiAnswerType | undefined =
        rawType === 'PRODUCT' || rawType === 'FAQ' ? rawType : undefined
      return {
        queryId: typeof data?.queryId === 'string' ? data.queryId : '',
        answer: typeof data?.answer === 'string' ? data.answer : '',
        products: Array.isArray(data?.products) ? data.products : [],
        type,
      }
    } finally {
      clearTimeout(timer)
    }
  },

  reportClick(queryId: string, productId: string): void {
    if (!queryId || !productId) return
    try {
      fetch(AI_CLICK_ENDPOINT, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ queryId, productId }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  },
}
