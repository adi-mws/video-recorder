import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function normalizeServerUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Resolve the backend URL automatically:
 * 1. Explicit EXPO_PUBLIC_API_URL in mobile/.env
 * 2. Metro/Expo Go host LAN IP (so physical phones connect to the dev PC automatically)
 * 3. Android Emulator loopback (10.0.2.2) or localhost
 */
export function getDefaultServerUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return normalizeServerUrl(envUrl);
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}
