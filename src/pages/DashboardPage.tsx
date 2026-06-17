import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { listAudit } from '../api/client'
import type { AuditEntry, EnvironmentVersion } from '../api/types'
import { formatValue } from '../components/ValueEditor'
import { ENV_COLORS } from '../theme'
import { formatIST } from '../utils/datetime'
import { useEnvironments } from '../components/EnvContext'

function EnvironmentCard({ name, info }: { name: string; info: EnvironmentVersion | null }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, borderTop: `3px solid ${ENV_COLORS[name]}` }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {name}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {info ? `v${info.configVersion}` : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {info?.publishedAt ? `published ${formatIST(info.publishedAt)}` : 'nothing published yet'}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { development, approved, production } = useEnvironments()
  const [audit, setAudit] = useState<AuditEntry[]>([])

  useEffect(() => {
    listAudit({ page: 1, pageSize: 10 })
      .then((page) => setAudit(page.items))
      .catch(() => setAudit([]))
  }, [development, approved, production])

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Dashboard
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <EnvironmentCard name="Development" info={development} />
        <EnvironmentCard name="Approved" info={approved} />
        <EnvironmentCard name="Production" info={production} />
      </Stack>

      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        Recent activity
      </Typography>
      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Change</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {audit.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No activity yet. Create a configuration or publish a version to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {audit.map((entry, index) => (
              <TableRow key={index} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatIST(entry.timestamp)}
                </TableCell>
                <TableCell>{entry.user}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={entry.action} />
                </TableCell>
                <TableCell>{entry.entityId}</TableCell>
                <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.oldValue !== null && `${formatValue(entry.oldValue)} → `}
                  {formatValue(entry.newValue)}
                </TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
