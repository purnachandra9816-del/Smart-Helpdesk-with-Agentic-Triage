import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  traceId: {
    type: String,
    required: true
  },
  actor: {
    type: String,
    enum: ['system', 'agent', 'user'],
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'TICKET_CREATED',
      'AGENT_CLASSIFIED',
      'KB_RETRIEVED',
      'DRAFT_GENERATED',
      'AUTO_CLOSED',
      'ASSIGNED_TO_HUMAN',
      'REPLY_SENT',
      'STATUS_CHANGED',
      'TICKET_RESOLVED',
      'TICKET_REOPENED'
    ]
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes for efficient queries
auditLogSchema.index({ ticketId: 1, timestamp: -1 });
auditLogSchema.index({ traceId: 1 });
auditLogSchema.index({ action: 1 });

export default mongoose.model('AuditLog', auditLogSchema);