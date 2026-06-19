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
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import DashboardIcon from '@mui/icons-material/Dashboard'
import TuneIcon from '@mui/icons-material/Tune'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import DevicesIcon from '@mui/icons-material/Devices'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'
import InsightsIcon from '@mui/icons-material/Insights'
import PublishIcon from '@mui/icons-material/Publish'
import PeopleIcon from '@mui/icons-material/People'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LogoutIcon from '@mui/icons-material/Logout'
// PersonIcon removed with the old acting-user field
import { ApiError, publishVersion } from '../api/client'
import type { Role } from '../api/types'
import { ENV_COLORS } from '../theme'
import { useAuth } from './AuthContext'
import { EnvProvider, useEnvironments } from './EnvContext'
import NotificationBell from './NotificationBell'

const SIDEBAR_WIDTH = 210

const NAV_ITEMS: Array<{ label: string; path: string; icon: React.ReactNode; minRole?: Role }> = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Configurations', path: '/configurations', icon: <TuneIcon fontSize="small" /> },
  { label: 'Version Control', path: '/versions', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'Platform Overrides', path: '/platform-overrides', icon: <DevicesIcon fontSize="small" /> },
  { label: 'Scheduled Releases', path: '/scheduled-releases', icon: <ScheduleIcon fontSize="small" /> },
  { label: 'Audit Logs', path: '/audit', icon: <HistoryIcon fontSize="small" /> },
  { label: 'Metrics', path: '/metrics', icon: <InsightsIcon fontSize="small" /> },
  { label: 'Emergency', path: '/emergency', icon: <WarningAmberIcon fontSize="small" />, minRole: 'Admin' },
  { label: 'Users', path: '/users', icon: <PeopleIcon fontSize="small" />, minRole: 'Admin' },
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
  const { hasRole } = useAuth()
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

  // Publishing is a Dev+ action (Dev/Designer/Admin); ReadOnly users don't see it.
  if (!hasRole('Dev')) return null

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

function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Stack sx={{ alignItems: 'flex-end', lineHeight: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.username}</Typography>
        <Typography variant="caption" color="text.secondary">{user.role}</Typography>
      </Stack>
      <Tooltip title="Sign out">
        <IconButton size="small" onClick={logout}>
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

export default function Layout() {
  const location = useLocation()
  const { hasRole } = useAuth()
  const navItems = NAV_ITEMS.filter((item) => !item.minRole || hasRole(item.minRole))
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
            <PublishButton />
            <NotificationBell />
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <UserMenu />
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar variant="dense" />
          <List dense>
            {navItems.map((item) => (
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
