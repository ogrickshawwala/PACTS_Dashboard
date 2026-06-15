import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ApiError } from '../api/client'
import { useAuth } from '../components/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default' }}>
      <Card variant="outlined" sx={{ width: 360, borderTop: '3px solid #FFC300' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 2, color: '#FFC300', mb: 0.5 }}>
            PACTS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Production Administration &amp; Configuration Tracking System
          </Typography>
          <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                size="small"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={busy || !username || !password}>
                Sign in
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
