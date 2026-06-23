import { useCallback, useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import FormControlLabel from '@mui/material/FormControlLabel'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  ApiError,
  createConfiguration,
  listConfigurations,
  setConfigurationDevelopmentOnly,
  setConfigurationStatus,
  updateConfigurationValue,
} from '../api/client'
import type { ConfigDefinition, ConfigType } from '../api/types'
import ValueEditor, { formatValue } from '../components/ValueEditor'
import { useAuth } from '../components/AuthContext'
import { formatIST } from '../utils/datetime'

const CATEGORIES = ['Gameplay', 'Economy', 'Audio', 'Networking', 'Events', 'Platform', 'Debug', 'LiveOps', 'UI']
const TYPES: ConfigType[] = ['Boolean', 'Integer', 'Float', 'String', 'JsonObject', 'JsonArray']

const DEFAULT_VALUES: Record<ConfigType, unknown> = {
  Boolean: false,
  Integer: 0,
  Float: 0.0,
  String: '',
  JsonObject: {},
  JsonArray: [],
}

function DetailDrawer({
  config,
  onClose,
  onSaved,
}: {
  config: ConfigDefinition | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const { hasRole } = useAuth()
  const canEdit = hasRole('Dev')
  const [value, setValue] = useState<unknown>(null)
  const [valid, setValid] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setValue(config?.currentValue ?? null)
    setValid(true)
    setError('')
  }, [config])

  if (!config) return null

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await updateConfigurationValue(config.key, value)
      onSaved(`Saved ${config.key}. Remember to publish to create a version.`)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  const deprecate = async () => {
    setBusy(true)
    try {
      await setConfigurationStatus(config.key, config.status === 'Deprecated' ? 'Active' : 'Deprecated')
      onSaved(`${config.key} ${config.status === 'Deprecated' ? 'reactivated' : 'deprecated'}.`)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Status change failed.')
    } finally {
      setBusy(false)
    }
  }

  const toggleDevOnly = async () => {
    setBusy(true)
    try {
      await setConfigurationDevelopmentOnly(config.key, !config.developmentOnly)
      onSaved(`${config.key} is ${config.developmentOnly ? 'no longer' : 'now'} development-only.`)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.')
    } finally {
      setBusy(false)
    }
  }

  const rules = config.validation
  const ruleParts: string[] = []
  if (rules.minValue !== null) ruleParts.push(`min ${rules.minValue}`)
  if (rules.maxValue !== null) ruleParts.push(`max ${rules.maxValue}`)
  if (rules.regexPattern) ruleParts.push(`regex ${rules.regexPattern}`)
  if (rules.required) ruleParts.push('required')

  return (
    <Drawer anchor="right" open onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 420, p: 2.5 } }}>
      <Typography variant="h6" sx={{ fontFamily: 'Consolas, monospace', mb: 0.5 }}>
        {config.key}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip size="small" label={config.type} variant="outlined" />
        <Chip size="small" label={config.category} variant="outlined" />
        {config.status !== 'Active' && <Chip size="small" color="warning" label={config.status} />}
        {config.developmentOnly && <Chip size="small" color="info" label="DEV ONLY" />}
        {config.tags.map((tag) => (
          <Chip size="small" key={tag} label={tag} />
        ))}
      </Stack>
      {config.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {config.description}
        </Typography>
      )}
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary">Owner: {config.owner || 'unassigned'}</Typography>
        <Typography variant="caption" color="text.secondary">Default: {formatValue(config.defaultValue)}</Typography>
        {ruleParts.length > 0 && (
          <Typography variant="caption" color="text.secondary">Validation: {ruleParts.join(', ')}</Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Last modified by {config.lastModifiedBy}
          {config.lastModified ? ` at ${formatIST(config.lastModified)}` : ''}
        </Typography>
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Development value
      </Typography>
      <ValueEditor
        type={config.type}
        value={value}
        allowedValues={rules.allowedValues}
        onChange={(v, ok) => {
          setValue(v)
          setValid(ok)
        }}
      />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {!canEdit && (
        <Alert severity="info" sx={{ mt: 2 }}>Read-only access — you can view but not edit.</Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        {canEdit && (
          <Button variant="contained" disabled={busy || !valid} onClick={save}>
            Save
          </Button>
        )}
        {canEdit && (
          <Button color="warning" disabled={busy} onClick={deprecate}>
            {config.status === 'Deprecated' ? 'Reactivate' : 'Deprecate'}
          </Button>
        )}
        {canEdit && (
          <Button color="info" disabled={busy} onClick={toggleDevOnly}>
            {config.developmentOnly ? 'Clear dev-only' : 'Mark dev-only'}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Close</Button>
      </Stack>
    </Drawer>
  )
}

function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (message: string) => void
}) {
  const [form, setForm] = useState({
    key: '',
    type: 'Boolean' as ConfigType,
    category: 'Gameplay',
    owner: '',
    description: '',
    tags: '',
    minValue: '',
    maxValue: '',
  })
  const [defaultValue, setDefaultValue] = useState<unknown>(false)
  const [devOnly, setDevOnly] = useState(false)
  const [valid, setValid] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        key: form.key.trim(),
        type: form.type,
        category: form.category,
        owner: form.owner,
        description: form.description,
        defaultValue,
        developmentOnly: devOnly,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      if (form.minValue !== '') payload.minValue = parseFloat(form.minValue)
      if (form.maxValue !== '') payload.maxValue = parseFloat(form.maxValue)
      await createConfiguration(payload)
      onCreated(`Created ${form.key}.`)
      onClose()
      setForm({ key: '', type: 'Boolean', category: 'Gameplay', owner: '', description: '', tags: '', minValue: '', maxValue: '' })
      setDefaultValue(false)
      setDevOnly(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed.')
    } finally {
      setBusy(false)
    }
  }

  const isNumeric = form.type === 'Integer' || form.type === 'Float'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New configuration</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Key"
            size="small"
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
            helperText="PascalCase or Underscore_Naming. Keys are permanent and cannot be renamed."
          />
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Type"
              size="small"
              sx={{ flex: 1 }}
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as ConfigType
                set('type', type)
                setDefaultValue(DEFAULT_VALUES[type])
                setValid(true)
              }}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Category"
              size="small"
              sx={{ flex: 1 }}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <ValueEditor
            type={form.type}
            value={defaultValue}
            label="Default value"
            onChange={(v, ok) => {
              setDefaultValue(v)
              setValid(ok)
            }}
          />
          {isNumeric && (
            <Stack direction="row" spacing={2}>
              <TextField label="Min (optional)" size="small" type="number" sx={{ flex: 1 }} value={form.minValue} onChange={(e) => set('minValue', e.target.value)} />
              <TextField label="Max (optional)" size="small" type="number" sx={{ flex: 1 }} value={form.maxValue} onChange={(e) => set('maxValue', e.target.value)} />
            </Stack>
          )}
          <TextField label="Owner team" size="small" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          <TextField label="Description" size="small" multiline minRows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <TextField label="Tags (comma separated)" size="small" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={devOnly} onChange={(e) => setDevOnly(e.target.checked)} />}
            label="Development only — never served to Approved/Production"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy || form.key.trim() === '' || !valid} onClick={submit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ConfigurationsPage() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('Dev')
  const [items, setItems] = useState<ConfigDefinition[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState<ConfigDefinition | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    listConfigurations({ search, category, type, page: page + 1, pageSize })
      .then((result) => {
        setItems(result.items)
        setTotalItems(result.totalItems)
        setLoadError('')
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Failed to load configurations.'))
  }, [search, category, type, page, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mr: 'auto' }}>
          Configurations
        </Typography>
        <TextField
          size="small"
          placeholder="Search key, description, owner"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          sx={{ width: 280 }}
        />
        <TextField select size="small" label="Category" value={category} sx={{ width: 150 }}
          onChange={(e) => { setCategory(e.target.value); setPage(0) }}>
          <MenuItem value="">All</MenuItem>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Type" value={type} sx={{ width: 130 }}
          onChange={(e) => { setType(e.target.value); setPage(0) }}>
          <MenuItem value="">All</MenuItem>
          {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <IconButton onClick={load} size="small"><RefreshIcon /></IconButton>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New
          </Button>
        )}
      </Stack>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Card variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Current Value</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Last Modified</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loadError && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No configurations found. Click New to create the first one.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((config) => (
              <TableRow key={config.key} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(config)}>
                <TableCell sx={{ fontFamily: 'Consolas, monospace' }}>
                  {config.key}
                  {config.developmentOnly && <Chip size="small" color="info" label="DEV" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{config.category}</TableCell>
                <TableCell>{config.type}</TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {config.type === 'Boolean' ? (
                    <Chip
                      size="small"
                      label={config.currentValue === true ? 'ON' : 'OFF'}
                      color={config.currentValue === true ? 'success' : 'default'}
                      variant={config.currentValue === true ? 'filled' : 'outlined'}
                    />
                  ) : (
                    formatValue(config.currentValue)
                  )}
                </TableCell>
                <TableCell>{config.owner}</TableCell>
                <TableCell>
                  {config.status === 'Active'
                    ? <Typography variant="caption" color="success.main">Active</Typography>
                    : <Chip size="small" color="warning" label={config.status} />}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {config.tags.slice(0, 3).map((tag) => <Chip key={tag} size="small" variant="outlined" label={tag} />)}
                  </Stack>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatIST(config.lastModified)}
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
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Card>

      <DetailDrawer
        config={selected}
        onClose={() => setSelected(null)}
        onSaved={(message) => {
          setToast(message)
          load()
        }}
      />
      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(message) => {
          setToast(message)
          load()
        }}
      />
      <Snackbar open={toast !== ''} autoHideDuration={5000} onClose={() => setToast('')} message={toast} />
    </Box>
  )
}
