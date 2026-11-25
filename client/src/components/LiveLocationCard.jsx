import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid2,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import LiveMap from './LiveMap';

const INTERVAL_OPTIONS = [3, 5, 10, 30, 60];

export default function LiveLocationCard({
  latest,
  history,
  trackingStatus,
  socketConnected,
  intervalSec,
  onStartTracking,
  onStopTracking,
  onIntervalChange,
  onClear,
}) {
  const [autoFollow, setAutoFollow] = useState(true);

  const isLive = Boolean(trackingStatus?.tracking);
  const speedKmh =
    typeof latest?.speed === 'number' && latest.speed >= 0
      ? (latest.speed * 3.6).toFixed(1)
      : '0.0';

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <LocalShippingIcon color="primary" />
            <Typography variant="h6">Live Phone Location Tracker</Typography>
            <Chip
              icon={<MyLocationIcon />}
              label={
                isLive
                  ? `Tracking Live (${intervalSec}s)`
                  : latest
                  ? `Stopped (${intervalSec}s)`
                  : 'Waiting for Phone'
              }
              color={isLive ? 'success' : latest ? 'warning' : 'default'}
              size="small"
            />
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 120 }} disabled={!socketConnected}>
              <InputLabel id="interval-select-label">Interval</InputLabel>
              <Select
                labelId="interval-select-label"
                value={intervalSec}
                label="Interval"
                onChange={(e) => onIntervalChange(Number(e.target.value))}
              >
                {INTERVAL_OPTIONS.map((sec) => (
                  <MenuItem key={sec} value={sec}>
                    Every {sec}s
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isLive ? (
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={<StopIcon />}
                onClick={onStopTracking}
                disabled={!socketConnected}
              >
                Stop
              </Button>
            ) : (
              <Button
                size="small"
                color="success"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={onStartTracking}
                disabled={!socketConnected}
              >
                Start
              </Button>
            )}

            {latest && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={autoFollow}
                    onChange={(e) => setAutoFollow(e.target.checked)}
                  />
                }
                label="Auto-follow"
                sx={{ mr: 0 }}
              />
            )}
            {latest && (
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={`https://www.google.com/maps?q=${latest.latitude},${latest.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Maps
              </Button>
            )}
            {history.length > 0 && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteSweepIcon />}
                onClick={onClear}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        {!latest ? (
          <Typography variant="body2" color="text.secondary">
            Waiting for the phone app to open and send its initial GPS fix. Use the Start/Stop and Interval controls above to manage tracking remotely.
          </Typography>
        ) : (
          <Grid2 container spacing={2.5}>
            <Grid2 size={{ xs: 12, lg: 8.5 }}>
              <LiveMap
                latest={latest}
                history={history}
                autoFollow={autoFollow}
                onAutoFollowChange={setAutoFollow}
              />
            </Grid2>

            <Grid2 size={{ xs: 12, lg: 3.5 }}>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Coordinates
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Lat: ${latest.latitude.toFixed(6)}`} size="small" />
                  <Chip label={`Lng: ${latest.longitude.toFixed(6)}`} size="small" />
                  {typeof latest.accuracy === 'number' && (
                    <Chip label={`Accuracy: ±${Math.round(latest.accuracy)} m`} size="small" />
                  )}
                  <Chip label={`Speed: ${speedKmh} km/h`} size="small" />
                  <Chip
                    label={`Via: ${latest.source === 'api' ? 'REST API' : 'WebSocket'}`}
                    color="info"
                    size="small"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  User: {latest.username} • Updated:{' '}
                  {new Date(latest.recordedAt || latest.createdAt).toLocaleTimeString()}
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>
                Recent Route Breadcrumbs ({history.length})
              </Typography>
              <List dense disablePadding sx={{ maxHeight: 340, overflow: 'auto' }}>
                {history.slice(0, 15).map((pt, idx) => (
                  <ListItem key={pt._id || `${pt.recordedAt}-${idx}`} disableGutters>
                    <ListItemText
                      primary={`${pt.latitude.toFixed(5)}, ${pt.longitude.toFixed(5)}`}
                      secondary={`${pt.source === 'api' ? 'API' : 'Socket'} • ${new Date(
                        pt.recordedAt || pt.createdAt
                      ).toLocaleTimeString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid2>
          </Grid2>
        )}
      </CardContent>
    </Card>
  );
}
