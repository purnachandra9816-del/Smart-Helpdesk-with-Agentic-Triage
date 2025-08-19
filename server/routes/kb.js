import express from 'express';
import Article from '../models/Article.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import knowledgeBaseService from '../services/knowledgeBaseService.js';

const router = express.Router();

// Search articles (public with rate limiting)
router.get('/', searchLimiter, async (req, res) => {
  try {
    const { 
      query = '', 
      category, 
      status = 'published', 
      page = 1, 
      limit = 10,
      sortBy = 'relevance'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    let articles;

    if (query.trim()) {
      // Use knowledge base service for search
      articles = await knowledgeBaseService.searchArticles(
        query.trim(),
        category,
        limitNum
      );
    } else {
      // Get recent articles without search
      const filter = { status };
      if (category) filter.category = category;

      const sortOptions = {
        'newest': { createdAt: -1 },
        'oldest': { createdAt: 1 },
        'updated': { updatedAt: -1 },
        'title': { title: 1 },
        'relevance': { updatedAt: -1 } // Default fallback
      };

      articles = await Article.find(filter)
        .sort(sortOptions[sortBy] || sortOptions.relevance)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'name')
        .lean();
    }

    const total = await Article.countDocuments({ 
      status, 
      ...(category && { category })
    });

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      query: {
        query,
        category,
        status,
        sortBy
      }
    });

  } catch (error) {
    console.error('KB search error:', error);
    res.status(500).json({ 
      error: 'Failed to search articles' 
    });
  }
});

// Get single article
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'name email');

    if (!article) {
      return res.status(404).json({ 
        error: 'Article not found' 
      });
    }

    // Increment view count
    article.viewCount += 1;
    await article.save();

    res.json({ article });

  } catch (error) {
    console.error('Get article error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid article ID' 
      });
    }
    res.status(500).json({ 
      error: 'Failed to get article' 
    });
  }
});

// Create article (admin only)
router.post('/', 
  authenticate, 
  authorize('admin'), 
  validate(schemas.createArticle), 
  async (req, res) => {
    try {
      const { title, body, tags, category, status } = req.body;

      const article = new Article({
        title,
        body,
        tags,
        category,
        status,
        author: req.user._id
      });

      await article.save();
      await article.populate('author', 'name');

      res.status(201).json({
        message: 'Article created successfully',
        article
      });

    } catch (error) {
      console.error('Create article error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          error: 'Article with this title already exists' 
        });
      }
      res.status(500).json({ 
        error: 'Failed to create article' 
      });
    }
  }
);

// Update article (admin only)
router.put('/:id', 
  authenticate, 
  authorize('admin'), 
  validate(schemas.updateArticle), 
  async (req, res) => {
    try {
      const updates = req.body;
      
      const article = await Article.findByIdAndUpdate(
        req.params.id,
        updates,
        { 
          new: true, 
          runValidators: true 
        }
      ).populate('author', 'name');

      if (!article) {
        return res.status(404).json({ 
          error: 'Article not found' 
        });
      }

      res.json({
        message: 'Article updated successfully',
        article
      });

    } catch (error) {
      console.error('Update article error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          error: 'Invalid article ID' 
        });
      }
      res.status(500).json({ 
        error: 'Failed to update article' 
      });
    }
  }
);

// Delete article (admin only)
router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const article = await Article.findByIdAndDelete(req.params.id);

      if (!article) {
        return res.status(404).json({ 
          error: 'Article not found' 
        });
      }

      res.json({
        message: 'Article deleted successfully'
      });

    } catch (error) {
      console.error('Delete article error:', error);
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          error: 'Invalid article ID' 
        });
      }
      res.status(500).json({ 
        error: 'Failed to delete article' 
      });
    }
  }
);

// Mark article as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({ 
        error: 'Article not found' 
      });
    }

    article.helpfulCount += 1;
    await article.save();

    res.json({
      message: 'Thank you for your feedback',
      helpfulCount: article.helpfulCount
    });

  } catch (error) {
    console.error('Helpful vote error:', error);
    res.status(500).json({ 
      error: 'Failed to record feedback' 
    });
  }
});

export default router;