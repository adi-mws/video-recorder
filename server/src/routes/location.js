import { Router } from 'express';
import Location from '../models/Location.js';
import { isDbConnected } from '../config/db.js';
import { saveAndBroadcastLocation } from '../services/locationService.js';

/**
 * REST endpoints for recording and retrieving tracked locations.
 */
export function createLocationRouter(io) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      if (!isDbConnected()) {
        return res.json({ latest: null, history: [] });
      }
      const history = await Location.find()
        .sort({ recordedAt: -1, createdAt: -1 })
        .limit(25)
        .lean();
      return res.json({
        latest: history[0] || null,
        history,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const point = await saveAndBroadcastLocation(
        io,
        {
          ...req.body,
          username: req.user?.username || req.body?.username || 'Anonymous',
        },
        'api'
      );
      return res.status(201).json(point);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/', async (_req, res, next) => {
    try {
      if (isDbConnected()) {
        await Location.deleteMany({});
      }
      io.emit('location:cleared');
      return res.json({ cleared: true });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

