import { useCallback, useEffect, useState } from 'react'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  ApiError,
  approveVersion,
  compareVersions,
  listVersions,
  promoteVersion,
  rollbackVersion,
} from '../api/client'
import type { VersionDifference, VersionSnapshot } from '../api/types'
import { formatValue } from '../components/ValueEditor'
import { ENV_COLORS } from '../theme'
import { useAuth } from '../components/AuthContext'
import { useEnvironments } from '../components/EnvContext'

function CompareDialog({ versions, onClose }: { versions: VersionSnapshot[]; onClose: () => void }) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')
  const [differences, setDifferences] = useState<VersionDifference[] | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (source === '' || target === '') return
    setError('')
    try {
      const result = await compareVersions(source, target)
      setDifferences(result.differences)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Comparison failed.')
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Compare versions</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={2} sx={{ my: 1 }}>
          <TextField select size="small" label="Source" sx={{ flex: 1 }} value={source}
            onChange={(e) => setSource(Number(e.target.value))}>
            {versions.map((v) => <MenuItem key={v.version} value={v.version}>v{v.version}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Target" sx={{ flex: 1 }} value={target}
            onChange={(e) => setTarget(Number(e.target.value))}>
            {versions.map((v) => <MenuItem key={v.version} value={v.version}>v{v.version}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={run} disabled={source === '' || target === ''}>
            Compare
          </Button>
        </Stack>
        {differences !== null && (
          differences.length === 0 ? (
            <Alert severity="info">No differences between v{source} and v{target}.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>v{source}</TableCell>
                  <TableCell>v{target}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {differences.map((diff) => (
                  <TableRow key={diff.key}>
                    <TableCell sx={{ fontFamily: 'Consolas, monospace' }}>{diff.key}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={diff.change}
                        color={diff.change === 'Added' ? 'success' : diff.change === 'Removed' ? 'error' : 'warning'} />
                    </TableCell>
                    <TableCell sx={{ color: '#FF5252' }}>{formatValue(diff.source)}</TableCell>
                    <TableCell sx={{ color: '#4CAF50' }}>{formatValue(diff.target)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

function RollbackDialog({
  version,
  onClose,
  onDone,
}: {
  version: number
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await rollbackVersion(version, reason)
      onDone(`Rolled back: v${version} is now Production.`)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Rollback failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Roll back to version {version}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Version {version} will immediately become Production. Clients pick it up on their next refresh cycle.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus fullWidth multiline minRows={2}
          label="Rollback reason (mandatory)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" disabled={busy || reason.trim() === ''} onClick={run}>
          Roll back
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function VersionsPage() {
  const { refresh: refreshEnvironments, production } = useEnvironments()
  const { hasRole } = useAuth()
  const canApprove = hasRole('Designer')
  const canPromote = hasRole('Admin')
  const [items, setItems] = useState<VersionSnapshot[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [toast, setToast] = useState('')
  const [actionError, setActionError] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null)

  const load = useCallback(() => {
    listVersions({ page: page + 1, pageSize })
      .then((result) => {
        setItems(result.items)
        setTotalItems(result.totalItems)
      })
      .catch((e) => setActionError(e instanceof ApiError ? e.message : 'Failed to load versions.'))
  }, [page, pageSize])

  useEffect(load, [load])

  const act = async (action: () => Promise<VersionSnapshot>, success: (v: VersionSnapshot) => string) => {
    setActionError('')
    try {
      const result = await action()
      setToast(success(result))
      load()
      refreshEnvironments()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Action failed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>
          Version Control
        </Typography>
        <Button startIcon={<CompareArrowsIcon />} onClick={() => setCompareOpen(true)} disabled={items.length < 2}>
          Compare
        </Button>
        <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell>Release Notes</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Promoted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No versions yet. Use Publish in the top bar to create version 1.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((snapshot) => {
              const isProduction = snapshot.environment === 'Production'
              return (
                <TableRow key={snapshot.version} hover>
                  <TableCell sx={{ fontWeight: 700 }}>v{snapshot.version}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={snapshot.environment}
                      sx={{ fontWeight: 700, color: '#111111', backgroundColor: ENV_COLORS[snapshot.environment] }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {snapshot.releaseNotes}
                  </TableCell>
                  <TableCell>{snapshot.createdBy}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : ''}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {snapshot.promotedAt ? new Date(snapshot.promotedAt).toLocaleString() : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {snapshot.environment === 'Development' && canApprove && (
                      <Button size="small" onClick={() => act(() => approveVersion(snapshot.version), (v) => `Version ${v.version} approved.`)}>
                        Approve
                      </Button>
                    )}
                    {snapshot.environment === 'Approved' && canPromote && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => act(() => promoteVersion(snapshot.version), (v) => `Version ${v.version} is now Production.`)}
                      >
                        Promote
                      </Button>
                    )}
                    {!isProduction && production && canPromote && (
                      <Button size="small" color="error" onClick={() => setRollbackTarget(snapshot.version)}>
                        Rollback to
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Card>

      {compareOpen && <CompareDialog versions={items} onClose={() => setCompareOpen(false)} />}
      {rollbackTarget !== null && (
        <RollbackDialog
          version={rollbackTarget}
          onClose={() => setRollbackTarget(null)}
          onDone={(message) => {
            setToast(message)
            load()
            refreshEnvironments()
          }}
        />
      )}
      <Snackbar open={toast !== ''} autoHideDuration={5000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}
