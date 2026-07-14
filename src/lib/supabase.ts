// Compatibility exports - maintain compatibility with existing code
import { query } from './database'
import { signUp as authSignUp, signIn as authSignIn, signOut as authSignOut, getCurrentUser as authGetCurrentUser, getStoredToken, setStoredToken, removeStoredToken } from './auth'

// Mock Supabase client structure for compatibility
export const supabase = {
  // Mock auth object
  auth: {
    signUp: async ({ email, password, options }: { email: string, password: string, options?: { data?: { name?: string } } }) => {
      const name = options?.data?.name || ''
      const result = await authSignUp(email, password, name)
      if (result.error) {
        return { data: null, error: result.error }
      }
      if (result.token) {
        setStoredToken(result.token)
      }
      return { data: { user: result.user }, error: null }
    },
    
    signInWithPassword: async ({ email, password }: { email: string, password: string }) => {
      const result = await authSignIn(email, password)
      if (result.error) {
        return { data: null, error: result.error }
      }
      if (result.token) {
        setStoredToken(result.token)
      }
      return { data: { user: result.user }, error: null }
    },
    
    signOut: async () => {
      removeStoredToken()
      return await authSignOut()
    },
    
    getUser: async () => {
      const token = getStoredToken()
      if (!token) {
        return { data: { user: null }, error: null }
      }
      const user = await authGetCurrentUser(token)
      return { data: { user }, error: null }
    },
    
    getSession: async () => {
      const token = getStoredToken()
      if (!token) {
        return { data: { session: null }, error: null }
      }
      const user = await authGetCurrentUser(token)
      return { 
        data: { 
          session: user ? { user, access_token: token } : null 
        }, 
        error: null 
      }
    },
    
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Simplified state change listener
      const checkAuth = async () => {
        const token = getStoredToken()
        const user = token ? await authGetCurrentUser(token) : null
        callback('SIGNED_IN', user ? { user, access_token: token } : null)
      }
      
      checkAuth()
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }
    }
  },
  
  // Mock database query methods
  from: (table: string) => ({
    select: (columns = '*', options?: any) => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          try {
            const result = await query(`SELECT ${columns} FROM ${table} WHERE ${column} = $1 LIMIT 1`, [value])
            return { data: result.rows[0] || null, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
        order: (column: string, options?: { ascending?: boolean }) => ({
          async then(resolve: any) {
            try {
              const orderDirection = options?.ascending === false ? 'DESC' : 'ASC'
              const result = await query(`SELECT ${columns} FROM ${table} WHERE ${column} = $1 ORDER BY created_at ${orderDirection}`, [value])
              resolve({ data: result.rows, error: null })
            } catch (error) {
              resolve({ data: null, error })
            }
          }
        }),
        async then(resolve: any) {
          try {
            const result = await query(`SELECT ${columns} FROM ${table} WHERE ${column} = $1`, [value])
            resolve({ data: result.rows, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      }),
      order: (column: string, options?: { ascending?: boolean }) => ({
        async then(resolve: any) {
          try {
            const orderDirection = options?.ascending === false ? 'DESC' : 'ASC'
            const result = await query(`SELECT ${columns} FROM ${table} ORDER BY ${column} ${orderDirection}`)
            resolve({ data: result.rows, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      }),
      async then(resolve: any) {
        try {
          const result = await query(`SELECT ${columns} FROM ${table}`)
          resolve({ data: result.rows, error: null })
        } catch (error) {
          resolve({ data: null, error })
        }
      }
    }),
    
    insert: (data: any) => ({
      select: (columns = '*') => ({
        async then(resolve: any) {
          try {
            const keys = Object.keys(data)
            const values = Object.values(data)
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
            const result = await query(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${columns}`,
              values
            )
            resolve({ data: result.rows, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      }),
      async then(resolve: any) {
        try {
          const keys = Object.keys(data)
          const values = Object.values(data)
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
          const result = await query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
            values
          )
          resolve({ data: result.rows, error: null })
        } catch (error) {
          resolve({ data: null, error })
        }
      }
    }),
    
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: (columns = '*') => ({
          async then(resolve: any) {
            try {
              const keys = Object.keys(data)
              const values = Object.values(data)
              const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
              const result = await query(
                `UPDATE ${table} SET ${setClause} WHERE ${column} = $${keys.length + 1} RETURNING ${columns}`,
                [...values, value]
              )
              resolve({ data: result.rows, error: null })
            } catch (error) {
              resolve({ data: null, error })
            }
          }
        }),
        async then(resolve: any) {
          try {
            const keys = Object.keys(data)
            const values = Object.values(data)
            const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
            const result = await query(
              `UPDATE ${table} SET ${setClause} WHERE ${column} = $${keys.length + 1}`,
              [...values, value]
            )
            resolve({ data: result.rows, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      })
    }),
    
    delete: () => ({
      eq: (column: string, value: any) => ({
        async then(resolve: any) {
          try {
            const result = await query(`DELETE FROM ${table} WHERE ${column} = $1`, [value])
            resolve({ data: null, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      })
    })
  })
}

// Keep original export functions for compatibility
export const signUp = async (email: string, password: string, name: string) => {
  return await supabase.auth.signUp({ email, password, options: { data: { name } } })
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}