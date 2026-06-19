import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// Same base the API client uses; empty = same-origin (prod behind Caddy).
const API_BASE: string = import.meta.env.VITE_PACTS_API_URL ?? ''

export default function LoginPage() {
  const [error, setError] = useState('')

  // The Zoho callback redirects back with #error=... on failure (e.g. an
  // unauthorized email). Surface it, then strip it from the URL.
  useEffect(() => {
    const m = window.location.hash.match(/error=([^&]+)/)
    if (m) {
      setError(decodeURIComponent(m[1]))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

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
          <Stack spacing={2} sx={{ mt: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" size="large" href={`${API_BASE}/api/v1/auth/zoho/login`}>
              Sign in with Zoho
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              Access is restricted to authorized Rickshaw accounts.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
