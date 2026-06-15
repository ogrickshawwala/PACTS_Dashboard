import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AuditPage from './pages/AuditPage'
import ConfigurationsPage from './pages/ConfigurationsPage'
import DashboardPage from './pages/DashboardPage'
import VersionsPage from './pages/VersionsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/configurations" element={<ConfigurationsPage />} />
        <Route path="/versions" element={<VersionsPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Route>
    </Routes>
  )
}
