import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export function connectSocket(token) {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}

export function disconnectSocket() {
  socket.auth = {};
  if (socket.connected) {
    socket.disconnect();
  }
}
