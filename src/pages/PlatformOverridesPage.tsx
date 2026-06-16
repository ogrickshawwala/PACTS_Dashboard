import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import {
  ApiError,
  getPlatformOverrides,
  removePlatformOverride,
  setPlatformOverride,
} from '../api/client'
import type { ConfigType, PlatformOverrideMatrix, PlatformOverrideRow } from '../api/types'
import ValueEditor, { formatValue } from '../components/ValueEditor'
import { useAuth } from '../components/AuthContext'
import { ENV_COLORS } from '../theme'

interface CellTarget {
  row: PlatformOverrideRow
  platform: string
}

export default function PlatformOverridesPage() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('Designer')

  const [matrix, setMatrix] = useState<PlatformOverrideMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [target, setTarget] = useState<CellTarget | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setMatrix(await getPlatformOverrides())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load platform overrides.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const editable = canEdit && (matrix?.editable ?? false)

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 0.5, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Platform Overrides</Typography>
        {matrix && (
          <Chip
            size="small"
            label={`v${matrix.version} · ${matrix.environment}`}
            sx={{ fontWeight: 700, color: '#111', backgroundColor: ENV_COLORS[matrix.environment] }}
          />
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Per-platform value overrides for the current version. The backend resolves them
        (Global → Platform → Build Type); the game receives final values only. Cells that differ
        from the global value are highlighted.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {matrix && !matrix.editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Version {matrix.version} is {matrix.environment} and frozen. Publish a new version to edit
          platform overrides.
        </Alert>
      )}
      {matrix?.editable && !canEdit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Designer role required to edit overrides. Viewing read-only.
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : matrix ? (
        <Card variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Configuration</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Global</TableCell>
                {matrix.platforms.map((p) => (
                  <TableCell key={p} sx={{ fontWeight: 700 }}>{p}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.configs.map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.key}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.type}</Typography>
                  </TableCell>
                  <TableCell><code>{formatValue(row.globalValue)}</code></TableCell>
                  {matrix.platforms.map((p) => (
                    <OverrideCell
                      key={p}
                      row={row}
                      platform={p}
                      editable={editable}
                      onClick={() => setTarget({ row, platform: p })}
                    />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {target && matrix && (
        <OverrideDialog
          version={matrix.version}
          target={target}
          onClose={() => setTarget(null)}
          onSaved={(m, msg) => { setMatrix(m); setTarget(null); setToast(msg) }}
        />
      )}

      <Snackbar open={toast !== ''} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}

const isSet = (row: PlatformOverrideRow, platform: string) =>
  Object.prototype.hasOwnProperty.call(row.overrides, platform)

function OverrideCell({
  row,
  platform,
  editable,
  onClick,
}: {
  row: PlatformOverrideRow
  platform: string
  editable: boolean
  onClick: () => void
}) {
  const set = isSet(row, platform)
  const value = row.overrides[platform]
  const differs = set && JSON.stringify(value) !== JSON.stringify(row.globalValue)

  const content = set ? (
    <Box
      component="code"
      sx={{
        fontWeight: differs ? 700 : 400,
        color: differs ? 'warning.main' : 'text.primary',
      }}
    >
      {formatValue(value)}
    </Box>
  ) : (
    <Typography variant="body2" color="text.disabled">·</Typography>
  )

  if (!editable) {
    return <TableCell>{content}</TableCell>
  }
  return (
    <TableCell
      onClick={onClick}
      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
    >
      {content}
    </TableCell>
  )
}

function OverrideDialog({
  version,
  target,
  onClose,
  onSaved,
}: {
  version: number
  target: CellTarget
  onClose: () => void
  onSaved: (matrix: PlatformOverrideMatrix, message: string) => void
}) {
  const { row, platform } = target
  const currentlySet = isSet(row, platform)
  const seed = currentlySet ? row.overrides[platform] : row.globalValue

  const [value, setValue] = useState<unknown>(seed)
  const [valid, setValid] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const m = await setPlatformOverride(version, row.key, platform, value)
      onSaved(m, `${platform} override set for ${row.key}.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    setError('')
    try {
      const m = await removePlatformOverride(version, row.key, platform)
      onSaved(m, `${platform} override removed for ${row.key}.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Remove failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{row.key} — {platform} override</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Global value: <code>{formatValue(row.globalValue)}</code>. Setting an override changes the
          value {platform} clients receive on version {version}.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <ValueEditor
          type={row.type as ConfigType}
          value={value}
          onChange={(v, ok) => { setValue(v); setValid(ok) }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {currentlySet && (
          <Button color="error" disabled={busy} onClick={clear}>Clear override</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" disabled={busy || !valid} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
