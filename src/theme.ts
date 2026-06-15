import { createTheme } from '@mui/material/styles'

// Frontend Design Specification color system: industrial, data-focused,
// company colors black + yellow. 70% Grafana / 20% Unreal Editor / 10% GitLab.
export const ENV_COLORS: Record<string, string> = {
  Development: '#2196F3',
  Approved: '#FFC300',
  Production: '#FF5252',
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#111111',
      paper: '#1B1B1B',
    },
    primary: { main: '#FFC300' },
    error: { main: '#FF5252' },
    success: { main: '#4CAF50' },
    info: { main: '#2196F3' },
    warning: { main: '#FFB000' },
    text: {
      primary: '#F5F5F5',
      secondary: '#A0A0A0',
    },
    divider: '#303030',
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 13,
  },
  shape: { borderRadius: 4 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#303030' },
        head: { color: '#A0A0A0', fontWeight: 600, whiteSpace: 'nowrap' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#1B1B1B', borderBottom: '1px solid #303030' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#161616', borderRight: '1px solid #303030' },
      },
    },
  },
})
