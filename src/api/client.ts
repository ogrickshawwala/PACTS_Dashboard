import type {
  AuditEntry,
  AuthUser,
  ConfigDefinition,
  EmergencyOverride,
  Environment,
  EnvironmentVersion,
  KillSwitchStatus,
  Paginated,
  PlatformOverrideMatrix,
  Role,
  SystemMetrics,
  VersionDifference,
  VersionSnapshot,
} from './types'

// The ONLY place the backend endpoint is configured. Set VITE_PACTS_API_URL
// in .env to point at another deployment stage; never hardcode elsewhere.
const BASE_URL: string = import.meta.env.VITE_PACTS_API_URL ?? 'http://127.0.0.1:1800'

export class ApiError extends Error {
  readonly errorCode: string

  constructor(errorCode: string, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

const TOKEN_KEY = 'pactsToken'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// The AuthContext registers a handler so a 401 anywhere forces a logout.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('SERVER_UNREACHABLE', `Cannot reach PACTS server at ${BASE_URL}`)
  }
  const body = await response.json().catch(() => null)
  if (!body || body.success !== true) {
    if (response.status === 401) {
      clearToken()
      onUnauthorized?.()
    }
    throw new ApiError(body?.errorCode ?? 'SERVER_ERROR', body?.message ?? `HTTP ${response.status}`)
  }
  return body.data as T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

// ---- Admin: configurations -------------------------------------------------

export function listConfigurations(params: {
  search?: string
  category?: string
  type?: string
  tag?: string
  page?: number
  pageSize?: number
}): Promise<Paginated<ConfigDefinition>> {
  return request(`/api/v1/admin/configurations${query(params)}`)
}

export function createConfiguration(payload: Record<string, unknown>): Promise<ConfigDefinition> {
  return request('/api/v1/admin/configuration', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateConfigurationValue(key: string, value: unknown, reason?: string): Promise<ConfigDefinition> {
  return request('/api/v1/admin/configuration/update', {
    method: 'POST',
    body: JSON.stringify({ key, value, reason }),
  })
}

export function setConfigurationStatus(key: string, status: string, reason?: string): Promise<ConfigDefinition> {
  return request('/api/v1/admin/configuration/status', {
    method: 'POST',
    body: JSON.stringify({ key, status, reason }),
  })
}

// ---- Admin: versions ---------------------------------------------------------

export function listVersions(params: { page?: number; pageSize?: number; environment?: string }): Promise<Paginated<VersionSnapshot>> {
  return request(`/api/v1/admin/versions${query(params)}`)
}

export function publishVersion(releaseNotes: string): Promise<VersionSnapshot> {
  return request('/api/v1/admin/publish', { method: 'POST', body: JSON.stringify({ releaseNotes }) })
}

export function approveVersion(version: number): Promise<VersionSnapshot> {
  return request('/api/v1/admin/approve', { method: 'POST', body: JSON.stringify({ version }) })
}

export function promoteVersion(version: number): Promise<VersionSnapshot> {
  return request('/api/v1/admin/promote', { method: 'POST', body: JSON.stringify({ version }) })
}

export function rollbackVersion(version: number, reason: string): Promise<VersionSnapshot> {
  return request('/api/v1/admin/rollback', { method: 'POST', body: JSON.stringify({ version, reason }) })
}

export function compareVersions(sourceVersion: number, targetVersion: number): Promise<{
  sourceVersion: number
  targetVersion: number
  differences: VersionDifference[]
}> {
  return request(`/api/v1/admin/compare${query({ sourceVersion, targetVersion })}`)
}

export function exportVersion(version: number): Promise<VersionSnapshot & { configs: Record<string, unknown> }> {
  return request(`/api/v1/admin/export/${version}`)
}

// ---- Admin: emergency controls (kill-switches) -------------------------------

export function getKillSwitchStatus(): Promise<KillSwitchStatus> {
  return request('/api/v1/admin/emergency/status')
}

export function activateKillSwitch(key: string, value: unknown, reason: string): Promise<EmergencyOverride> {
  return request('/api/v1/admin/emergency/activate', {
    method: 'POST',
    body: JSON.stringify({ key, value, reason }),
  })
}

export function clearKillSwitch(key: string, reason: string): Promise<EmergencyOverride> {
  return request('/api/v1/admin/emergency/clear', {
    method: 'POST',
    body: JSON.stringify({ key, reason }),
  })
}

// ---- Admin: platform overrides -----------------------------------------------

export function getPlatformOverrides(version?: number): Promise<PlatformOverrideMatrix> {
  return request(`/api/v1/admin/platform-overrides${query({ version })}`)
}

export function setPlatformOverride(
  version: number | undefined,
  key: string,
  platform: string,
  value: unknown,
): Promise<PlatformOverrideMatrix> {
  return request('/api/v1/admin/platform-overrides', {
    method: 'POST',
    body: JSON.stringify({ version, key, platform, value }),
  })
}

export function removePlatformOverride(
  version: number | undefined,
  key: string,
  platform: string,
): Promise<PlatformOverrideMatrix> {
  return request('/api/v1/admin/platform-overrides', {
    method: 'DELETE',
    body: JSON.stringify({ version, key, platform }),
  })
}

// ---- Admin: audit -------------------------------------------------------------

export function listAudit(params: { page?: number; pageSize?: number; user?: string; action?: string }): Promise<Paginated<AuditEntry>> {
  return request(`/api/v1/admin/audit${query(params)}`)
}

// ---- Environment status ---------------------------------------------------------

export async function getEnvironmentVersion(environment: Environment): Promise<EnvironmentVersion | null> {
  try {
    return await request(`/api/v1/client/version${query({ environment })}`)
  } catch (error) {
    if (error instanceof ApiError && error.errorCode === 'VERSION_NOT_FOUND') return null
    throw error
  }
}

export function getHealth(): Promise<{ service: string; env: string }> {
  return request('/api/v1/health')
}

export function getSystemMetrics(): Promise<SystemMetrics> {
  return request('/api/v1/metrics/system')
}

// ---- Auth --------------------------------------------------------------------

export function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function getMe(): Promise<AuthUser> {
  return request('/api/v1/auth/me')
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ changed: boolean }> {
  return request('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// ---- Admin: users ------------------------------------------------------------

export function listUsers(): Promise<{ items: AuthUser[] }> {
  return request('/api/v1/admin/users')
}

export function createUser(payload: { username: string; password: string; role: Role; email?: string }): Promise<AuthUser> {
  return request('/api/v1/admin/users', { method: 'POST', body: JSON.stringify(payload) })
}

export function setUserRole(username: string, role: Role): Promise<AuthUser> {
  return request(`/api/v1/admin/users/${encodeURIComponent(username)}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

export function setUserActive(username: string, isActive: boolean): Promise<AuthUser> {
  return request(`/api/v1/admin/users/${encodeURIComponent(username)}/active`, {
    method: 'POST',
    body: JSON.stringify({ isActive }),
  })
}
