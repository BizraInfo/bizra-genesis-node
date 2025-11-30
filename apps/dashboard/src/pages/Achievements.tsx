// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - ACHIEVEMENTS PAGE                              ║
// ║  Gamification UI with progress tracking and rewards                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Target, Star, Flame, Award } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE as CONFIG_API_BASE } from '../config'
import styles from '../styles/Achievements.module.css'

const API_BASE = `${CONFIG_API_BASE  }/api/v1`

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type TierType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
type CategoryType = 'referral' | 'viral' | 'quality' | 'streak' | 'engagement' | 'social' | 'special'

interface Achievement {
  id: string
  name: string
  description: string
  category: CategoryType
  tier: TierType
  icon: string
  points: number
  progress: number
  unlocked: boolean
  unlocked_at: number | null
}

interface AchievementStats {
  total: number
  unlocked: number
  locked: number
  totalPoints: number
  maxPoints: number
}

interface CategoryStat {
  category: CategoryType
  completed: number
  total: number
  percentage: number
}

interface StreakData {
  current_streak: number
  longest_streak: number
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER COLORS AND STYLES
// ═══════════════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<TierType, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF'
}

const TIER_GRADIENTS: Record<TierType, string> = {
  bronze: 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
  silver: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
  gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  platinum: 'linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%)',
  diamond: 'linear-gradient(135deg, #B9F2FF 0%, #4DD0E1 100%)'
}

const CATEGORY_ICONS: Record<CategoryType, string> = {
  referral: '👥',
  viral: '🚀',
  quality: '💎',
  streak: '🔥',
  engagement: '🎯',
  social: '📱',
  special: '🏆'
}

