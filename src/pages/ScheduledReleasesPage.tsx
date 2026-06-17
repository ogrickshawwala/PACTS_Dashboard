import { useCallback, useEffect, useState } from 'react'
import ScheduleIcon from '@mui/icons-material/Schedule'
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
  cancelScheduledRelease,
  createScheduledRelease,
  listScheduledReleases,
  listVersions,
} from '../api/client'
import type { ScheduledRelease, ScheduleStatus, VersionSnapshot } from '../api/types'
import { useAuth } from '../components/AuthContext'
import { useEnvironments } from '../components/EnvContext'
import { formatIST, istLocalToUtcISO } from '../utils/datetime'

const STATUS_COLOR: Record<ScheduleStatus, 'default' | 'warning' | 'success' | 'error'> = {
  Pending: 'warning',
  Processing: 'warning',
  Completed: 'success',
  Failed: 'error',
  Cancelled: 'default',
}

export default function ScheduledReleasesPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole('Admin')

  const [releases, setReleases] = useState<ScheduledRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReleases((await listScheduledReleases({ pageSize: 100 })).items)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load scheduled releases.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cancel = async (id: number) => {
    try {
      await cancelScheduledRelease(id)
      setToast('Scheduled release cancelled.')
      void load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Cancel failed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 0.5, alignItems: 'center' }}>
        <ScheduleIcon sx={{ fontSize: 28 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>Scheduled Releases</Typography>
        {canManage && (
          <Button variant="contained" startIcon={<ScheduleIcon />} onClick={() => setDialogOpen(true)}>
            Schedule release
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Queue an Approved version to auto-promote to Production at a set time (entered in IST).
        A background worker fires it; clients pick it up on their next refresh.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : (
        <Card variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scheduled for</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>
                {canManage && <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {releases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No scheduled releases.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : releases.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>v{r.version}</TableCell>
                  <TableCell>{formatIST(r.scheduledTime)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} color={STATUS_COLOR[r.status]} />
                  </TableCell>
                  <TableCell>{r.createdBy}</TableCell>
                  <TableCell sx={{ maxWidth: 320, color: r.status === 'Failed' ? 'error.main' : 'text.secondary' }}>
                    {r.detail}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {r.status === 'Pending' && (
                        <Button size="small" color="error" onClick={() => cancel(r.id)}>Cancel</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {dialogOpen && (
        <ScheduleDialog
          onClose={() => setDialogOpen(false)}
          onScheduled={(msg) => { setDialogOpen(false); setToast(msg); void load() }}
        />
      )}

      <Snackbar open={toast !== ''} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}

function ScheduleDialog({
  onClose,
  onScheduled,
}: {
  onClose: () => void
  onScheduled: (message: string) => void
}) {
  const { refresh } = useEnvironments()
  const [approved, setApproved] = useState<VersionSnapshot[]>([])
  const [version, setVersion] = useState<number | ''>('')
  const [localTime, setLocalTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listVersions({ environment: 'Approved', pageSize: 100 })
      .then((p) => setApproved(p.items))
      .catch(() => setApproved([]))
  }, [])

  const submit = async () => {
    if (version === '' || !localTime) return
    setBusy(true)
    setError('')
    try {
      await createScheduledRelease(version, istLocalToUtcISO(localTime), note || undefined)
      refresh()
      onScheduled(`Version ${version} scheduled for ${formatIST(istLocalToUtcISO(localTime))}.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Scheduling failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Schedule a release</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {approved.length === 0 ? (
            <Alert severity="info">No Approved versions available. Approve a version first.</Alert>
          ) : (
            <TextField
              select
              fullWidth
              size="small"
              label="Approved version"
              value={version === '' ? '' : String(version)}
              onChange={(e) => setVersion(Number(e.target.value))}
            >
              {approved.map((v) => (
                <MenuItem key={v.version} value={String(v.version)}>
                  v{v.version} — {v.releaseNotes?.slice(0, 50) || 'no notes'}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            type="datetime-local"
            fullWidth
            size="small"
            label="Promote at (IST)"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Time is interpreted as IST (UTC+5:30)."
          />
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || version === '' || !localTime}
          onClick={submit}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  )
}
