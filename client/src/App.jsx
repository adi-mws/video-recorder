import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import StorageIcon from '@mui/icons-material/Storage';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import api, { getAuthToken, setAuthToken } from './services/api';
import { connectSocket, disconnectSocket, socket } from './services/socket';
import LoginForm from './components/LoginForm';
import LiveLocationCard from './components/LiveLocationCard';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dbConnected, setDbConnected] = useState(false);
  const [error, setError] = useState('');
  const [latestLocation, setLatestLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [intervalSec, setIntervalSec] = useState(5);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    disconnectSocket();
    setUser(null);
    setLatestLocation(null);
    setLocationHistory([]);
    setTrackingStatus(null);
    setSocketConnected(false);
    setOnlineCount(0);
    setError('');
  }, []);

  const loadHealthAndLocations = useCallback(async () => {
    try {
      const { data: health } = await api.get('/health');
      setDbConnected(Boolean(health.dbConnected));
      const { data: locData } = await api.get('/location');
      setLatestLocation(locData.latest || null);
      setLocationHistory(locData.history || []);
      setError(
        health.dbConnected
          ? ''
          : 'MongoDB is not connected yet. Live Socket.IO updates work, but history will not persist.'
      );
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
        return;
      }
      setError(err.response?.data?.error || 'Could not reach the Express server.');
    }
  }, [handleLogout]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        connectSocket(token);
      })
      .catch(() => {
        setAuthToken(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    loadHealthAndLocations();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onConnectError = (err) => {
      setSocketConnected(false);
      if (
        err.message === 'Authentication required' ||
        err.message === 'Invalid or expired token'
      ) {
        handleLogout();
      }
    };
    const onUsersCount = (count) => setOnlineCount(count);
    const onTrackingSync = (cfg) => {
      if (typeof cfg?.intervalSec === 'number') {
        setIntervalSec(cfg.intervalSec);
      }
      setTrackingStatus((prev) => ({
        username: prev?.username || user.username,
        tracking: Boolean(cfg?.tracking),
        intervalSec: cfg?.intervalSec ?? 5,
      }));
    };
    const onLocationUpdated = (point) => {
      setLatestLocation(point);
      setLocationHistory((prev) => [point, ...prev].slice(0, 25));
      setTrackingStatus((prev) => ({
        username: point.username,
        tracking: prev?.tracking ?? true,
        intervalSec: prev?.intervalSec ?? intervalSec,
        timestamp: point.recordedAt || point.createdAt,
      }));
    };
    const onLocationStatus = (status) => {
      setTrackingStatus(status);
      if (typeof status?.intervalSec === 'number') {
        setIntervalSec(status.intervalSec);
      }
    };
    const onLocationCleared = () => {
      setLatestLocation(null);
      setLocationHistory([]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('users:count', onUsersCount);
    socket.on('tracking:sync', onTrackingSync);
    socket.on('location:updated', onLocationUpdated);
    socket.on('location:status', onLocationStatus);
    socket.on('location:cleared', onLocationCleared);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('users:count', onUsersCount);
      socket.off('tracking:sync', onTrackingSync);
      socket.off('location:updated', onLocationUpdated);
      socket.off('location:status', onLocationStatus);
      socket.off('location:cleared', onLocationCleared);
    };
  }, [user, loadHealthAndLocations, handleLogout, intervalSec]);

  const handleStartTracking = () => {
    socket.emit('tracking:command', {
      action: 'start',
      intervalSec,
    });
  };

  const handleStopTracking = () => {
    socket.emit('tracking:command', {
      action: 'stop',
      intervalSec,
    });
  };

  const handleIntervalChange = (nextSec) => {
    setIntervalSec(nextSec);
    socket.emit('tracking:command', {
      action: 'setInterval',
      intervalSec: nextSec,
    });
  };

  const handleClearLocations = async () => {
    try {
      await api.delete('/location');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear location history.');
    }
  };

  const handleLoginSuccess = ({ token, user: loggedInUser }) => {
    setAuthToken(token);
    setUser(loggedInUser);
    connectSocket(token);
  };

  if (checkingAuth) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Live Location Tracker
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<PersonIcon />}
              label={user.username}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }}
            />
            <Chip
              icon={socketConnected ? <WifiIcon /> : <WifiOffIcon />}
              label={socketConnected ? 'Socket Connected' : 'Socket Disconnected'}
              color={socketConnected ? 'success' : 'error'}
              size="small"
              variant="filled"
            />
            <Chip
              icon={<PeopleIcon />}
              label={`${onlineCount} Online`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }}
            />
            <Chip
              icon={<StorageIcon />}
              label={dbConnected ? 'MongoDB Connected' : 'MongoDB Offline'}
              color={dbConnected ? 'success' : 'warning'}
              size="small"
            />
            <Button
              color="inherit"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ ml: 1 }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {error && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={loadHealthAndLocations}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <LiveLocationCard
          latest={latestLocation}
          history={locationHistory}
          trackingStatus={trackingStatus}
          socketConnected={socketConnected}
          intervalSec={intervalSec}
          onStartTracking={handleStartTracking}
          onStopTracking={handleStopTracking}
          onIntervalChange={handleIntervalChange}
          onClear={handleClearLocations}
        />
      </Container>
    </Box>
  );
}
