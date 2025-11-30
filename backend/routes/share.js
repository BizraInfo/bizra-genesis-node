/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Share API Routes                                                      ║
 * ║  RESTful API for social sharing and graphics generation                ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';
import crypto from 'crypto';
import shareGraphics from '../services/share-graphics.js';

const router = express.Router();

/**
 * Generate unique cache key for image parameters
 */
function generateCacheKey(template, content) {
  const dataString = JSON.stringify({ template, content });
  return crypto.createHash('md5').update(dataString).digest('hex');
}

/**
 * GET /api/share/generate-image
 * Generate custom share graphic
 */
router.get('/generate-image', async (req, res) => {
  try {
    const {
      template = 'default',
      title,
      subtitle,
      // Achievement specific
      achievementName,
      achievementDescription,
      achievementIcon,
      achievementTier,
      // Referral specific
      invitationCode,
      // Network specific
      totalInvited,
      viralCoefficient,
      // Milestone specific
      milestoneValue,
      milestoneLabel,
      milestoneIcon
    } = req.query;

    // Build content object
    let content = {};

    if (template === 'achievement') {
      content = {
        achievement: {
          name: achievementName || 'Achievement Unlocked',
          description: achievementDescription || 'You completed a milestone!',
          icon: achievementIcon || '🏆',
          tier: achievementTier || 'gold'
        }
      };
    } else if (template === 'referral') {
      content = {
        invitationCode: invitationCode || 'BIZRA-XXXX',
        title: title || 'Join BIZRA Genesis',
        subtitle: subtitle || 'Use my exclusive invitation code'
      };
    } else if (template === 'network') {
      content = {
        stats: {
          totalInvited: parseInt(totalInvited) || 0,
          viralCoefficient: parseFloat(viralCoefficient) || 0
        },
        title: title || 'My BIZRA Genesis Network'
      };
    } else if (template === 'milestone') {
      content = {
        milestone: {
          value: milestoneValue || '1,000',
          label: milestoneLabel || 'Achievements',
          icon: milestoneIcon || '🎯'
        }
      };
    } else {
      // Default template
      content = {
        title: title || 'BIZRA Genesis',
        subtitle: subtitle || 'Autonomous AI Intelligence'
      };
    }

    // Check cache
    const cacheKey = generateCacheKey(template, content);
    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      // Generate new image
      imageBuffer = await shareGraphics.generateShareGraphic(content, template);

      // Cache it
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    // Send image
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/generate-image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share graphic',
      message: error.message
    });
  }
});

/**
 * GET /api/share/og-image
 * Generate Open Graph image
 */
router.get('/og-image', async (req, res) => {
  try {
    const { title, description, template = 'default' } = req.query;

    const content = {
      title: title || 'BIZRA Genesis',
      subtitle: description || 'Autonomous AI Intelligence'
    };

    const cacheKey = generateCacheKey('og-' + template, content);
    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      imageBuffer = await shareGraphics.generateOpenGraphImage(content);
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/og-image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Open Graph image',
      message: error.message
    });
  }
});

/**
 * GET /api/share/twitter-card
 * Generate Twitter Card image
 */
router.get('/twitter-card', async (req, res) => {
  try {
    const { title, description, template = 'default' } = req.query;

    const content = {
      title: title || 'BIZRA Genesis',
      subtitle: description || 'Autonomous AI Intelligence',
      template
    };

    const cacheKey = generateCacheKey('twitter-' + template, content);
    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      imageBuffer = await shareGraphics.generateTwitterCardImage(content);
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/twitter-card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Twitter Card image',
      message: error.message
    });
  }
});

/**
 * POST /api/share/achievement
 * Generate achievement share graphic
 */
router.post('/achievement', async (req, res) => {
  try {
    const { achievement } = req.body;

    if (!achievement) {
      return res.status(400).json({
        success: false,
        error: 'Achievement data is required'
      });
    }

    const content = { achievement };
    const cacheKey = generateCacheKey('achievement', content);

    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      imageBuffer = await shareGraphics.generateShareGraphic(content, 'achievement');
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/achievement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate achievement share graphic',
      message: error.message
    });
  }
});

