import { useCallback, useEffect, useMemo, useState } from 'react'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  ApiError,
  activateKillSwitch,
  clearKillSwitch,
  exportVersion,
  getKillSwitchStatus,
  getEnvironmentVersion,
  listConfigurations,
} from '../api/client'
import type { ConfigDefinition, EmergencyOverride } from '../api/types'
import ValueEditor, { formatValue } from '../components/ValueEditor'
import { useAuth } from '../components/AuthContext'
import { useEnvironments } from '../components/EnvContext'

/** A sensible "safe" default to force for a config of this type. */
function safeDefault(type: ConfigDefinition['type']): unknown {
  switch (type) {
    case 'Boolean':
      return false
    case 'Integer':
    case 'Float':
      return 0
    case 'String':
      return ''
    case 'JsonArray':
      return []
    default:
      return {}
  }
}

export default function EmergencyControlsPage() {
  const { hasRole } = useAuth()
  const { refresh: refreshEnvs } = useEnvironments()
  const canKill = hasRole('Admin')

  const [active, setActive] = useState<EmergencyOverride[]>([])
  const [configs, setConfigs] = useState<ConfigDefinition[]>([])
  const [prodVersion, setProdVersion] = useState<number | null>(null)
  const [prodConfigs, setProdConfigs] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [status, configPage, prod] = await Promise.all([
        getKillSwitchStatus(),
        listConfigurations({ pageSize: 200 }),
        getEnvironmentVersion('Production'),
      ])
      setActive(status.active)
      setConfigs(configPage.items)
      setProdVersion(prod?.configVersion ?? null)
      if (prod) {
        const snap = await exportVersion(prod.configVersion)
        setProdConfigs(snap.configs ?? {})
      } else {
        setProdConfigs({})
      }
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load emergency state.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeKeys = useMemo(() => new Set(active.map((o) => o.key)), [active])

  // Kill-switches are on/off only: Boolean configs that are live in Production
  // and not already switched.
  const candidates = useMemo(
    () => configs.filter((c) => c.type === 'Boolean' && c.status !== 'Deleted'
      && !activeKeys.has(c.key) && c.key in prodConfigs),
    [configs, activeKeys, prodConfigs],
  )

  const afterChange = (message: string) => {
    setToast(message)
    refreshEnvs()
    void load()
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 0.5, alignItems: 'center' }}>
        <WarningAmberIcon sx={{ color: 'error.main', fontSize: 30 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Emergency Controls</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Kill-switches flip a single Boolean feature flag off (or on) in Production immediately,
        bypassing the normal approve / promote gate. Clients pick the change up on their next
        refresh. Every action is audited and reversible.
      </Typography>

      {!canKill && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Admin role required to engage or clear kill-switches.
        </Alert>
      )}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {loading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}><CircularProgress /></Stack>
      ) : (
        <Stack spacing={2.5}>
          <ActiveSwitches
            active={active}
            canKill={canKill}
            onCleared={afterChange}
          />
          {canKill && (
            <EngagePanel
              candidates={candidates}
              prodVersion={prodVersion}
              prodConfigs={prodConfigs}
              onEngaged={afterChange}
            />
          )}
        </Stack>
      )}

      <Snackbar open={toast !== ''} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}

