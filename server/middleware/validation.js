import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().trim().lowercase().max(255).required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('user', 'agent', 'admin').default('user')
  }),

  login: Joi.object({
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().required()
  }),

  createTicket: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
    category: Joi.string().valid('billing', 'tech', 'shipping', 'other').default('other'),
    attachmentUrls: Joi.array().items(Joi.string().uri().max(500)).max(5).default([])
  }),

  createArticle: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    body: Joi.string().trim().min(50).max(10000).required(),
    tags: Joi.array().items(Joi.string().trim().lowercase().max(50)).max(10).default([]),
    category: Joi.string().valid('billing', 'tech', 'shipping', 'other').default('other'),
    status: Joi.string().valid('draft', 'published').default('draft')
  }),

  updateArticle: Joi.object({
    title: Joi.string().trim().min(5).max(200),
    body: Joi.string().trim().min(50).max(10000),
    tags: Joi.array().items(Joi.string().trim().lowercase().max(50)).max(10),
    category: Joi.string().valid('billing', 'tech', 'shipping', 'other'),
    status: Joi.string().valid('draft', 'published')
  }),

  replyToTicket: Joi.object({
    content: Joi.string().trim().min(1).max(5000).required(),
    isInternal: Joi.boolean().default(false),
    status: Joi.string().valid('open', 'resolved', 'closed').optional()
  }),

  updateConfig: Joi.object({
    autoCloseEnabled: Joi.boolean(),
    confidenceThreshold: Joi.number().min(0).max(1),
    slaHours: Joi.number().min(1).max(168),
    categoryThresholds: Joi.object({
      billing: Joi.number().min(0).max(1),
      tech: Joi.number().min(0).max(1),
      shipping: Joi.number().min(0).max(1),
      other: Joi.number().min(0).max(1)
    })
  })
};