/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Share Button Component                                                ║
 * ║  Professional social sharing with viral mechanics                      ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import socialSharing from '../services/social-sharing';

/**
 * Individual platform share button
 */
export function PlatformShareButton({ platform, content, className = '', variant = 'default' }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const success = await socialSharing.shareOnPlatform(platform, content);

      if (success) {
        toast.success(`Shared on ${platform}!`, {
          icon: '🚀',
          duration: 2000
        });
      }
    } catch (error) {
      toast.error('Failed to share', { duration: 2000 });
    } finally {
      setIsSharing(false);
    }
  };

  const platformConfig = {
    twitter: { icon: '𝕏', label: 'Share on Twitter' },
    linkedin: { icon: '💼', label: 'Share on LinkedIn' },
    facebook: { icon: '👥', label: 'Share on Facebook' },
    reddit: { icon: '🤖', label: 'Share on Reddit' },
    hackernews: { icon: '🟧', label: 'Share on Hacker News' },
    email: { icon: '📧', label: 'Share via Email' }
  }[platform] || { icon: '🔗', label: 'Share' };

  if (variant === 'icon') {
    return (
      <motion.button
        className={`share-button-icon ${className}`}
        onClick={handleShare}
        disabled={isSharing}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label={platformConfig.label}
        title={platformConfig.label}
      >
        <span className="share-button-icon-content">{platformConfig.icon}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      className={`share-button ${className}`}
      onClick={handleShare}
      disabled={isSharing}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      aria-label={platformConfig.label}
    >
      <span className="share-button-icon">{platformConfig.icon}</span>
      <span className="share-button-label">{platform}</span>
    </motion.button>
  );
}

/**
 * Multiple platform share buttons
 */
export function ShareButtons({ content, platforms = ['twitter', 'linkedin', 'facebook'], variant = 'default', className = '' }) {
  return (
    <div className={`share-buttons ${variant === 'icon' ? 'share-buttons-icon' : ''} ${className}`}>
      {platforms.map((platform) => (
        <PlatformShareButton
          key={platform}
          platform={platform}
          content={content}
          variant={variant}
        />
      ))}
    </div>
  );
}

/**
 * Share button with dropdown menu
 */
export function ShareDropdown({ content, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const platforms = socialSharing.getAvailablePlatforms();

  const handleShare = (platform) => {
    socialSharing.shareOnPlatform(platform, content);
    setIsOpen(false);
  };

  return (
    <div className={`share-dropdown ${className}`}>
      <motion.button
        className="share-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="share-dropdown-icon">🔗</span>
        <span className="share-dropdown-label">Share</span>
        <span className={`share-dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="share-dropdown-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className="share-dropdown-menu"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {platforms.map((platform) => (
                <motion.button
                  key={platform.id}
                  className="share-dropdown-item"
                  onClick={() => handleShare(platform.id)}
                  whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}
                  style={{ '--platform-color': platform.color }}
                >
                  <span className="share-dropdown-item-icon">{platform.icon}</span>
                  <span className="share-dropdown-item-label">{platform.name}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Copy link button
 */
export function CopyLinkButton({ link, label = 'Copy Link', className = '', onCopy = null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await socialSharing.copyToClipboard(link);

    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!', {
        icon: '📋',
        duration: 2000
      });

      if (onCopy) {
        onCopy(link);
      }

      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link', { duration: 2000 });
    }
  };

  return (
    <motion.button
      className={`copy-link-button ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="copy-link-icon">{copied ? '✓' : '📋'}</span>
      <span className="copy-link-label">{copied ? 'Copied!' : label}</span>
    </motion.button>
  );
}

/**
 * Native share button (for mobile)
 */
export function NativeShareButton({ content, fallback = null, className = '' }) {
  const isAvailable = socialSharing.isNativeShareAvailable();

  const handleShare = async () => {
    const success = await socialSharing.nativeShare(content);

    if (!success && fallback) {
      fallback();
    }
  };

  if (!isAvailable) {
    return fallback ? fallback() : null;
  }

  return (
    <motion.button
      className={`native-share-button ${className}`}
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="native-share-icon">📤</span>
      <span className="native-share-label">Share</span>
    </motion.button>
  );
}

/**
 * Referral share button
 */
export function ReferralShareButton({ invitationCode, platform = 'twitter', className = '' }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      await socialSharing.shareReferral(invitationCode, platform);
      toast.success(`Referral shared on ${platform}!`, {
        icon: '🎉',
        duration: 2000
      });
    } catch (error) {
      toast.error('Failed to share referral', { duration: 2000 });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.button
      className={`referral-share-button ${className}`}
      onClick={handleShare}
      disabled={isSharing}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="referral-share-icon">🎁</span>
      <span className="referral-share-label">Share Invitation</span>
    </motion.button>
  );
}

/**
 * Achievement share button
 */
export function AchievementShareButton({ achievement, platform = 'twitter', className = '' }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      await socialSharing.shareAchievement(achievement, platform);
      toast.success('Achievement shared!', {
        icon: '🏆',
        duration: 2000
      });
    } catch (error) {
      toast.error('Failed to share achievement', { duration: 2000 });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.button
      className={`achievement-share-button ${className}`}
      onClick={handleShare}
      disabled={isSharing}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="achievement-share-icon">🚀</span>
      <span className="achievement-share-label">Share Achievement</span>
    </motion.button>
  );
}

/**
 * Complete share widget with all options
 */
export function ShareWidget({ content, showCopyLink = true, className = '' }) {
  const [activeTab, setActiveTab] = useState('platforms');
  const platforms = socialSharing.getAvailablePlatforms();

  return (
    <motion.div
      className={`share-widget ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="share-widget-header">
        <h3 className="share-widget-title">Share</h3>
        <p className="share-widget-subtitle">Spread the word about BIZRA Genesis</p>
      </div>

      <div className="share-widget-tabs">
        <button
          className={`share-widget-tab ${activeTab === 'platforms' ? 'active' : ''}`}
          onClick={() => setActiveTab('platforms')}
        >
          Social Platforms
        </button>
        {showCopyLink && (
          <button
            className={`share-widget-tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            Copy Link
          </button>
        )}
      </div>

      <div className="share-widget-content">
        {activeTab === 'platforms' && (
          <div className="share-widget-platforms">
            {platforms.map((platform) => (
              <motion.button
                key={platform.id}
                className="share-widget-platform"
                onClick={() => socialSharing.shareOnPlatform(platform.id, content)}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                style={{ '--platform-color': platform.color }}
              >
                <span className="share-widget-platform-icon">{platform.icon}</span>
                <span className="share-widget-platform-name">{platform.name}</span>
              </motion.button>
            ))}
          </div>
        )}

        {activeTab === 'link' && showCopyLink && (
          <div className="share-widget-link">
            <div className="share-widget-link-input-wrapper">
              <input
                type="text"
                className="share-widget-link-input"
                value={content.url || window.location.href}
                readOnly
              />
              <CopyLinkButton
                link={content.url || window.location.href}
                label="Copy"
                className="share-widget-link-copy"
              />
            </div>
          </div>
        )}
      </div>

      {/* Native share button for mobile */}
      {socialSharing.isNativeShareAvailable() && (
        <div className="share-widget-native">
          <NativeShareButton content={content} />
        </div>
      )}
    </motion.div>
  );
}

export default {
  PlatformShareButton,
  ShareButtons,
  ShareDropdown,
  CopyLinkButton,
  NativeShareButton,
  ReferralShareButton,
  AchievementShareButton,
  ShareWidget
};
