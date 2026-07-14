import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, X, Bot, User, Settings, Sparkles, HelpCircle } from 'lucide-react'
import { useAI, useAIEnabled, QUICK_QUESTIONS } from '../hooks/useAI'
import { aiService } from '../services/aiService'
import { useLanguage } from '../contexts/LanguageContext'
import { AIProductCard } from '../types'

const PLACEHOLDER_IMG = '/placeholder-image.svg'

// 欢迎气泡只在第一次访问主动弹一次,记一下避免每次刷新都骚扰
const TIP_SEEN_KEY = 'ai_chat_tip_seen'

export default function MobileAIChat() {
  const [enabled, setEnabled] = useAIEnabled()
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [message, setMessage] = useState('')
  const { chatMessages, loading, sendMessage } = useAI()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { t } = useLanguage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // 打开聊天时锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  // 首次访问自动弹一次气泡(800ms 后弹出,展示 5s 后收起);后续访问不再弹。
  // 移动端没有 hover,所以只靠首次自动弹这一次主动引导。
  useEffect(() => {
    if (!enabled || isOpen) return
    if (typeof window === 'undefined') return
    let seen = false
    try {
      seen = localStorage.getItem(TIP_SEEN_KEY) === '1'
    } catch {}
    if (seen) return
    const showT = setTimeout(() => setShowTip(true), 800)
    const hideT = setTimeout(() => {
      setShowTip(false)
      try {
        localStorage.setItem(TIP_SEEN_KEY, '1')
      } catch {}
    }, 5800)
    return () => {
      clearTimeout(showT)
      clearTimeout(hideT)
    }
  }, [enabled, isOpen])

  const handleSend = async () => {
    if (message.trim() && !loading) {
      const text = message
      setMessage('')
      await sendMessage(text)
    }
  }

  const handleQuickQuestion = async (q: string) => {
    if (loading) return
    await sendMessage(q)
  }

  const handleProductClick = (p: AIProductCard, queryId?: string) => {
    if (queryId) {
      aiService.reportClick(queryId, p.id)
    }
    setIsOpen(false)
    navigate(p.url || `/product/${p.id}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDisable = () => {
    setEnabled(false)
    setIsOpen(false)
    setShowSettings(false)
  }

  // 禁用态:右下角放一个低调的小图标,点击重新启用
  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        aria-label="Enable Smart Assistant"
        className="fixed bottom-20 right-3 bg-white border border-gray-200 text-gray-400 p-2 rounded-full shadow-sm z-40 opacity-70 active:opacity-100 active:scale-95 transition-all"
      >
        <Bot className="w-4 h-4" />
      </button>
    )
  }

  const showQuickQuestions = chatMessages.length <= 1 && !loading

  return (
    <>
      {/* 浮动按钮 - 位于底部导航上方,袋鼠 + 欢迎气泡 */}
      {!isOpen && (
        <div className="fixed bottom-20 right-3 z-40 flex items-end gap-2">
          {/* 提示气泡 - 向左展开 */}
          <div
            className={`mb-1 transition-all duration-300 ease-out ${
              showTip
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-2 pointer-events-none'
            }`}
            role="status"
            aria-live="polite"
            onClick={() => setShowTip(false)}
          >
            <div className="relative ai-chat-tip-float bg-white shadow-xl rounded-2xl pl-3 pr-3.5 py-2 border border-gray-100 max-w-[60vw]">
              <p className="text-xs text-gray-800 leading-tight">
                <span className="font-semibold text-primary-700">{t('ai_chat.tip.title')}</span>
                <span className="text-gray-400 mx-1">·</span>
                <span>{t('ai_chat.tip.body')}</span>
              </p>
              {/* 指向按钮的小三角 */}
              <span className="absolute -right-1.5 bottom-3 w-2.5 h-2.5 bg-white border-r border-b border-gray-100 rotate-[-45deg]" />
            </div>
          </div>

          {/* 袋鼠按钮 */}
          <button
            onClick={() => {
              setIsOpen(true)
              setShowTip(false)
              try {
                localStorage.setItem(TIP_SEEN_KEY, '1')
              } catch {}
            }}
            aria-label={t('ai_chat.button.open')}
            className="relative w-12 h-12 rounded-full bg-primary-600 shadow-lg active:scale-95 transition-transform"
          >
            {/* 外圈光环 ping,吸引注意 */}
            <span className="absolute inset-0 rounded-full bg-primary-400 opacity-60 animate-ping" aria-hidden="true" />
            <span className="absolute inset-0 rounded-full bg-primary-600" aria-hidden="true" />
            <span className="relative flex items-center justify-center w-full h-full">
              <span
                className="ai-chat-hop text-2xl leading-none select-none"
                aria-hidden="true"
              >
                🦘
              </span>
            </span>
          </button>
        </div>
      )}

      {/* 全屏聊天面板 - 移动端空间小,采用近全屏 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white safe-top">
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm truncate">Smart shopping assistant</span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => setShowSettings(s => !s)}
                aria-label="Settings"
                className="text-white/90 p-2 -mr-1 rounded transition-colors active:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="text-white/90 p-2 -mr-2 rounded transition-colors active:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-b bg-gray-50 px-4 py-3 text-sm flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Enable Smart Assistant</span>
                <button
                  onClick={handleDisable}
                  className="relative inline-flex h-5 w-10 items-center rounded-full bg-primary-600 transition-colors"
                  aria-label="Disable"
                >
                  <span className="inline-block h-4 w-4 transform translate-x-5 rounded-full bg-white transition-transform" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The floating window will disappear after closing; you can re-enable it using the small icon in the lower right corner.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {msg.sender === 'ai' && msg.type && (
                      <div className="mb-1.5">
                        {msg.type === 'FAQ' ? (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Customer Service
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Recommendation
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-start space-x-2">
                      {msg.sender === 'ai' && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      {msg.sender === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    </div>
                    <p className="text-[10px] opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* AI 回复下方的商品卡片 - 移动端窄面板里水平滚动很难发现右侧内容,
                    改成 2 列网格自动换行,所有商品跟着对话区一起竖向滚动 */}
                {msg.sender === 'ai' && msg.products && msg.products.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    {msg.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleProductClick(p, msg.queryId)}
                        className="bg-white border border-gray-200 active:border-primary-400 rounded-lg p-2 text-left transition-all"
                      >
                        <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden mb-1.5">
                          <img
                            src={p.image || PLACEHOLDER_IMG}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = PLACEHOLDER_IMG
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2rem] leading-tight">
                          {p.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary-600">
                            ¥{Number(p.price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-primary-600 bg-primary-50 px-1 py-0.5 rounded">
                            Details
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {showQuickQuestions && (
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="flex items-center text-xs text-gray-500 mb-2">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>Try asking.</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="flex-shrink-0 px-3 py-1 text-xs bg-primary-50 active:bg-primary-100 text-primary-700 rounded-full border border-primary-100 transition-colors whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t safe-bottom flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your question..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || loading}
                className="bg-primary-600 active:bg-primary-700 disabled:bg-gray-300 text-white p-2.5 rounded-full transition-colors flex-shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
