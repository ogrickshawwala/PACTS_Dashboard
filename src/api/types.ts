export type ConfigType = 'Boolean' | 'Integer' | 'Float' | 'String' | 'JsonObject' | 'JsonArray'
export type Environment = 'Development' | 'Approved' | 'Production'
export type ConfigStatus = 'Active' | 'Deprecated' | 'Deleted'

export interface ValidationRules {
  minValue: number | null
  maxValue: number | null
  allowedValues: unknown[] | null
  regexPattern: string | null
  required: boolean
}

export interface ConfigDefinition {
  key: string
  displayName: string
  description: string
  type: ConfigType
  defaultValue: unknown
  currentValue: unknown
  owner: string
  category: string
  status: ConfigStatus
  activationPolicy: string
  tags: string[]
  validation: ValidationRules
  createdBy: string
  lastModifiedBy: string
  lastModified: string | null
}

export interface VersionSnapshot {
  version: number
  environment: Environment
  releaseNotes: string
  createdBy: string
  createdAt: string | null
  approvedAt: string | null
  promotedAt: string | null
}

export interface AuditEntry {
  user: string
  action: string
  entityType: string | null
  entityId: string | null
  oldValue: unknown
  newValue: unknown
  reason: string | null
  timestamp: string | null
}

export interface VersionDifference {
  key: string
  change: 'Added' | 'Removed' | 'Modified'
  source?: unknown
  target?: unknown
}

export interface Paginated<T> {
  totalItems: number
  totalPages: number
  currentPage: number
  items: T[]
}

export interface EnvironmentVersion {
  configVersion: number
  environment: string
  publishedAt: string | null
}

export interface EmergencyOverride {
  key: string
  forcedValue: unknown
  originalValue: unknown
  active: boolean
  baseVersion: number | null
  emergencyVersion: number | null
  reason: string
  activatedBy: string
  activatedAt: string | null
  clearedBy: string | null
  clearedAt: string | null
  clearReason: string | null
}

export interface KillSwitchStatus {
  count: number
  active: EmergencyOverride[]
}

export interface PlatformOverrideRow {
  key: string
  type: ConfigType
  globalValue: unknown
  overrides: Record<string, unknown>
}

export interface PlatformOverrideMatrix {
  version: number
  environment: Environment
  editable: boolean
  platforms: string[]
  configs: PlatformOverrideRow[]
}

export type ScheduleStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled'

export interface ScheduledRelease {
  id: number
  version: number | null
  scheduledTime: string | null
  status: ScheduleStatus
  createdBy: string
  createdAt: string | null
  executedAt: string | null
  detail: string | null
}

export interface AppNotification {
  id: number
  type: string
  message: string
  read: boolean
  createdAt: string | null
}

export interface NotificationList {
  totalItems: number
  totalPages: number
  currentPage: number
  unreadCount: number
  items: AppNotification[]
}

export type Role = 'Admin' | 'Designer' | 'Dev' | 'ReadOnly'

export interface AuthUser {
  id: number
  username: string
  email: string | null
  role: Role
  isActive: boolean
  createdAt: string | null
  lastLogin: string | null
}

export interface SystemMetrics {
  requestsPerMinute: number
  totalRequests: number
  failedRequests: number
  configDownloads: number
  connectedClients: number
  knownClients: number
  staleClients: number
  productionVersion: number | null
  approvedVersion: number | null
  developmentVersion: number | null
  lastPublish: string | null
  lastRollback: string | null
  uptimeSeconds: number
}
