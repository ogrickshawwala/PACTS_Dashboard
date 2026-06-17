import { useCallback, useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  ApiError,
  createUser,
  listUsers,
  setUserActive,
  setUserRole,
} from '../api/client'
import type { AuthUser, Role } from '../api/types'
import { useAuth } from '../components/AuthContext'
import { formatIST } from '../utils/datetime'

const ROLES: Role[] = ['Admin', 'Designer', 'ReadOnly']

function CreateUserDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (msg: string) => void
}) {
  const [form, setForm] = useState({ username: '', password: '', role: 'ReadOnly' as Role, email: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await createUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        email: form.email || undefined,
      })
      onCreated(`Created ${form.username}.`)
      onClose()
      setForm({ username: '', password: '', role: 'ReadOnly', email: '' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New user</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Username" size="small" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <TextField label="Password" type="password" size="small" value={form.password}
            helperText="At least 8 characters"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <TextField select label="Role" size="small" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField label="Email (optional)" size="small" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || !form.username || form.password.length < 8} onClick={submit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listUsers()
      .then((r) => { setUsers(r.items); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load users.'))
  }, [])

  useEffect(load, [load])

  const changeRole = async (username: string, role: Role) => {
    try {
      await setUserRole(username, role)
      setToast(`${username} is now ${role}.`)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Role change failed.')
    }
  }

  const toggleActive = async (u: AuthUser) => {
    try {
      await setUserActive(u.username, !u.isActive)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Status change failed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New user</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Last Login</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => {
              const isSelf = u.username === me?.username
              return (
                <TableRow key={u.username} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {u.username}{isSelf && <Chip size="small" label="you" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <TextField
                      select size="small" variant="standard" value={u.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(u.username, e.target.value as Role)}
                      sx={{ minWidth: 110 }}
                    >
                      {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.isActive} disabled={isSelf} onChange={() => toggleActive(u)} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatIST(u.lastLogin, 'never')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={(msg) => { setToast(msg); load() }} />
      <Snackbar open={toast !== ''} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}