const CATEGORY_COLORS: Record<CategoryType, string> = {
  referral: '#00a8cc',
  viral: '#ff6b6b',
  quality: '#ffd700',
  streak: '#ff6347',
  engagement: '#32cd32',
  social: '#8a2be2',
  special: '#ffa500'
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Achievements() {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<Record<CategoryType, Achievement[]>>({} as Record<CategoryType, Achievement[]>)
  const [stats, setStats] = useState<AchievementStats | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'all' | CategoryType>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch achievements
      const achievementsRes = await fetch(`${API_BASE}/achievements`, {
        headers: {
          'x-user-id': user?.id || 'demo-user',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!achievementsRes.ok) {
        throw new Error('Failed to fetch achievements')
      }

      const achievementsJson = await achievementsRes.json()

      if (achievementsJson.success) {
        setAchievements(achievementsJson.data.achievements)
        setStats(achievementsJson.data.stats)
        setCategoryStats(achievementsJson.data.categoryStats)
      }

      // Fetch current streak
      const streakRes = await fetch(`${API_BASE}/achievements/streak/current`, {
        headers: {
          'x-user-id': user?.id || 'demo-user',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (streakRes.ok) {
        const streakJson = await streakRes.json()
        if (streakJson.success) {
          setStreak(streakJson.data)
        }
      }
    } catch (err) {
      console.error('Error fetching achievements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const checkForNewAchievements = async () => {
    try {
      const res = await fetch(`${API_BASE}/achievements/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo-user',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to check achievements')
      }

      const json = await res.json()

      if (json.success) {
        if (json.data.newAchievements.length > 0) {
          // Refresh data
          fetchAllData()
        }
      }
    } catch (err) {
      console.error('Error checking achievements:', err)
    }
  }

  if (loading) {
    return (
      <div className="achievements-container loading">
        <div className="loading-spinner"></div>
        <p>Loading achievements...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="achievements-container error">
        <div className="error-message">
          <Trophy className="error-icon" />
          <h2>Failed to Load Achievements</h2>
          <p>{error}</p>
          <button onClick={fetchAllData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const filteredAchievements = selectedCategory === 'all'
    ? Object.values(achievements).flat()
    : achievements[selectedCategory] || []

  return (
    <div className="achievements-container">
      {/* Header */}
      <motion.header
        className="achievements-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-title">
          <Trophy className="header-icon" />
          <div>
            <h1>Achievements</h1>
            <p className="subtitle">Track your progress and unlock rewards</p>
          </div>
        </div>

        <button className="check-achievements-btn" onClick={checkForNewAchievements}>
          <Award className="btn-icon" />
          Check for New Achievements
        </button>
      </motion.header>

      {/* Overview Stats */}
      {stats && (
        <motion.div
          className="achievement-overview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="overview-card">
            <div className="overview-icon">
              <Target />
            </div>
            <div className="overview-content">
              <h3>Progress</h3>
              <div className="progress-text">
                {stats.unlocked} / {stats.total}
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon">
              <Star />
            </div>
            <div className="overview-content">
              <h3>Points</h3>
              <div className="points-text">
                {stats.totalPoints.toLocaleString()} / {stats.maxPoints.toLocaleString()}
              </div>
            </div>
          </div>

          {streak && (
            <div className="overview-card">
              <div className="overview-icon">
                <Flame />
              </div>
              <div className="overview-content">
                <h3>Current Streak</h3>
                <div className="streak-text">
                  {streak.current_streak} day{streak.current_streak !== 1 ? 's' : ''}
                </div>
                <p className="streak-subtitle">
                  Best: {streak.longest_streak} day{streak.longest_streak !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Category Navigation */}
      <motion.div
        className="category-nav"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <button
          className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All
        </button>

        {categoryStats.map((categoryStat) => (
          <button
            key={categoryStat.category}
            className={`category-btn ${selectedCategory === categoryStat.category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(categoryStat.category)}
            style={{
              borderColor: selectedCategory === categoryStat.category
                ? CATEGORY_COLORS[categoryStat.category]
                : 'rgba(212, 175, 55, 0.3)'
            }}
          >
            <span className="category-icon">
              {CATEGORY_ICONS[categoryStat.category]}
            </span>
            <span className="category-name">
              {categoryStat.category}
            </span>
            <span className="category-progress">
              {categoryStat.completed}/{categoryStat.total}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Achievements Grid */}
      <motion.div
        className="achievements-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <AnimatePresence mode="wait">
          {filteredAchievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              index={index}
              onClick={() => setSelectedAchievement(achievement)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <AchievementModal
            achievement={selectedAchievement}
            onClose={() => setSelectedAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementCardProps {
  achievement: Achievement
  index: number
  onClick: () => void
}

function AchievementCard({ achievement, index, onClick }: AchievementCardProps) {
  const isLocked = !achievement.unlocked
  const tierColor = TIER_COLORS[achievement.tier]
  const tierGradient = TIER_GRADIENTS[achievement.tier]

  return (
    <motion.div
      className={`achievement-card ${isLocked ? 'locked' : 'unlocked'} tier-${achievement.tier}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.05, y: -5 }}
      onClick={onClick}
      style={{
        borderColor: isLocked ? 'rgba(128, 128, 128, 0.3)' : tierColor
      }}
    >
      {/* Achievement Icon */}
      <div
        className="achievement-icon-wrapper"
        style={{
          background: isLocked ? '#333' : tierGradient
        }}
      >
        <div className={`achievement-icon ${isLocked ? 'locked-icon' : ''}`}>
          {isLocked ? '🔒' : achievement.icon}
        </div>
      </div>

      {/* Achievement Info */}
      <div className="achievement-info">
        <h3 className={isLocked ? 'locked-text' : ''}>
          {isLocked ? '???' : achievement.name}
        </h3>
        <p className="achievement-description">
          {isLocked ? 'Complete requirements to unlock' : achievement.description}
        </p>

        {/* Tier Badge */}
        <div
          className="tier-badge"
          style={{
            background: tierGradient,
            color: achievement.tier === 'gold' ? '#000' : '#fff'
          }}
        >
          {achievement.tier.toUpperCase()}
        </div>
      </div>

      {/* Progress Bar (for locked achievements) */}
      {isLocked && achievement.progress > 0 && (
        <div className="achievement-progress">
          <div className="progress-bar-small">
            <motion.div
              className="progress-fill-small"
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress * 100}%` }}
              style={{ background: tierGradient }}
            />
          </div>
          <span className="progress-percentage">
            {Math.round(achievement.progress * 100)}%
          </span>
        </div>
      )}

      {/* Points */}
      <div className="achievement-points">
        {isLocked ? (
          <span className="points-locked">+{achievement.points} pts</span>
        ) : (
          <span className="points-unlocked">✓ {achievement.points} pts</span>
        )}
      </div>

      {/* Unlocked Date */}
      {!isLocked && achievement.unlocked_at && (
        <div className="unlocked-date">
          Unlocked {new Date(achievement.unlocked_at * 1000).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementModalProps {
  achievement: Achievement
  onClose: () => void
}

function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const isLocked = !achievement.unlocked
  const tierGradient = TIER_GRADIENTS[achievement.tier]

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="achievement-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {/* Achievement Details */}
        <div className="modal-content">
          <div
            className="modal-icon-wrapper"
            style={{ background: tierGradient }}
          >
            <div className="modal-icon">
              {isLocked ? '🔒' : achievement.icon}
            </div>
          </div>

          <h2>{isLocked ? 'Locked Achievement' : achievement.name}</h2>

          <div
            className="modal-tier-badge"
            style={{ background: tierGradient }}
          >
            {achievement.tier.toUpperCase()} TIER
          </div>

          <p className="modal-description">{achievement.description}</p>

          <div className="modal-stats">
            <div className="modal-stat">
              <span className="modal-stat-label">Points</span>
              <span className="modal-stat-value">{achievement.points}</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-label">Category</span>
              <span className="modal-stat-value">
                {CATEGORY_ICONS[achievement.category]} {achievement.category}
              </span>
            </div>
          </div>

          {isLocked && achievement.progress > 0 && (
            <div className="modal-progress">
              <div className="modal-progress-label">
                Progress: {Math.round(achievement.progress * 100)}%
              </div>
              <div className="progress-bar-large">
                <motion.div
                  className="progress-fill-large"
                  initial={{ width: 0 }}
                  animate={{ width: `${achievement.progress * 100}%` }}
                  style={{ background: tierGradient }}
                />
              </div>
            </div>
          )}

          {!isLocked && achievement.unlocked_at && (
            <div className="modal-unlocked-info">
              🎉 Unlocked on {new Date(achievement.unlocked_at * 1000).toLocaleString()}
            </div>
          )}

          {isLocked && (
            <div className="modal-requirements">
              <h3>Requirements</h3>
              <p>Complete the required actions to unlock this achievement</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
