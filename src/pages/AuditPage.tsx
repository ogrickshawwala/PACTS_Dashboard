import { useCallback, useEffect, useState } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ApiError, listAudit } from '../api/client'
import type { AuditEntry } from '../api/types'
import { formatValue } from '../components/ValueEditor'
import { formatIST } from '../utils/datetime'

export default function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [userFilter, setUserFilter] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    listAudit({ page: page + 1, pageSize, user: userFilter || undefined })
      .then((result) => {
        setItems(result.items)
        setTotalItems(result.totalItems)
        setError('')
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load audit log.'))
  }, [page, pageSize, userFilter])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>
          Audit Logs
        </Typography>
        <TextField
          size="small"
          placeholder="Filter by user"
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value)
            setPage(0)
          }}
          sx={{ width: 200 }}
        />
        <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Old Value</TableCell>
              <TableCell>New Value</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No audit history yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((entry, index) => (
              <TableRow key={index} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatIST(entry.timestamp)}
                </TableCell>
                <TableCell>{entry.user}</TableCell>
                <TableCell><Chip size="small" variant="outlined" label={entry.action} /></TableCell>
                <TableCell sx={{ fontFamily: 'Consolas, monospace' }}>{entry.entityId}</TableCell>
                <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#FF5252' }}>
                  {formatValue(entry.oldValue)}
                </TableCell>
                <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#4CAF50' }}>
                  {formatValue(entry.newValue)}
                </TableCell>
                <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[50, 100]}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Card>
    </Box>
  )
}
