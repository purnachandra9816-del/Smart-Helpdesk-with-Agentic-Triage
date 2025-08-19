import express from 'express';
import Config from '../models/Config.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Get configuration
router.get('/', authenticate, async (req, res) => {
  try {
    let config = await Config.findOne();
    
    if (!config) {
      config = new Config();
      await config.save();
    }

    res.json({ config });

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ 
      error: 'Failed to get configuration' 
    });
  }
});

// Update configuration (admin only)
router.put('/', 
  authenticate, 
  authorize('admin'), 
  validate(schemas.updateConfig),
  async (req, res) => {
    try {
      const updates = req.body;

      let config = await Config.findOne();
      
      if (!config) {
        config = new Config(updates);
      } else {
        Object.assign(config, updates);
      }

      await config.save();

      res.json({
        message: 'Configuration updated successfully',
        config
      });

    } catch (error) {
      console.error('Update config error:', error);
      res.status(500).json({ 
        error: 'Failed to update configuration' 
      });
    }
  }
);

// Reset configuration to defaults (admin only)
router.post('/reset', 
  authenticate, 
  authorize('admin'),
  async (req, res) => {
    try {
      await Config.deleteMany({});
      
      const config = new Config();
      await config.save();

      res.json({
        message: 'Configuration reset to defaults',
        config
      });

    } catch (error) {
      console.error('Reset config error:', error);
      res.status(500).json({ 
        error: 'Failed to reset configuration' 
      });
    }
  }
);

export default router;