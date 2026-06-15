import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ConfigType } from '../api/types'

interface Props {
  type: ConfigType
  value: unknown
  allowedValues?: unknown[] | null
  onChange: (value: unknown, valid: boolean) => void
  label?: string
}

/** Type-aware editor for a configuration value. */
export default function ValueEditor({ type, value, allowedValues, onChange, label }: Props) {
  if (allowedValues && allowedValues.length > 0) {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label={label ?? 'Value'}
        value={JSON.stringify(value)}
        onChange={(e) => onChange(JSON.parse(e.target.value), true)}
      >
        {allowedValues.map((allowed) => (
          <MenuItem key={JSON.stringify(allowed)} value={JSON.stringify(allowed)}>
            {String(allowed)}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  switch (type) {
    case 'Boolean':
      return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Switch checked={value === true} onChange={(e) => onChange(e.target.checked, true)} />
          <Typography variant="body2" color={value === true ? 'success.main' : 'text.secondary'}>
            {value === true ? 'Enabled' : 'Disabled'}
          </Typography>
        </Stack>
      )
    case 'Integer':
    case 'Float':
      return (
        <TextField
          fullWidth
          size="small"
          type="number"
          label={label ?? 'Value'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const text = e.target.value
            const parsed = type === 'Integer' ? parseInt(text, 10) : parseFloat(text)
            onChange(Number.isNaN(parsed) ? text : parsed, !Number.isNaN(parsed))
          }}
        />
      )
    case 'String':
      return (
        <TextField
          fullWidth
          size="small"
          label={label ?? 'Value'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value, true)}
        />
      )
    case 'JsonObject':
    case 'JsonArray': {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      return (
        <TextField
          fullWidth
          multiline
          minRows={4}
          size="small"
          label={label ?? 'JSON value'}
          value={text}
          slotProps={{ input: { sx: { fontFamily: 'Consolas, monospace', fontSize: 12 } } }}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value), true)
            } catch {
              onChange(e.target.value, false)
            }
          }}
        />
      )
    }
  }
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
