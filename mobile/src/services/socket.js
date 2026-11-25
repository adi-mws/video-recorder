import { io } from 'socket.io-client';
import { normalizeServerUrl } from '../config/server';

/**
 * Create an authenticated Socket.IO client targeting the Express/Socket.IO backend.
 * Uses polling -> websocket upgrade (and tryAllTransports) so React Native / Expo Go
 * connects reliably across Android Emulator, iOS Simulator, and Wi-Fi devices.
 */
export function createSocketClient(serverUrl, token) {
  return io(normalizeServerUrl(serverUrl), {
    auth: { token },
    transports: ['polling', 'websocket'],
    tryAllTransports: true,
    upgrade: true,
    forceNew: true,
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
  });
}
