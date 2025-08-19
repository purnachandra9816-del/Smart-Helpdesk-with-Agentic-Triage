import { v4 as uuidv4 } from 'uuid';
import llmProvider from './llmProvider.js';
import knowledgeBaseService from './knowledgeBaseService.js';
import AgentSuggestion from '../models/AgentSuggestion.js';
import AuditLog from '../models/AuditLog.js';
import Ticket from '../models/Ticket.js';
import Config from '../models/Config.js';

class AgentService {
  async triageTicket(ticketId) {
    const traceId = uuidv4();
    
    try {
      console.log(`Starting triage for ticket ${ticketId} with traceId ${traceId}`);
      
      // Get ticket details
      const ticket = await Ticket.findById(ticketId).populate('createdBy', 'name email');
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Log triage start
      await this._createAuditLog(ticketId, traceId, 'system', 'TICKET_CREATED', {
        title: ticket.title,
        category: ticket.category,
        status: ticket.status
      });

      // Step 1: Plan the triage workflow
      const plan = this._createPlan(ticket);
      console.log(`Triage plan created: ${plan.steps.join(' -> ')}`);

      // Step 2: Classify the ticket
      const classification = await this._classifyTicket(ticket, traceId);
      
      // Step 3: Retrieve relevant KB articles
      const relevantArticles = await this._retrieveKnowledgeBase(ticket, classification, traceId);
      
      // Step 4: Draft a reply
      const draft = await this._draftReply(ticket, relevantArticles, traceId);
      
      // Step 5: Make decision (auto-close or assign to human)
      const decision = await this._makeDecision(ticket, classification, draft, traceId);
      
      // Create agent suggestion record
      const agentSuggestion = new AgentSuggestion({
        ticketId,
        predictedCategory: classification.predictedCategory,
        articleIds: relevantArticles.map(article => article._id),
        draftReply: draft.draftReply,
        confidence: classification.confidence,
        autoClosed: decision.autoClosed,
        modelInfo: {
          ...classification.modelInfo,
          latencyMs: classification.modelInfo.latencyMs + draft.modelInfo.latencyMs
        }
      });

      await agentSuggestion.save();

      // Update ticket with suggestion reference
      ticket.agentSuggestionId = agentSuggestion._id;
      ticket.status = 'triaged';
      ticket.category = classification.predictedCategory;
      await ticket.save();

      // Execute decision
      if (decision.autoClosed) {
        await this._autoCloseTicket(ticket, agentSuggestion, traceId);
      } else {
        await this._assignToHuman(ticket, traceId);
      }

      console.log(`Triage completed for ticket ${ticketId}`);
      
      return {
        ticketId,
        traceId,
        classification,
        relevantArticles: relevantArticles.slice(0, 3), // Limit response size
        draft,
        decision,
        agentSuggestionId: agentSuggestion._id
      };

    } catch (error) {
      console.error(`Triage failed for ticket ${ticketId}:`, error);
      
      // Log the error
      await this._createAuditLog(ticketId, traceId, 'system', 'TRIAGE_FAILED', {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  _createPlan(ticket) {
    // Simple state machine for triage workflow
    const plan = {
      steps: [
        'classify',
        'retrieve_kb',
        'draft_reply',
        'make_decision'
      ],
      metadata: {
        ticketId: ticket._id,
        hasAttachments: ticket.attachmentUrls.length > 0,
        textLength: ticket.description.length
      }
    };

    return plan;
  }

  async _classifyTicket(ticket, traceId) {
    try {
      const textToClassify = `${ticket.title}\n\n${ticket.description}`;
      const classification = await llmProvider.classify(textToClassify);

      await this._createAuditLog(ticket._id, traceId, 'system', 'AGENT_CLASSIFIED', {
        predictedCategory: classification.predictedCategory,
        confidence: classification.confidence,
        originalCategory: ticket.category,
        modelInfo: classification.modelInfo
      });

      return classification;
    } catch (error) {
      console.error('Classification failed:', error);
      throw new Error('Failed to classify ticket');
    }
  }

  async _retrieveKnowledgeBase(ticket, classification, traceId) {
    try {
      const searchText = `${ticket.title} ${ticket.description}`;
      const articles = await knowledgeBaseService.findRelevantArticles(
        searchText,
        classification.predictedCategory,
        5
      );

      await this._createAuditLog(ticket._id, traceId, 'system', 'KB_RETRIEVED', {
        articlesFound: articles.length,
        articleIds: articles.map(a => a._id),
        searchCategory: classification.predictedCategory,
        topRelevanceScore: articles.length > 0 ? articles[0].relevanceScore : 0
      });

      return articles;
    } catch (error) {
      console.error('KB retrieval failed:', error);
      return []; // Continue with empty articles
    }
  }

  async _draftReply(ticket, articles, traceId) {
    try {
      const textToDraft = `${ticket.title}\n\n${ticket.description}`;
      const draft = await llmProvider.draft(textToDraft, articles);

      await this._createAuditLog(ticket._id, traceId, 'system', 'DRAFT_GENERATED', {
        draftLength: draft.draftReply.length,
        citationsCount: draft.citations.length,
        modelInfo: draft.modelInfo
      });

      return draft;
    } catch (error) {
      console.error('Draft generation failed:', error);
      throw new Error('Failed to generate draft reply');
    }
  }

  async _makeDecision(ticket, classification, draft, traceId) {
    try {
      // Get configuration
      const config = await Config.findOne() || new Config();
      
      const shouldAutoClose = config.autoCloseEnabled && 
                            classification.confidence >= config.confidenceThreshold;

      const decision = {
        autoClosed: shouldAutoClose,
        confidence: classification.confidence,
        threshold: config.confidenceThreshold,
        autoCloseEnabled: config.autoCloseEnabled,
        reasoning: shouldAutoClose ? 
          'High confidence classification with auto-close enabled' : 
          'Low confidence or auto-close disabled - requires human review'
      };

      await this._createAuditLog(ticket._id, traceId, 'system', 'DECISION_MADE', decision);

      return decision;
    } catch (error) {
      console.error('Decision making failed:', error);
      // Default to human assignment on error
      return {
        autoClosed: false,
        confidence: classification.confidence,
        threshold: 0,
        autoCloseEnabled: false,
        reasoning: 'Error in decision making - defaulting to human review'
      };
    }
  }

  async _autoCloseTicket(ticket, agentSuggestion, traceId) {
    try {
      // Add the AI reply to the ticket
      ticket.replies.push({
        author: null, // System reply
        content: agentSuggestion.draftReply,
        isInternal: false,
        timestamp: new Date()
      });

      ticket.status = 'resolved';
      ticket.resolvedAt = new Date();
      agentSuggestion.autoClosed = true;

      await Promise.all([
        ticket.save(),
        agentSuggestion.save()
      ]);

      await this._createAuditLog(ticket._id, traceId, 'system', 'AUTO_CLOSED', {
        confidence: agentSuggestion.confidence,
        replyLength: agentSuggestion.draftReply.length
      });

      console.log(`Auto-closed ticket ${ticket._id} with confidence ${agentSuggestion.confidence}`);
    } catch (error) {
      console.error('Auto-close failed:', error);
      throw new Error('Failed to auto-close ticket');
    }
  }

  async _assignToHuman(ticket, traceId) {
    try {
      ticket.status = 'waiting_human';
      await ticket.save();

      await this._createAuditLog(ticket._id, traceId, 'system', 'ASSIGNED_TO_HUMAN', {
        reason: 'Low confidence or auto-close disabled'
      });

      console.log(`Assigned ticket ${ticket._id} to human review`);
    } catch (error) {
      console.error('Human assignment failed:', error);
      throw new Error('Failed to assign ticket to human');
    }
  }

  async _createAuditLog(ticketId, traceId, actor, action, meta = {}) {
    try {
      const auditLog = new AuditLog({
        ticketId,
        traceId,
        actor,
        action,
        meta,
        timestamp: new Date()
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
}

export default new AgentService();