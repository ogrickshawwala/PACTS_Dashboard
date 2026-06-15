import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TuneIcon from '@mui/icons-material/Tune'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import HistoryIcon from '@mui/icons-material/History'
import PublishIcon from '@mui/icons-material/Publish'
import PersonIcon from '@mui/icons-material/Person'
import { ApiError, getActingUser, publishVersion, setActingUser } from '../api/client'
import { ENV_COLORS } from '../theme'
import { EnvProvider, useEnvironments } from './EnvContext'

const SIDEBAR_WIDTH = 210

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Configurations', path: '/configurations', icon: <TuneIcon fontSize="small" /> },
  { label: 'Version Control', path: '/versions', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'Audit Logs', path: '/audit', icon: <HistoryIcon fontSize="small" /> },
]

function EnvironmentIndicator() {
  const { development, approved, production, serverReachable } = useEnvironments()
  const chips: Array<{ label: string; env: string; version: number | null }> = [
    { label: 'DEV', env: 'Development', version: development?.configVersion ?? null },
    { label: 'APPROVED', env: 'Approved', version: approved?.configVersion ?? null },
    { label: 'PROD', env: 'Production', version: production?.configVersion ?? null },
  ]
  if (!serverReachable) {
    return <Chip size="small" color="error" label="SERVER UNREACHABLE" sx={{ fontWeight: 700 }} />
  }
  return (
    <Stack direction="row" spacing={1}>
      {chips.map((chip) => (
        <Tooltip key={chip.env} title={`${chip.env} environment`}>
          <Chip
            size="small"
            label={chip.version === null ? `${chip.label}: none` : `${chip.label}: v${chip.version}`}
            sx={{
              fontWeight: 700,
              color: '#111111',
              backgroundColor: ENV_COLORS[chip.env],
              opacity: chip.version === null ? 0.45 : 1,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  )
}

function PublishButton() {
  const { refresh } = useEnvironments()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const snapshot = await publishVersion(notes)
      setToast(`Published version ${snapshot.version}`)
      setOpen(false)
      setNotes('')
      refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="contained" size="small" startIcon={<PublishIcon />} onClick={() => setOpen(true)}>
        Publish
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Publish new version</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates an immutable snapshot of all current Development values. Release notes are mandatory.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Release notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || notes.trim() === ''} onClick={submit}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={toast !== ''}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </>
  )
}

function UserField() {
  const [user, setUser] = useState(getActingUser())
  return (
    <Tooltip title="Acting user recorded in the audit log (auth arrives in Phase 3)">
      <TextField
        size="small"
        placeholder="your name"
        value={user}
        onChange={(e) => {
          setUser(e.target.value)
          setActingUser(e.target.value)
        }}
        slotProps={{
          input: { startAdornment: <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> },
        }}
        sx={{ width: 170 }}
      />
    </Tooltip>
  )
}

export default function Layout() {
  const location = useLocation()
  return (
    <EnvProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
          <Toolbar variant="dense" sx={{ gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2, color: '#FFC300' }}>
              PACTS
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
              Production Administration &amp; Configuration Tracking System
            </Typography>
            <EnvironmentIndicator />
            <UserField />
            <PublishButton />
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar variant="dense" />
          <List dense>
            {NAV_ITEMS.map((item) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 2.5, backgroundColor: 'background.default' }}>
          <Toolbar variant="dense" />
          <Outlet />
        </Box>
      </Box>
    </EnvProvider>
  )
}
