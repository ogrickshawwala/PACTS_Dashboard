import { Route, Routes } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Layout from './components/Layout'
import { useAuth } from './components/AuthContext'
import AuditPage from './pages/AuditPage'
import ConfigurationsPage from './pages/ConfigurationsPage'
import DashboardPage from './pages/DashboardPage'
import EmergencyControlsPage from './pages/EmergencyControlsPage'
import LoginPage from './pages/LoginPage'
import MetricsPage from './pages/MetricsPage'
import PlatformOverridesPage from './pages/PlatformOverridesPage'
import UsersPage from './pages/UsersPage'
import VersionsPage from './pages/VersionsPage'

export default function App() {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/configurations" element={<ConfigurationsPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/platform-overrides" element={<PlatformOverridesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/emergency" element={<EmergencyControlsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
    </Routes>
  )
}
