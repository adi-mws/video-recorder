import mongoose from 'mongoose';

/**
 * Connect to MongoDB using Mongoose without crashing the HTTP/Socket server
 * if a local MongoDB instance is not running yet.
 */
export async function connectDB(mongoUri) {
  if (!mongoUri) {
    console.warn('[DB] MONGO_URI is not defined; skipping MongoDB connection.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] Connected to MongoDB (${mongoose.connection.host})`);
    return true;
  } catch (error) {
    console.warn(`[DB] MongoDB connection failed: ${error.message}`);
    console.warn('[DB] Express and Socket.IO are running, but database routes require MongoDB.');
    return false;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

