import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import './src/tasks/locationTask';
import { getDefaultServerUrl } from './src/config/server';
import { loginRequest, postLocationRequest } from './src/services/api';
import { createSocketClient } from './src/services/socket';
import {
  getStoredToken,
  setStoredServerUrl,
  setStoredToken,
} from './src/services/storage';
import {
  setActiveLocationSocket,
  startBackgroundLocationTask,
  stopBackgroundLocationTask,
} from './src/tasks/locationTask';

const AUTH_USERNAME = process.env.EXPO_PUBLIC_AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.EXPO_PUBLIC_AUTH_PASSWORD || 'changeme123';

export default function App() {
  const socketRef = useRef(null);
  const intervalTimerRef = useRef(null);
  const watcherTimerRef = useRef(null);
  const stateRef = useRef({
    tracking: true,
    intervalSec: 5,
    serverUrl: getDefaultServerUrl(),
    token: null,
    fgGranted: false,
    bgGranted: false,
    servicesEnabled: false,
    emitting: false,
    activeMode: '',
    askedPermissionsOnce: false,
    syncing: false,
  });

  useEffect(() => {
    let active = true;
    let authRetryTimer = null;

    const clearForegroundTimer = () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
    };

    const pauseEmissionSilently = async () => {
      clearForegroundTimer();
      if (stateRef.current.emitting) {
        stateRef.current.emitting = false;
        stateRef.current.activeMode = '';
        await stopBackgroundLocationTask().catch(() => {});
      }
    };

    const sendSingleFix = async (useRestApi = false) => {
      const { fgGranted, servicesEnabled, serverUrl, token } = stateRef.current;
      if (!fgGranted || !servicesEnabled || !token) return;

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          altitude: pos.coords.altitude ?? null,
          recordedAt: new Date(pos.timestamp || Date.now()).toISOString(),
        };

        const socket = socketRef.current;
        if (!useRestApi && socket?.connected) {
          socket.emit('location:update', coords);
        } else {
          await postLocationRequest(serverUrl, token, coords);
        }
      } catch {
        // Remain silent if location becomes unavailable mid-call
      }
    };

    const checkPermissionsAndServices = async (allowPrompt = false) => {
      let servicesEnabled = false;
      try {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch {
        servicesEnabled = false;
      }

      let fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== 'granted' && allowPrompt && fg.canAskAgain) {
        fg = await Location.requestForegroundPermissionsAsync();
      }

      let bgGranted = false;
      if (fg.status === 'granted') {
        try {
          let bg = await Location.getBackgroundPermissionsAsync();
          if (bg.status !== 'granted' && allowPrompt && bg.canAskAgain) {
            bg = await Location.requestBackgroundPermissionsAsync();
          }
          bgGranted = bg.status === 'granted';
        } catch {
          bgGranted = false;
        }
      }

      stateRef.current.servicesEnabled = servicesEnabled;
      stateRef.current.fgGranted = fg.status === 'granted';
      stateRef.current.bgGranted = bgGranted;

      return {
        servicesEnabled,
        fgGranted: stateRef.current.fgGranted,
        bgGranted,
      };
    };

    const startEmission = async (seconds = stateRef.current.intervalSec) => {
      clearForegroundTimer();

      await sendSingleFix(true);

      let mode = 'foreground';
      if (stateRef.current.bgGranted) {
        try {
          await startBackgroundLocationTask(seconds);
          mode = 'background';
        } catch {
          mode = 'foreground';
        }
      }

      if (mode === 'foreground') {
        intervalTimerRef.current = setInterval(() => {
          if (
            stateRef.current.tracking &&
            stateRef.current.servicesEnabled &&
            stateRef.current.fgGranted
          ) {
            sendSingleFix(false);
          }
        }, seconds * 1000);
      }

      stateRef.current.emitting = true;
      stateRef.current.activeMode = mode;
      socketRef.current?.emit('location:start', {
        intervalSec: seconds,
        mode,
      });
    };

    const syncLocationState = async ({ forceRestart = false } = {}) => {
      if (!active || stateRef.current.syncing) return;
      stateRef.current.syncing = true;

      try {
        if (!stateRef.current.tracking) {
          await pauseEmissionSilently();
          return;
        }

        const allowPrompt = !stateRef.current.askedPermissionsOnce;
        stateRef.current.askedPermissionsOnce = true;

        const { servicesEnabled, fgGranted } =
          await checkPermissionsAndServices(allowPrompt);

        if (!servicesEnabled || !fgGranted) {
          await pauseEmissionSilently();
          return;
        }

        if (forceRestart || !stateRef.current.emitting) {
          await startEmission(stateRef.current.intervalSec);
        }
      } finally {
        stateRef.current.syncing = false;
      }
    };

    const stopAllTracking = async () => {
      stateRef.current.tracking = false;
      await pauseEmissionSilently();
      socketRef.current?.emit('location:stop', {
        intervalSec: stateRef.current.intervalSec,
      });
    };

    const applyRemoteConfig = async (cfg) => {
      const nextInterval =
        typeof cfg?.intervalSec === 'number' && cfg.intervalSec >= 1
          ? cfg.intervalSec
          : stateRef.current.intervalSec;
      const shouldTrack =
        typeof cfg?.tracking === 'boolean' ? cfg.tracking : stateRef.current.tracking;

      const intervalChanged = nextInterval !== stateRef.current.intervalSec;
      stateRef.current.intervalSec = nextInterval;

      if (!shouldTrack) {
        await stopAllTracking();
        return;
      }

      stateRef.current.tracking = true;
      await syncLocationState({ forceRestart: intervalChanged || !stateRef.current.emitting });
    };

    const connectAuthAndSocket = async () => {
      const serverUrl = getDefaultServerUrl();
      stateRef.current.serverUrl = serverUrl;
      await setStoredServerUrl(serverUrl);

      let token = null;
      try {
        const auth = await loginRequest(serverUrl, AUTH_USERNAME, AUTH_PASSWORD);
        token = auth?.token || null;
        if (token) {
          await setStoredToken(token);
        }
      } catch {
        token = await getStoredToken();
      }

      if (!active) return;

      if (!token) {
        authRetryTimer = setTimeout(() => {
          if (active) connectAuthAndSocket();
        }, 5000);
        return;
      }

      stateRef.current.token = token;

      const socket = createSocketClient(serverUrl, token);
      socketRef.current = socket;
      setActiveLocationSocket(socket);

      socket.on('connect', () => {
        if (
          stateRef.current.tracking &&
          stateRef.current.fgGranted &&
          stateRef.current.servicesEnabled
        ) {
          sendSingleFix(false);
        }
      });

      socket.on('tracking:sync', (cfg) => {
        if (active) {
          applyRemoteConfig(cfg);
        }
      });

      socket.on('tracking:command', (cmd) => {
        if (!active) return;
        if (cmd?.action === 'stop') {
          applyRemoteConfig({ tracking: false, intervalSec: cmd.intervalSec });
        } else if (cmd?.action === 'start') {
          applyRemoteConfig({ tracking: true, intervalSec: cmd.intervalSec });
        } else if (cmd?.action === 'setInterval') {
          const nextSec = cmd.intervalSec || stateRef.current.intervalSec;
          const changed = nextSec !== stateRef.current.intervalSec;
          stateRef.current.intervalSec = nextSec;
          if (stateRef.current.tracking && changed) {
            syncLocationState({ forceRestart: true });
          }
        }
      });
    };

    // Silently watch for OS Location toggle changes (Settings / Quick Settings)
    // and auto-resume emitting as soon as location is turned back ON.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && active) {
        syncLocationState();
      }
    });

    watcherTimerRef.current = setInterval(() => {
      if (active && AppState.currentState === 'active') {
        syncLocationState();
      }
    }, 4000);

    setStoredServerUrl(getDefaultServerUrl()).catch(() => {});
    syncLocationState({ forceRestart: true });
    connectAuthAndSocket();

    return () => {
      active = false;
      if (authRetryTimer) clearTimeout(authRetryTimer);
      if (watcherTimerRef.current) clearInterval(watcherTimerRef.current);
      appStateSub.remove();
      clearForegroundTimer();
      setActiveLocationSocket(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.blank}>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
