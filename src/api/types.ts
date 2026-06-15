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

export type Role = 'Admin' | 'Designer' | 'ReadOnly'

export interface AuthUser {
  id: number
  username: string
  email: string | null
  role: Role
  isActive: boolean
  createdAt: string | null
  lastLogin: string | null
}
