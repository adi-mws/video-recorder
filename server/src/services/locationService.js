import Location from '../models/Location.js';
import { isDbConnected } from '../config/db.js';

function toNullableNumber(val) {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/**
 * Validate coordinates, persist to MongoDB when connected, and broadcast via Socket.IO.
 */
export async function saveAndBroadcastLocation(io, payload, source = 'socket') {
  const latitude = Number(payload?.latitude);
  const longitude = Number(payload?.longitude);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    const err = new Error('Valid latitude (-90 to 90) is required.');
    err.status = 400;
    throw err;
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const err = new Error('Valid longitude (-180 to 180) is required.');
    err.status = 400;
    throw err;
  }

  const record = {
    username: payload?.username?.trim() || 'Anonymous',
    latitude,
    longitude,
    accuracy: toNullableNumber(payload?.accuracy),
    speed: toNullableNumber(payload?.speed),
    heading: toNullableNumber(payload?.heading),
    altitude: toNullableNumber(payload?.altitude),
    source,
    recordedAt: payload?.recordedAt ? new Date(payload.recordedAt) : new Date(),
  };

  let saved = null;
  if (isDbConnected()) {
    const doc = await Location.create(record);
    saved = doc.toObject();
  } else {
    saved = {
      _id: `live-${Date.now()}`,
      ...record,
      recordedAt: record.recordedAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  io.emit('location:updated', saved);
  return saved;
}