/**
 * POST /api/share/referral
 * Generate referral share graphic
 */
router.post('/referral', async (req, res) => {
  try {
    const { invitationCode, title, subtitle } = req.body;

    if (!invitationCode) {
      return res.status(400).json({
        success: false,
        error: 'Invitation code is required'
      });
    }

    const content = {
      invitationCode,
      title: title || 'Join BIZRA Genesis',
      subtitle: subtitle || `Use my code: ${invitationCode}`
    };

    const cacheKey = generateCacheKey('referral', content);
    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      imageBuffer = await shareGraphics.generateShareGraphic(content, 'referral');
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate referral share graphic',
      message: error.message
    });
  }
});

/**
 * POST /api/share/network
 * Generate network milestone share graphic
 */
router.post('/network', async (req, res) => {
  try {
    const { stats, title } = req.body;

    if (!stats) {
      return res.status(400).json({
        success: false,
        error: 'Network stats are required'
      });
    }

    const content = {
      stats,
      title: title || 'My BIZRA Genesis Network'
    };

    const cacheKey = generateCacheKey('network', content);
    let imageBuffer = shareGraphics.getCachedImage(cacheKey);

    if (!imageBuffer) {
      imageBuffer = await shareGraphics.generateShareGraphic(content, 'network');
      shareGraphics.setCachedImage(cacheKey, imageBuffer);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/network error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate network share graphic',
      message: error.message
    });
  }
});

/**
 * DELETE /api/share/cache
 * Clear image cache (admin only)
 */
router.delete('/cache', (req, res) => {
  try {
    shareGraphics.clearImageCache();

    res.json({
      success: true,
      message: 'Image cache cleared successfully'
    });
  } catch (error) {
    console.error('[API] /share/cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/share/templates
 * Get available share templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = [
      {
        id: 'default',
        name: 'Default',
        description: 'General purpose share graphic',
        parameters: ['title', 'subtitle']
      },
      {
        id: 'achievement',
        name: 'Achievement',
        description: 'Showcase unlocked achievements',
        parameters: ['achievementName', 'achievementDescription', 'achievementIcon', 'achievementTier']
      },
      {
        id: 'referral',
        name: 'Referral',
        description: 'Share invitation codes',
        parameters: ['invitationCode', 'title', 'subtitle']
      },
      {
        id: 'network',
        name: 'Network',
        description: 'Display network statistics',
        parameters: ['totalInvited', 'viralCoefficient', 'title']
      },
      {
        id: 'milestone',
        name: 'Milestone',
        description: 'Celebrate milestones',
        parameters: ['milestoneValue', 'milestoneLabel', 'milestoneIcon']
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[API] /share/templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

/**
 * GET /api/share/preview
 * Generate preview of share graphic with sample data
 */
router.get('/preview/:template', async (req, res) => {
  try {
    const { template } = req.params;

    // Sample data for each template
    const sampleData = {
      default: {
        title: 'BIZRA Genesis',
        subtitle: 'Autonomous AI Intelligence'
      },
      achievement: {
        achievement: {
          name: 'Early Adopter',
          description: 'Joined the Alpha 100 program',
          icon: '🌟',
          tier: 'gold'
        }
      },
      referral: {
        invitationCode: 'BIZRA-DEMO',
        title: 'Join BIZRA Genesis',
        subtitle: 'Use my exclusive invitation code'
      },
      network: {
        stats: {
          totalInvited: 42,
          viralCoefficient: 2.5
        },
        title: 'My BIZRA Genesis Network'
      },
      milestone: {
        milestone: {
          value: '10,000',
          label: 'Transactions Processed',
          icon: '🎯'
        }
      }
    };

    const content = sampleData[template] || sampleData.default;
    const imageBuffer = await shareGraphics.generateShareGraphic(content, template);

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300'); // Cache previews for 5 minutes
    res.send(imageBuffer);
  } catch (error) {
    console.error('[API] /share/preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

export default router;
