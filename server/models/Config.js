import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  autoCloseEnabled: {
    type: Boolean,
    default: true
  },
  confidenceThreshold: {
    type: Number,
    default: 0.78,
    min: 0,
    max: 1
  },
  slaHours: {
    type: Number,
    default: 24,
    min: 1
  },
  categoryThresholds: {
    billing: {
      type: Number,
      default: 0.75,
      min: 0,
      max: 1
    },
    tech: {
      type: Number,
      default: 0.80,
      min: 0,
      max: 1
    },
    shipping: {
      type: Number,
      default: 0.70,
      min: 0,
      max: 1
    },
    other: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Config', configSchema);