import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#7b1fa2',
    },
    background: {
      default: '#f5f7fb',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

export default theme;

