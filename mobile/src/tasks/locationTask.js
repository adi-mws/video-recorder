import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getDefaultServerUrl } from '../config/server';
import { loginRequest, postLocationRequest } from '../services/api';
import { createSocketClient } from '../services/socket';
import {
  getStoredServerUrl,
  getStoredToken,
  setStoredToken,
} from '../services/storage';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

const AUTH_USERNAME = process.env.EXPO_PUBLIC_AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.EXPO_PUBLIC_AUTH_PASSWORD || 'changeme123';

let activeSocket = null;

export function setActiveLocationSocket(socket) {
  activeSocket = socket;
}

function formatCoords(loc) {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    speed: loc.coords.speed ?? null,
    heading: loc.coords.heading ?? null,
    altitude: loc.coords.altitude ?? null,
    recordedAt: new Date(loc.timestamp || Date.now()).toISOString(),
  };
}

function emitViaTemporarySocket(serverUrl, token, coords) {
  return new Promise((resolve, reject) => {
    const tempSocket = createSocketClient(serverUrl, token);
    const timeout = setTimeout(() => {
      tempSocket.disconnect();
      reject(new Error('Socket timeout'));
    }, 4500);

    tempSocket.on('connect', () => {
      tempSocket.emit('location:update', coords, (ack) => {
        clearTimeout(timeout);
        tempSocket.disconnect();
        if (ack?.ok) resolve(ack);
        else reject(new Error(ack?.error || 'Location ack failed'));
      });
    });

    tempSocket.on('connect_error', (err) => {
      clearTimeout(timeout);
      tempSocket.disconnect();
      reject(err);
    });
  });
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;

  const latest = data.locations[data.locations.length - 1];
  const coords = formatCoords(latest);

  if (activeSocket?.connected) {
    activeSocket.emit('location:update', coords);
    return;
  }

  try {
    const [savedUrl, savedToken] = await Promise.all([
      getStoredServerUrl(),
      getStoredToken(),
    ]);
    const serverUrl = savedUrl || getDefaultServerUrl();
    let token = savedToken;

    if (!token) {
      const auth = await loginRequest(serverUrl, AUTH_USERNAME, AUTH_PASSWORD);
      token = auth?.token || null;
      if (token) {
        await setStoredToken(token);
      }
    }

    if (!token || !serverUrl) return;

    try {
      await emitViaTemporarySocket(serverUrl, token, coords);
    } catch {
      await postLocationRequest(serverUrl, token, coords);
    }
  } catch {
    // Ignore transient network errors in background; next interval will retry.
  }
});

export async function startBackgroundLocationTask(intervalSec = 5) {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  const intervalMs = intervalSec * 1000;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: intervalMs,
    distanceInterval: 0,
    deferredUpdatesInterval: intervalMs,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Live Location Tracking',
      notificationBody: 'Sharing your location in the background',
      notificationColor: '#1976d2',
    },
  });
}

export async function stopBackgroundLocationTask() {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
