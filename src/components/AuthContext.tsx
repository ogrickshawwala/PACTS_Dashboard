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

const RANK: Record<Role, number> = { ReadOnly: 1, Dev: 2, Designer: 3, Admin: 4 }

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

  // On load: capture a token handed back by the Zoho callback (#token=...),
  // then validate whatever token we have by fetching the current user.
  useEffect(() => {
    const m = window.location.hash.match(/token=([^&]+)/)
    if (m) {
      setToken(decodeURIComponent(m[1]))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
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
