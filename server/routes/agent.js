import express from 'express';
import AgentSuggestion from '../models/AgentSuggestion.js';
import { authenticate, authorize } from '../middleware/auth.js';
import agentService from '../services/agentService.js';

const router = express.Router();

// Manual triage trigger (admin/agent only)
router.post('/triage', 
  authenticate, 
  authorize('agent', 'admin'),
  async (req, res) => {
    try {
      const { ticketId } = req.body;

      if (!ticketId) {
        return res.status(400).json({ 
          error: 'Ticket ID is required' 
        });
      }

      const result = await agentService.triageTicket(ticketId);

      res.json({
        message: 'Triage completed successfully',
        result
      });

    } catch (error) {
      console.error('Manual triage error:', error);
      res.status(500).json({ 
        error: 'Failed to complete triage' 
      });
    }
  }
);

// Get agent suggestion for ticket
router.get('/suggestion/:ticketId', 
  authenticate, 
  authorize('agent', 'admin'),
  async (req, res) => {
    try {
      const agentSuggestion = await AgentSuggestion.findOne({ 
        ticketId: req.params.ticketId 
      })
      .populate('ticketId', 'title description status')
      .populate('articleIds', 'title body tags category')
      .populate('approvedBy', 'name email');

      if (!agentSuggestion) {
        return res.status(404).json({ 
          error: 'No agent suggestion found for this ticket' 
        });
      }

      res.json({
        agentSuggestion
      });

    } catch (error) {
      console.error('Get agent suggestion error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          error: 'Invalid ticket ID' 
        });
      }
      res.status(500).json({ 
        error: 'Failed to get agent suggestion' 
      });
    }
  }
);

// Approve/edit agent suggestion
router.post('/suggestion/:id/approve', 
  authenticate, 
  authorize('agent', 'admin'),
  async (req, res) => {
    try {
      const { draftReply, approved = true } = req.body;

      const agentSuggestion = await AgentSuggestion.findById(req.params.id);
      
      if (!agentSuggestion) {
        return res.status(404).json({ 
          error: 'Agent suggestion not found' 
        });
      }

      // Update the draft if provided
      if (draftReply) {
        agentSuggestion.draftReply = draftReply;
      }

      agentSuggestion.approved = approved;
      agentSuggestion.approvedBy = req.user._id;
      agentSuggestion.approvedAt = new Date();

      await agentSuggestion.save();
      await agentSuggestion.populate('approvedBy', 'name email');

      res.json({
        message: approved ? 'Agent suggestion approved' : 'Agent suggestion rejected',
        agentSuggestion
      });

    } catch (error) {
      console.error('Approve suggestion error:', error);
      res.status(500).json({ 
        error: 'Failed to update agent suggestion' 
      });
    }
  }
);

// Get agent statistics
router.get('/stats', 
  authenticate, 
  authorize('agent', 'admin'),
  async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      const daysMap = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeframe] || 7;
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      // Aggregate statistics
      const [
        totalSuggestions,
        autoClosedCount,
        avgConfidence,
        categoryStats,
        confidenceDistribution
      ] = await Promise.all([
        AgentSuggestion.countDocuments({
          createdAt: { $gte: startDate }
        }),
        AgentSuggestion.countDocuments({
          createdAt: { $gte: startDate },
          autoClosed: true
        }),
        AgentSuggestion.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
        ]),
        AgentSuggestion.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { 
            $group: { 
              _id: '$predictedCategory', 
              count: { $sum: 1 },
              avgConfidence: { $avg: '$confidence' }
            } 
          }
        ]),
        AgentSuggestion.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $bucket: {
              groupBy: '$confidence',
              boundaries: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
              default: 'other',
              output: { count: { $sum: 1 } }
            }
          }
        ])
      ]);

      const autoCloseRate = totalSuggestions > 0 ? 
        (autoClosedCount / totalSuggestions) * 100 : 0;

      const averageConfidence = avgConfidence.length > 0 ? 
        avgConfidence[0].avgConfidence : 0;

      res.json({
        timeframe,
        totalSuggestions,
        autoClosedCount,
        autoCloseRate: Math.round(autoCloseRate * 100) / 100,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        categoryStats,
        confidenceDistribution
      });

    } catch (error) {
      console.error('Get agent stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get agent statistics' 
      });
    }
  }
);

export default router;