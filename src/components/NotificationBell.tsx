import { useCallback, useEffect, useState } from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { listNotifications, markNotificationsRead } from '../api/client'
import type { AppNotification } from '../api/types'
import { formatIST } from '../utils/datetime'

const POLL_MS = 30000

export default function NotificationBell() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    try {
      const data = await listNotifications({ pageSize: 30 })
      setItems(data.items)
      setUnread(data.unreadCount)
    } catch {
      // Silently ignore; the bell is non-critical chrome.
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const markAll = async () => {
    try {
      const r = await markNotificationsRead()
      setUnread(r.unreadCount)
      void load()
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={(e) => { setAnchor(e.currentTarget); void load() }}>
          <Badge badgeContent={unread} color="error" max={99}>
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 380, maxHeight: 460, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" sx={{ p: 1.5, alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 'auto' }}>Notifications</Typography>
            <Button size="small" disabled={unread === 0} onClick={markAll}>Mark all read</Button>
          </Stack>
          <Divider />
          <Box sx={{ overflowY: 'auto' }}>
            {items.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No notifications.
              </Typography>
            ) : items.map((n) => (
              <Box
                key={n.id}
                sx={{
                  px: 1.5, py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: n.read ? 'transparent' : 'action.hover',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {n.type} · {formatIST(n.createdAt)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Popover>
    </>
  )
}
