const VISITOR_ID_KEY = 'aishop_visitor_id'

const generate = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export const getVisitorId = (): string => {
  if (typeof window === 'undefined') return ''
  try {
    let v = localStorage.getItem(VISITOR_ID_KEY)
    if (!v) {
      v = generate()
      localStorage.setItem(VISITOR_ID_KEY, v)
    }
    return v
  } catch {
    return ''
  }
}