function ActiveSwitches({
  active,
  canKill,
  onCleared,
}: {
  active: EmergencyOverride[]
  canKill: boolean
  onCleared: (message: string) => void
}) {
  const [target, setTarget] = useState<EmergencyOverride | null>(null)

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Active kill-switches</Typography>
          <Chip
            size="small"
            label={active.length}
            color={active.length > 0 ? 'error' : 'default'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        {active.length === 0 ? (
          <Alert severity="success" variant="outlined">
            No kill-switches active. Production is serving normal values.
          </Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Config key</TableCell>
                <TableCell>Forced value</TableCell>
                <TableCell>Will restore to</TableCell>
                <TableCell>Engaged by</TableCell>
                <TableCell>Reason</TableCell>
                {canKill && <TableCell align="right">Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((o) => (
                <TableRow key={o.key}>
                  <TableCell sx={{ fontWeight: 600 }}>{o.key}</TableCell>
                  <TableCell><code>{formatValue(o.forcedValue)}</code></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}><code>{formatValue(o.originalValue)}</code></TableCell>
                  <TableCell>{o.activatedBy}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{o.reason}</TableCell>
                  {canKill && (
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="primary"
                        startIcon={<RestartAltIcon />}
                        onClick={() => setTarget(o)}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {target && (
        <ClearDialog
          override={target}
          onClose={() => setTarget(null)}
          onCleared={(msg) => { setTarget(null); onCleared(msg) }}
        />
      )}
    </Card>
  )
}

function ClearDialog({
  override,
  onClose,
  onCleared,
}: {
  override: EmergencyOverride
  onClose: () => void
  onCleared: (message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await clearKillSwitch(override.key, reason)
      onCleared(`Kill-switch on ${override.key} cleared; value restored.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Clear failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Restore {override.key}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <code>{override.key}</code> will be restored to <code>{formatValue(override.originalValue)}</code> in
          Production as a new version. Clients pick it up on their next refresh.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason (mandatory)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || reason.trim() === ''} onClick={run}>
          Restore
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function EngagePanel({
  candidates,
  prodVersion,
  prodConfigs,
  onEngaged,
}: {
  candidates: ConfigDefinition[]
  prodVersion: number | null
  prodConfigs: Record<string, unknown>
  onEngaged: (message: string) => void
}) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState<unknown>(null)
  const [valid, setValid] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = candidates.find((c) => c.key === key) ?? null

  const pick = (newKey: string) => {
    setKey(newKey)
    const def = candidates.find((c) => c.key === newKey)
    setValue(def ? safeDefault(def.type) : null)
    setValid(true)
  }

  const submit = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await activateKillSwitch(selected.key, value, reason)
      setConfirmOpen(false)
      setKey('')
      setReason('')
      onEngaged(`Kill-switch engaged on ${selected.key}.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Activation failed.')
    } finally {
      setBusy(false)
    }
  }

  if (prodVersion === null) {
    return (
      <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Engage a kill-switch</Typography>
          <Alert severity="warning">
            No Production version exists yet. Promote a version before using emergency controls.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Engage a kill-switch</Typography>
        <Typography variant="caption" color="text.secondary">
          Targets Production v{prodVersion}.
        </Typography>
        <Stack spacing={2} sx={{ mt: 2, maxWidth: 520 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Configuration key"
            value={key}
            onChange={(e) => pick(e.target.value)}
            helperText={candidates.length === 0 ? 'No engageable Boolean flags (none live, or all already switched).' : 'Boolean feature flags only.'}
          >
            {candidates.map((c) => (
              <MenuItem key={c.key} value={c.key}>{c.key}</MenuItem>
            ))}
          </TextField>

          {selected && (
            <>
              <Alert severity="info" variant="outlined">
                Currently live in Production: <code>{formatValue(prodConfigs[selected.key])}</code>
              </Alert>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Force value to
                </Typography>
                <ValueEditor
                  type={selected.type}
                  value={value}
                  allowedValues={selected.validation.allowedValues}
                  onChange={(v, ok) => { setValue(v); setValid(ok) }}
                />
              </Box>
              <Button
                variant="contained"
                color="error"
                disabled={!valid}
                onClick={() => { setError(''); setConfirmOpen(true) }}
                sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
              >
                Engage kill-switch
              </Button>
            </>
          )}
        </Stack>
      </CardContent>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Confirm kill-switch</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <code>{selected?.key}</code> will be forced to <code>{formatValue(value)}</code> in
            Production immediately, bypassing the approve / promote gate. All clients pick it up on
            their next refresh.
          </Alert>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Divider sx={{ mb: 2 }} />
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label="Incident reason (mandatory)"
            placeholder="e.g. Voice chat crashing on PS5 launch"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={busy || reason.trim() === ''}
            onClick={submit}
            sx={{ fontWeight: 700 }}
          >
            Engage
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
