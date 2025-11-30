/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Achievement API Routes                                                ║
 * ║  RESTful API for gamification and user engagement                      ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import express from 'express';
import AchievementSystem, { ACHIEVEMENT_DEFINITIONS } from '../services/achievement-system.js';

const router = express.Router();
const achievementSystem = new AchievementSystem();

// Initialize achievement system
await achievementSystem.initialize();

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE (placeholder)
// ═══════════════════════════════════════════════════════════════════════════

const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.query.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  req.userId = userId;
  next();
};

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/achievements
 * Get all available achievements with user progress
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const achievements = await achievementSystem.getAllAchievementsForUser(userId);

    // Group by category
    const grouped = achievements.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    // Calculate category completion
    const categoryStats = Object.entries(grouped).map(([category, items]) => {
      const completed = items.filter((a) => a.unlocked).length;
      const total = items.length;
      const percentage = total > 0 ? (completed / total) * 100 : 0;

      return {
        category,
        completed,
        total,
        percentage: Math.round(percentage)
      };
    });

    res.json({
      success: true,
      data: {
        achievements: grouped,
        stats: {
          total: achievements.length,
          unlocked: achievements.filter((a) => a.unlocked).length,
          locked: achievements.filter((a) => !a.unlocked).length,
          totalPoints: achievements.reduce((sum, a) => sum + (a.unlocked ? a.points : 0), 0),
          maxPoints: achievements.reduce((sum, a) => sum + a.points, 0)
        },
        categoryStats
      }
    });
  } catch (error) {
    console.error('[API] /achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/achievements/unlocked
 * Get user's unlocked achievements
 */
router.get('/unlocked', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const achievements = await achievementSystem.getUserAchievements(userId);
    const unlocked = achievements.filter((a) => !a.locked);

    res.json({
      success: true,
      data: unlocked
    });
  } catch (error) {
    console.error('[API] /achievements/unlocked error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/achievements/:achievementId
 * Get specific achievement details
 */
router.get('/:achievementId', authenticateUser, async (req, res) => {
  try {
    const { achievementId } = req.params;
    const userId = req.userId;

    const definition = ACHIEVEMENT_DEFINITIONS[achievementId];

    if (!definition) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    // Get user's progress for this achievement
    const allAchievements = await achievementSystem.getAllAchievementsForUser(userId);
    const userAchievement = allAchievements.find((a) => a.id === achievementId);

    res.json({
      success: true,
      data: userAchievement || definition
    });
  } catch (error) {
    console.error('[API] /achievements/:achievementId error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/achievements/check
 * Manually check for new achievements
 */
router.post('/check', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const unlocked = await achievementSystem.checkAchievements(userId);

    res.json({
      success: true,
      data: {
        newAchievements: unlocked,
        count: unlocked.length
      },
      message: unlocked.length > 0
        ? `${unlocked.length} new achievement${unlocked.length > 1 ? 's' : ''} unlocked!`
        : 'No new achievements'
    });
  } catch (error) {
    console.error('[API] /achievements/check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/achievements/progress
 * Update user progress for a metric
 */
router.post('/progress', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    const { metricType, metricValue } = req.body;

    if (!metricType || metricValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'metricType and metricValue are required'
      });
    }

    const unlocked = await achievementSystem.updateUserProgress(
      userId,
      metricType,
      metricValue
    );

    res.json({
      success: true,
      data: {
        metricType,
        metricValue,
        newAchievements: unlocked
      },
      message: unlocked.length > 0
        ? `Progress updated! ${unlocked.length} new achievement${unlocked.length > 1 ? 's' : ''} unlocked!`
        : 'Progress updated'
    });
  } catch (error) {
    console.error('[API] /achievements/progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STREAK ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/achievements/streak
 * Get user's current login streak
 */
router.get('/streak/current', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const streak = await achievementSystem.getUserStreak(userId, 'login');

    res.json({
      success: true,
      data: streak
    });
  } catch (error) {
    console.error('[API] /achievements/streak/current error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/achievements/streak/update
 * Update user's login streak (call on each login)
 */
router.post('/streak/update', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;

    const newStreak = await achievementSystem.updateLoginStreak(userId);

    res.json({
      success: true,
      data: {
        currentStreak: newStreak
      },
      message: newStreak === 1
        ? 'Streak started!'
        : `${newStreak} day streak! Keep it up! 🔥`
    });
  } catch (error) {
    console.error('[API] /achievements/streak/update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/achievements/leaderboard
 * Get achievement leaderboard (most points)
 */
router.get('/leaderboard/points', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // This would require a more complex query joining users and achievements
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        message: 'Achievement leaderboard coming soon',
        leaderboard: []
      }
    });
  } catch (error) {
    console.error('[API] /achievements/leaderboard/points error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/achievements/system/stats
 * Get system-wide achievement statistics
 */
router.get('/system/stats', async (req, res) => {
  try {
    const stats = achievementSystem.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] /achievements/system/stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/achievements/definitions
 * Get all achievement definitions
 */
router.get('/definitions/all', async (req, res) => {
  try {
    res.json({
      success: true,
      data: ACHIEVEMENT_DEFINITIONS
    });
  } catch (error) {
    console.error('[API] /achievements/definitions/all error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

// Listen for achievement unlocks to send notifications
achievementSystem.on('achievement-unlocked', (data) => {
  console.log(`[Achievements] 🏆 New achievement unlocked:`, {
    userId: data.userId,
    achievement: data.achievement.name,
    points: data.achievement.points
  });

  // TODO: Send push notification, email, WebSocket event, etc.
  // Example:
  // notificationService.send(data.userId, {
  //   type: 'achievement_unlocked',
  //   title: `Achievement Unlocked: ${data.achievement.name}`,
  //   body: data.achievement.description,
  //   icon: data.achievement.icon,
  //   points: data.achievement.points
  // });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default router;
export { achievementSystem };
