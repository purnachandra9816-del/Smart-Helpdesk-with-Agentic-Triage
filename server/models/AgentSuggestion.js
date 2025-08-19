import mongoose from 'mongoose';

const agentSuggestionSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  predictedCategory: {
    type: String,
    enum: ['billing', 'tech', 'shipping', 'other'],
    required: true
  },
  articleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  }],
  draftReply: {
    type: String,
    required: true,
    maxlength: 5000
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  autoClosed: {
    type: Boolean,
    default: false
  },
  modelInfo: {
    provider: {
      type: String,
      default: 'stub'
    },
    model: {
      type: String,
      default: 'deterministic-v1'
    },
    promptVersion: {
      type: String,
      default: '1.0.0'
    },
    latencyMs: {
      type: Number,
      default: 0
    }
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes
agentSuggestionSchema.index({ ticketId: 1 });
agentSuggestionSchema.index({ confidence: -1 });
agentSuggestionSchema.index({ autoClosed: 1 });

export default mongoose.model('AgentSuggestion', agentSuggestionSchema);