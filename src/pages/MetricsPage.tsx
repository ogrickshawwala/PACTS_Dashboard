import { useCallback, useEffect, useState } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ApiError, getSystemMetrics } from '../api/client'
import type { SystemMetrics } from '../api/types'

function MetricCard({ label, value, hint, color }: {
  label: string
  value: string | number
  hint?: string
  color?: string
}) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 180px', minWidth: 180, borderTop: color ? `3px solid ${color}` : undefined }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
        {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
      </CardContent>
    </Card>
  )
}

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : 'never'
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.round(seconds)}s`
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getSystemMetrics()
      .then((m) => { setMetrics(m); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load metrics.'))
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 10000)
    return () => window.clearInterval(timer)
  }, [load])

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>Metrics</Typography>
        <Typography variant="caption" color="text.secondary">auto-refresh 10s</Typography>
        <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {metrics && (
        <>
          <Typography variant="overline" color="text.secondary">Traffic</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <MetricCard label="Requests / min" value={metrics.requestsPerMinute} />
            <MetricCard label="Total Requests" value={metrics.totalRequests} hint={`uptime ${fmtUptime(metrics.uptimeSeconds)}`} />
            <MetricCard label="Config Downloads" value={metrics.configDownloads} />
            <MetricCard label="Failed Requests" value={metrics.failedRequests}
              color={metrics.failedRequests > 0 ? '#FF5252' : '#4CAF50'} />
          </Stack>

          <Typography variant="overline" color="text.secondary">Clients</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <MetricCard label="Connected" value={metrics.connectedClients} color="#4CAF50" hint="heartbeat < 30 min" />
            <MetricCard label="Stale" value={metrics.staleClients} color={metrics.staleClients > 0 ? '#FFB000' : undefined} />
            <MetricCard label="Known Clients" value={metrics.knownClients} />
          </Stack>

          <Typography variant="overline" color="text.secondary">Versions &amp; Releases</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
            <MetricCard label="Production" value={metrics.productionVersion ? `v${metrics.productionVersion}` : '—'} color="#FF5252" />
            <MetricCard label="Approved" value={metrics.approvedVersion ? `v${metrics.approvedVersion}` : '—'} color="#FFC300" />
            <MetricCard label="Development" value={metrics.developmentVersion ? `v${metrics.developmentVersion}` : '—'} color="#2196F3" />
            <MetricCard label="Last Publish" value={fmtTime(metrics.lastPublish)} />
            <MetricCard label="Last Rollback" value={fmtTime(metrics.lastRollback)} />
          </Stack>
        </>
      )}
    </Box>
  )
}
