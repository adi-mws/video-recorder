import { saveAndBroadcastLocation } from '../services/locationService.js';

/**
 * Configure Socket.IO event handlers for live location tracking and remote control.
 */
export function registerSocketHandlers(io) {
  const trackingConfig = {
    tracking: true,
    intervalSec: 5,
  };

  const broadcastUserCount = () => {
    io.emit('users:count', io.engine.clientsCount);
  };

  io.on('connection', (socket) => {
    const username = socket.user?.username || 'Anonymous';
    console.log(`[Socket.IO] Client connected: ${socket.id} (${username})`);
    broadcastUserCount();

    socket.emit('tracking:sync', { ...trackingConfig });

    socket.on('location:start', (payload) => {
      trackingConfig.tracking = true;
      if (typeof payload?.intervalSec === 'number') {
        trackingConfig.intervalSec = payload.intervalSec;
      }
      io.emit('location:status', {
        username,
        tracking: true,
        intervalSec: trackingConfig.intervalSec,
        mode: payload?.mode || 'foreground',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('location:stop', (payload) => {
      trackingConfig.tracking = false;
      io.emit('location:status', {
        username,
        tracking: false,
        intervalSec: payload?.intervalSec ?? trackingConfig.intervalSec,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('tracking:command', (payload) => {
      if (payload?.action === 'start') {
        trackingConfig.tracking = true;
      } else if (payload?.action === 'stop') {
        trackingConfig.tracking = false;
      }
      if (typeof payload?.intervalSec === 'number' && payload.intervalSec >= 1) {
        trackingConfig.intervalSec = payload.intervalSec;
      }

      const command = {
        action: payload?.action || 'setInterval',
        tracking: trackingConfig.tracking,
        intervalSec: trackingConfig.intervalSec,
        from: username,
        timestamp: new Date().toISOString(),
      };

      socket.broadcast.emit('tracking:command', command);
      io.emit('location:status', {
        username,
        tracking: trackingConfig.tracking,
        intervalSec: trackingConfig.intervalSec,
        timestamp: command.timestamp,
      });
    });

    socket.on('location:update', async (payload, callback) => {
      try {
        const point = await saveAndBroadcastLocation(
          io,
          { ...payload, username },
          'socket'
        );
        if (typeof callback === 'function') {
          callback({ ok: true, point });
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: error.message });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${username}, ${reason})`);
      broadcastUserCount();
    });
  });
}
