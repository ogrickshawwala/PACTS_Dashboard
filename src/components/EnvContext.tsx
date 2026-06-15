import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getEnvironmentVersion } from '../api/client'
import type { EnvironmentVersion } from '../api/types'

interface EnvState {
  development: EnvironmentVersion | null
  approved: EnvironmentVersion | null
  production: EnvironmentVersion | null
  serverReachable: boolean
  refresh: () => void
}

const EnvContext = createContext<EnvState>({
  development: null,
  approved: null,
  production: null,
  serverReachable: true,
  refresh: () => {},
})

export function useEnvironments(): EnvState {
  return useContext(EnvContext)
}

export function EnvProvider({ children }: { children: ReactNode }) {
  const [development, setDevelopment] = useState<EnvironmentVersion | null>(null)
  const [approved, setApproved] = useState<EnvironmentVersion | null>(null)
  const [production, setProduction] = useState<EnvironmentVersion | null>(null)
  const [serverReachable, setServerReachable] = useState(true)

  const refresh = useCallback(() => {
    Promise.all([
      getEnvironmentVersion('Development'),
      getEnvironmentVersion('Approved'),
      getEnvironmentVersion('Production'),
    ])
      .then(([dev, appr, prod]) => {
        setDevelopment(dev)
        setApproved(appr)
        setProduction(prod)
        setServerReachable(true)
      })
      .catch(() => setServerReachable(false))
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return (
    <EnvContext.Provider value={{ development, approved, production, serverReachable, refresh }}>
      {children}
    </EnvContext.Provider>
  )
}
