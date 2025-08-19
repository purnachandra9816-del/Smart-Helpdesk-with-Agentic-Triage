import Article from '../models/Article.js';

class KnowledgeBaseService {
  async searchArticles(query, category = null, limit = 10) {
    try {
      const searchFilter = {
        status: 'published',
        ...(category && { category })
      };

      if (!query || query.trim() === '') {
        // Return recent articles if no query
        return await Article.find(searchFilter)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .populate('author', 'name')
          .lean();
      }

      // Text search using MongoDB text indexes
      const textSearchResults = await Article.find({
        ...searchFilter,
        $text: { $search: query }
      }, {
        score: { $meta: 'textScore' }
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('author', 'name')
      .lean();

      if (textSearchResults.length > 0) {
        return textSearchResults;
      }

      // Fallback to regex search if text search returns no results
      const regexQuery = new RegExp(query.split(' ').join('|'), 'i');
      return await Article.find({
        ...searchFilter,
        $or: [
          { title: regexQuery },
          { body: regexQuery },
          { tags: { $in: [regexQuery] } }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('author', 'name')
      .lean();

    } catch (error) {
      console.error('KB search error:', error);
      throw new Error('Failed to search knowledge base');
    }
  }

  async findRelevantArticles(ticketText, category, limit = 5) {
    try {
      // Extract keywords from ticket text
      const keywords = this._extractKeywords(ticketText);
      
      // Search for articles using keywords and category
      const searchQuery = keywords.join(' ');
      const articles = await this.searchArticles(searchQuery, category, limit);
      
      // Score articles based on relevance
      const scoredArticles = articles.map(article => ({
        ...article,
        relevanceScore: this._calculateRelevanceScore(ticketText, article, keywords)
      }));

      // Sort by relevance score and return top results
      return scoredArticles
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding relevant articles:', error);
      return [];
    }
  }

  _extractKeywords(text) {
    // Simple keyword extraction
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'within',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'this', 'that',
      'these', 'those'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  _calculateRelevanceScore(ticketText, article, keywords) {
    let score = 0;
    const ticketLower = ticketText.toLowerCase();
    const articleTitle = article.title.toLowerCase();
    const articleBody = article.body.toLowerCase();
    const articleTags = article.tags.map(tag => tag.toLowerCase());

    // Title matches get highest score
    keywords.forEach(keyword => {
      if (articleTitle.includes(keyword)) {
        score += 3;
      }
      if (articleBody.includes(keyword)) {
        score += 1;
      }
      if (articleTags.some(tag => tag.includes(keyword))) {
        score += 2;
      }
    });

    // Bonus for exact phrase matches
    const phrases = ticketLower.match(/\b\w+\s+\w+\b/g) || [];
    phrases.forEach(phrase => {
      if (articleTitle.includes(phrase)) {
        score += 5;
      }
      if (articleBody.includes(phrase)) {
        score += 2;
      }
    });

    // Category match bonus
    if (article.category && ticketText.toLowerCase().includes(article.category)) {
      score += 1;
    }

    return score;
  }
}

export default new KnowledgeBaseService();