import { v4 as uuidv4 } from 'uuid';

class LLMProvider {
  constructor() {
    this.isStubMode = process.env.STUB_MODE === 'true';
    this.openaiKey = process.env.OPENAI_API_KEY;
  }

  async classify(text) {
    const startTime = Date.now();
    
    if (this.isStubMode) {
      return this._stubClassify(text, startTime);
    }

    // Real LLM implementation would go here
    if (this.openaiKey) {
      return this._openaiClassify(text, startTime);
    }

    // Fallback to stub
    return this._stubClassify(text, startTime);
  }

  async draft(text, articles) {
    const startTime = Date.now();
    
    if (this.isStubMode) {
      return this._stubDraft(text, articles, startTime);
    }

    // Real LLM implementation would go here
    if (this.openaiKey) {
      return this._openaiDraft(text, articles, startTime);
    }

    // Fallback to stub
    return this._stubDraft(text, articles, startTime);
  }

  _stubClassify(text, startTime) {
    const lowerText = text.toLowerCase();
    
    // Classification keywords
    const keywords = {
      billing: ['refund', 'invoice', 'payment', 'charge', 'billing', 'money', 'cost', 'price', 'subscription', 'cancel'],
      tech: ['error', 'bug', 'crash', 'issue', 'problem', 'not working', 'broken', 'stack', 'code', 'login'],
      shipping: ['delivery', 'shipment', 'package', 'tracking', 'shipping', 'order', 'delayed', 'arrived'],
      other: []
    };

    let maxScore = 0;
    let predictedCategory = 'other';
    let matchedKeywords = [];

    // Calculate scores for each category
    Object.entries(keywords).forEach(([category, words]) => {
      const matches = words.filter(word => lowerText.includes(word));
      const score = matches.length / words.length;
      
      if (score > maxScore) {
        maxScore = score;
        predictedCategory = category;
        matchedKeywords = matches;
      }
    });

    // Calculate confidence based on keyword matches and text length
    const textWords = text.split(' ').length;
    const baseConfidence = maxScore;
    const lengthBonus = Math.min(textWords / 50, 0.3); // Up to 0.3 bonus for longer text
    const keywordBonus = matchedKeywords.length * 0.1; // Bonus for multiple keyword matches
    
    let confidence = Math.min(baseConfidence + lengthBonus + keywordBonus, 1);
    
    // Add some randomness to make it more realistic
    confidence = Math.max(0.1, confidence + (Math.random() - 0.5) * 0.2);
    confidence = Math.round(confidence * 100) / 100; // Round to 2 decimal places

    const latencyMs = Date.now() - startTime;

    return {
      predictedCategory,
      confidence,
      modelInfo: {
        provider: 'stub',
        model: 'deterministic-v1',
        promptVersion: '1.0.0',
        latencyMs,
        matchedKeywords
      }
    };
  }

  _stubDraft(text, articles, startTime) {
    const templates = {
      billing: "Thank you for contacting us regarding your billing concern. ",
      tech: "Thank you for reporting this technical issue. ",
      shipping: "Thank you for contacting us about your shipment. ",
      other: "Thank you for contacting our support team. "
    };

    // Determine category from text (reuse classification logic)
    const classification = this._stubClassify(text, Date.now());
    const category = classification.predictedCategory;

    let draftReply = templates[category] || templates.other;
    
    // Add relevant KB article information
    if (articles && articles.length > 0) {
      draftReply += "Based on our knowledge base, here are some resources that might help:\n\n";
      
      articles.slice(0, 3).forEach((article, index) => {
        draftReply += `${index + 1}. ${article.title}\n`;
        // Add a snippet of the article body
        const snippet = article.body.substring(0, 150) + (article.body.length > 150 ? '...' : '');
        draftReply += `   ${snippet}\n\n`;
      });
      
      draftReply += "If these resources don't resolve your issue, please let us know and we'll be happy to assist you further.\n\n";
    } else {
      draftReply += "We're looking into your request and will get back to you shortly.\n\n";
    }

    draftReply += "Best regards,\nSupport Team";

    const citations = articles ? articles.map(article => article._id.toString()) : [];
    const latencyMs = Date.now() - startTime;

    return {
      draftReply,
      citations,
      modelInfo: {
        provider: 'stub',
        model: 'deterministic-v1',
        promptVersion: '1.0.0',
        latencyMs
      }
    };
  }

  async _openaiClassify(text, startTime) {
    // Placeholder for OpenAI implementation
    // This would use the OpenAI API to classify the text
    throw new Error('OpenAI integration not implemented yet');
  }

  async _openaiDraft(text, articles, startTime) {
    // Placeholder for OpenAI implementation
    // This would use the OpenAI API to draft a response
    throw new Error('OpenAI integration not implemented yet');
  }
}

export default new LLMProvider();