import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clearToken,
  getMe,
  getToken,
  login as apiLogin,
  setToken,
  setUnauthorizedHandler,
} from '../api/client'
import type { AuthUser, Role } from '../api/types'

interface AuthState {
  user: AuthUser | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (min: Role) => boolean
}

const RANK: Record<Role, number> = { ReadOnly: 1, Designer: 2, Admin: 3 }

const AuthContext = createContext<AuthState>({
  user: null,
  ready: false,
  login: async () => {},
  logout: () => {},
  hasRole: () => false,
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  // A 401 from any request forces logout (expired/invalid token).
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
  }, [])

  // On load, if we have a token, validate it by fetching the current user.
  useEffect(() => {
    if (!getToken()) {
      setReady(true)
      return
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password)
    setToken(result.token)
    setUser(result.user)
  }, [])

  const hasRole = useCallback(
    (min: Role) => (user ? RANK[user.role] >= RANK[min] : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, ready, login, logout, hasRole }),
    [user, ready, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
