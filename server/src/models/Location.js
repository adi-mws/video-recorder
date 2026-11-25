import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      default: 'Anonymous',
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
    },
    altitude: {
      type: Number,
      default: null,
    },
    source: {
      type: String,
      enum: ['api', 'socket'],
      default: 'socket',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Location = mongoose.model('Location', locationSchema);

export default Location;

