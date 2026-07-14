import { useEffect, useState } from 'react'
import { Product, AIRecommendation, ChatMessage } from '../types'
import { aiService } from '../services/aiService'

const AI_ENABLED_KEY = 'ai_chat_enabled'

export const QUICK_QUESTIONS = [
  'Suitable for the elderly',
  'Boost immunity',
  'Beauty and skin care',
  'Childrens nutrition',
  'Shipping policy',
  'Refund policy',
  'Contact phone',
  'Customer service',
]

export const useAIEnabled = (): [boolean, (v: boolean) => void] => {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const v = localStorage.getItem(AI_ENABLED_KEY)
    return v === null ? true : v === 'true'
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === AI_ENABLED_KEY) {
        setEnabledState(e.newValue === null ? true : e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const setEnabled = (v: boolean) => {
    setEnabledState(v)
    try {
      localStorage.setItem(AI_ENABLED_KEY, String(v))
    } catch {}
  }

  return [enabled, setEnabled]
}

export const useAI = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I am your smart shopping assistant, how can I help you?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ])
  const [loading, setLoading] = useState(false)

  const getRecommendations = async (products: Product[], _userHistory?: any[]) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const recommended = products
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
        .map(product => ({
          product,
          score: Math.random() * 0.3 + 0.7,
          reason: '基于您的浏览历史推荐',
        }))
      setRecommendations(recommended)
    } catch (error) {
      console.error('Error getting recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: trimmed,
      sender: 'user',
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const { queryId, answer, products, type } = await aiService.ask(trimmed)

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: answer || "Sorry, I couldn't generate an answer this time.",
        sender: 'ai',
        timestamp: new Date(),
        products: products && products.length > 0 ? products : undefined,
        queryId: queryId || undefined,
        type,
      }
      setChatMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI ask failed:', error)
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
      }
      setChatMessages(prev => [...prev, aiResponse])
    } finally {
      setLoading(false)
    }
  }

  return {
    recommendations,
    chatMessages,
    loading,
    getRecommendations,
    sendMessage,
  }
}
