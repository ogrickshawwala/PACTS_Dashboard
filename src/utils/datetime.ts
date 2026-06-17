// All timestamps from the backend are UTC ISO strings. The dashboard always
// renders them in IST (Asia/Kolkata, UTC+5:30) and labels them, so the
// displayed time is deterministic regardless of the viewer's machine timezone.

const IST_TIME_ZONE = 'Asia/Kolkata'

const formatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

// Backend timestamps are UTC, but SQLite drops the timezone so they often come
// back without a zone designator (e.g. "2026-06-16T12:00:00"). Treat any
// zone-less timestamp as UTC so the IST conversion is correct.
function asUtc(iso: string): string {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`
}

/** Format a UTC ISO timestamp as "16 Jun 2026, 05:30 pm IST". */
export function formatIST(iso: string | null | undefined, fallback = ''): string {
  if (!iso) return fallback
  const date = new Date(asUtc(iso))
  if (Number.isNaN(date.getTime())) return fallback
  return `${formatter.format(date)} IST`
}

// IST is a fixed UTC+5:30 offset (no DST).
const IST_OFFSET = '+05:30'

/** Convert a datetime-local value ("YYYY-MM-DDTHH:mm") entered as IST wall-clock
 *  time into a UTC ISO string, deterministically (independent of viewer TZ). */
export function istLocalToUtcISO(local: string): string {
  return new Date(`${local}:00${IST_OFFSET}`).toISOString()
}
