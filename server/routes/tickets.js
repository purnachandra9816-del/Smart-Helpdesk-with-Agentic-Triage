import express from 'express';
import Ticket from '../models/Ticket.js';
import AuditLog from '../models/AuditLog.js';
import AgentSuggestion from '../models/AgentSuggestion.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { ticketLimiter } from '../middleware/rateLimiter.js';
import agentService from '../services/agentService.js';

const router = express.Router();

// Get tickets with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      assignee, 
      page = 1, 
      limit = 20,
      myTickets = false,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    // Build filter
    let filter = {};
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (assignee) filter.assignee = assignee;

    // Role-based filtering
    if (req.user.role === 'user' || myTickets === 'true') {
      filter.createdBy = req.user._id;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const tickets = await Ticket.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .populate('assignee', 'name email')
      .lean();

    const total = await Ticket.countDocuments(filter);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ 
      error: 'Failed to get tickets' 
    });
  }
});

// Get single ticket with full details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignee', 'name email')
      .populate({
        path: 'replies.author',
        select: 'name email role'
      });

    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ticket not found' 
      });
    }

    // Check access permissions
    const isOwner = ticket.createdBy._id.equals(req.user._id);
    const isAgentOrAdmin = ['agent', 'admin'].includes(req.user.role);

    if (!isOwner && !isAgentOrAdmin) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Get agent suggestion if exists
    let agentSuggestion = null;
    if (ticket.agentSuggestionId) {
      agentSuggestion = await AgentSuggestion.findById(ticket.agentSuggestionId)
        .populate('articleIds', 'title body tags');
    }

    // Get audit logs
    const auditLogs = await AuditLog.find({ ticketId: ticket._id })
      .sort({ timestamp: 1 })
      .populate('actorId', 'name email')
      .lean();

    res.json({
      ticket,
      agentSuggestion,
      auditLogs
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid ticket ID' 
      });
    }
    res.status(500).json({ 
      error: 'Failed to get ticket' 
    });
  }
});

// Create ticket
router.post('/', 
  authenticate, 
  ticketLimiter, 
  validate(schemas.createTicket), 
  async (req, res) => {
    try {
      const { title, description, category, attachmentUrls } = req.body;

      const ticket = new Ticket({
        title,
        description,
        category,
        attachmentUrls: attachmentUrls || [],
        createdBy: req.user._id,
        status: 'open'
      });

      await ticket.save();
      await ticket.populate('createdBy', 'name email');

      // Trigger agent triage asynchronously
      setTimeout(async () => {
        try {
          await agentService.triageTicket(ticket._id);
        } catch (error) {
          console.error(`Failed to triage ticket ${ticket._id}:`, error);
        }
      }, 100); // Small delay to ensure response is sent first

      res.status(201).json({
        message: 'Ticket created successfully',
        ticket
      });

    } catch (error) {
      console.error('Create ticket error:', error);
      res.status(500).json({ 
        error: 'Failed to create ticket' 
      });
    }
  }
);

// Reply to ticket
router.post('/:id/reply', 
  authenticate, 
  authorize('agent', 'admin'),
  validate(schemas.replyToTicket), 
  async (req, res) => {
    try {
      const { content, isInternal, status } = req.body;
      
      const ticket = await Ticket.findById(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ 
          error: 'Ticket not found' 
        });
      }

      // Add reply
      ticket.replies.push({
        author: req.user._id,
        content,
        isInternal: isInternal || false,
        timestamp: new Date()
      });

      // Update status if provided
      if (status && status !== ticket.status) {
        ticket.status = status;
        
        if (status === 'resolved') {
          ticket.resolvedAt = new Date();
        } else if (status === 'closed') {
          ticket.closedAt = new Date();
        }
      }

      await ticket.save();
      await ticket.populate('replies.author', 'name email role');

      // Create audit log
      try {
        const auditLog = new AuditLog({
          ticketId: ticket._id,
          traceId: require('uuid').v4(),
          actor: 'agent',
          actorId: req.user._id,
          action: 'REPLY_SENT',
          meta: {
            replyLength: content.length,
            isInternal,
            statusChanged: status !== ticket.status,
            newStatus: status
          }
        });
        await auditLog.save();
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      res.json({
        message: 'Reply sent successfully',
        ticket
      });

    } catch (error) {
      console.error('Reply to ticket error:', error);
      res.status(500).json({ 
        error: 'Failed to send reply' 
      });
    }
  }
);

// Assign ticket
router.post('/:id/assign', 
  authenticate, 
  authorize('agent', 'admin'),
  async (req, res) => {
    try {
      const { assigneeId } = req.body;
      
      const ticket = await Ticket.findById(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ 
          error: 'Ticket not found' 
        });
      }

      // Validate assignee
      if (assigneeId) {
        const assignee = await User.findById(assigneeId);
        if (!assignee || !['agent', 'admin'].includes(assignee.role)) {
          return res.status(400).json({ 
            error: 'Invalid assignee' 
          });
        }
      }

      ticket.assignee = assigneeId || null;
      await ticket.save();
      await ticket.populate('assignee', 'name email');

      res.json({
        message: assigneeId ? 'Ticket assigned successfully' : 'Ticket unassigned successfully',
        ticket
      });

    } catch (error) {
      console.error('Assign ticket error:', error);
      res.status(500).json({ 
        error: 'Failed to assign ticket' 
      });
    }
  }
);

// Get ticket audit logs
router.get('/:id/audit', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ticket not found' 
      });
    }

    // Check access permissions
    const isOwner = ticket.createdBy.equals(req.user._id);
    const isAgentOrAdmin = ['agent', 'admin'].includes(req.user.role);

    if (!isOwner && !isAgentOrAdmin) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    const auditLogs = await AuditLog.find({ ticketId: ticket._id })
      .sort({ timestamp: 1 })
      .populate('actorId', 'name email')
      .lean();

    res.json({
      auditLogs
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      error: 'Failed to get audit logs' 
    });
  }
});

export default router;