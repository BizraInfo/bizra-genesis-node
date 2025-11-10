/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Social Sharing Service                                                ║
 * ║  Professional viral mechanics with analytics tracking                  ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import analytics from './analytics';

/**
 * Social platform configurations
 */
const SOCIAL_PLATFORMS = {
  twitter: {
    name: 'Twitter',
    icon: '𝕏',
    color: '#000000',
    shareUrl: 'https://twitter.com/intent/tweet',
    queryParams: ['text', 'url', 'hashtags', 'via']
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0077b5',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    queryParams: ['url']
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    color: '#1877f2',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php',
    queryParams: ['u']
  },
  reddit: {
    name: 'Reddit',
    icon: '🤖',
    color: '#ff4500',
    shareUrl: 'https://reddit.com/submit',
    queryParams: ['url', 'title']
  },
  hackernews: {
    name: 'Hacker News',
    icon: '🟧',
    color: '#ff6600',
    shareUrl: 'https://news.ycombinator.com/submitlink',
    queryParams: ['u', 't']
  },
  email: {
    name: 'Email',
    icon: '📧',
    color: '#666666',
    shareUrl: 'mailto:',
    queryParams: ['subject', 'body']
  }
};

/**
 * Default share templates
 */
const SHARE_TEMPLATES = {
  referral: {
    title: 'Join me on BIZRA Genesis - The Future of AI-Powered Business Intelligence',
    description: 'I\'m using BIZRA Genesis for autonomous trading, research, and business intelligence. Join the Alpha 100 with my exclusive invitation code!',
    hashtags: ['BIZRA', 'AI', 'Trading', 'Blockchain', 'ProofOfImpact'],
    via: 'BIZRAGenesis'
  },
  achievement: {
    title: 'Just unlocked a new achievement on BIZRA Genesis!',
    description: 'Making progress with AI-powered autonomous intelligence. Join me on this journey!',
    hashtags: ['BIZRA', 'Achievement', 'AI', 'AgenticAI'],
    via: 'BIZRAGenesis'
  },
  milestone: {
    title: 'Reached a major milestone on BIZRA Genesis!',
    description: 'The autonomous AI agents are transforming how I work. See what\'s possible with BIZRA Genesis.',
    hashtags: ['BIZRA', 'AI', 'Milestone', 'Innovation'],
    via: 'BIZRAGenesis'
  },
  network: {
    title: 'My BIZRA Genesis network is growing!',
    description: 'Building a powerful network of autonomous AI agents and intelligent collaboration.',
    hashtags: ['BIZRA', 'Network', 'AI', 'Collaboration'],
    via: 'BIZRAGenesis'
  }
};

/**
 * Generate share URL for a platform
 */
function generateShareUrl(platform, content) {
  const config = SOCIAL_PLATFORMS[platform];
  if (!config) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  const url = new URL(config.shareUrl);

  // Map content to platform-specific query parameters
  if (platform === 'twitter') {
    if (content.text) url.searchParams.set('text', content.text);
    if (content.url) url.searchParams.set('url', content.url);
    if (content.hashtags) url.searchParams.set('hashtags', content.hashtags.join(','));
    if (content.via) url.searchParams.set('via', content.via);
  } else if (platform === 'linkedin') {
    if (content.url) url.searchParams.set('url', content.url);
  } else if (platform === 'facebook') {
    if (content.url) url.searchParams.set('u', content.url);
  } else if (platform === 'reddit') {
    if (content.url) url.searchParams.set('url', content.url);
    if (content.title) url.searchParams.set('title', content.title);
  } else if (platform === 'hackernews') {
    if (content.url) url.searchParams.set('u', content.url);
    if (content.title) url.searchParams.set('t', content.title);
  } else if (platform === 'email') {
    // Email is special - we use mailto:
    let mailtoUrl = 'mailto:?';
    if (content.subject) mailtoUrl += `subject=${encodeURIComponent(content.subject)}&`;
    if (content.body) mailtoUrl += `body=${encodeURIComponent(content.body)}`;
    return mailtoUrl;
  }

  return url.toString();
}

/**
 * Share content on a social platform
 */
export function shareOnPlatform(platform, content, templateName = null) {
  try {
    // Apply template if specified
    if (templateName && SHARE_TEMPLATES[templateName]) {
      const template = SHARE_TEMPLATES[templateName];
      content = {
        ...template,
        ...content // User content overrides template
      };
    }

    // Generate share URL
    const shareUrl = generateShareUrl(platform, content);

    // Track sharing event
    analytics.trackEvent('Social', 'share_clicked', platform, null, {
      template: templateName,
      content_type: content.contentType || 'custom',
      url: content.url
    });

    // Open share dialog
    const width = 600;
    const height = 400;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    if (platform === 'email') {
      // Email opens in default mail client
      window.location.href = shareUrl;
    } else {
      // Other platforms open in popup
      const popup = window.open(
        shareUrl,
        `share-${platform}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        // Popup blocked - fallback to new tab
        window.open(shareUrl, '_blank');
      }
    }

    return true;
  } catch (error) {
    console.error('[SocialSharing] Share failed:', error);
    analytics.trackError('share_error', error.message, false, {
      platform,
      template: templateName
    });
    return false;
  }
}

/**
 * Share referral link
 */
export function shareReferral(invitationCode, platform = 'twitter') {
  const referralUrl = `${window.location.origin}/invite/${invitationCode}`;

  const content = {
    ...SHARE_TEMPLATES.referral,
    text: `${SHARE_TEMPLATES.referral.title}\n\nUse my code: ${invitationCode}`,
    url: referralUrl,
    contentType: 'referral',
    invitationCode
  };

  // Track referral share
  analytics.trackEvent('Referral', 'share_referral', platform, null, {
    invitation_code: invitationCode,
    platform
  });

  return shareOnPlatform(platform, content, 'referral');
}

/**
 * Share achievement unlock
 */
export function shareAchievement(achievement, platform = 'twitter') {
  const achievementUrl = `${window.location.origin}/achievements`;

  const content = {
    title: `Just unlocked: ${achievement.name} 🏆`,
    text: `I just unlocked "${achievement.name}" on BIZRA Genesis! ${achievement.description}`,
    description: achievement.description,
    url: achievementUrl,
    contentType: 'achievement',
    achievementId: achievement.id
  };

  // Track achievement share
  analytics.trackEvent('Social', 'share_achievement', platform, null, {
    achievement_id: achievement.id,
    achievement_name: achievement.name,
    achievement_tier: achievement.tier,
    platform
  });

  return shareOnPlatform(platform, content, 'achievement');
}

/**
 * Share network milestone
 */
export function shareNetworkMilestone(stats, platform = 'twitter') {
  const networkUrl = `${window.location.origin}/network`;

  const content = {
    title: `My BIZRA Genesis Network: ${stats.totalInvited} members!`,
    text: `My BIZRA Genesis network has reached ${stats.totalInvited} members with a ${stats.viralCoefficient.toFixed(2)}x viral coefficient! 🚀`,
    url: networkUrl,
    contentType: 'network_milestone',
    totalInvited: stats.totalInvited
  };

  // Track network share
  analytics.trackEvent('Social', 'share_network', platform, null, {
    total_invited: stats.totalInvited,
    viral_coefficient: stats.viralCoefficient,
    platform
  });

  return shareOnPlatform(platform, content, 'network');
}

/**
 * Copy link to clipboard
 */
export async function copyToClipboard(text, contentType = 'link') {
  try {
    await navigator.clipboard.writeText(text);

    // Track copy event
    analytics.trackEvent('Social', 'copy_link', contentType, null, {
      text_length: text.length
    });

    return true;
  } catch (error) {
    console.error('[SocialSharing] Copy failed:', error);

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);

      analytics.trackEvent('Social', 'copy_link_fallback', contentType, null, {
        text_length: text.length
      });

      return true;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      analytics.trackError('copy_link_error', fallbackError.message, false);
      return false;
    }
  }
}

/**
 * Generate Open Graph meta tags
 */
export function generateOpenGraphTags(content) {
  return {
    'og:title': content.title || 'BIZRA Genesis - Autonomous AI Intelligence',
    'og:description': content.description || 'The ultimate platform for autonomous trading, research, and business intelligence powered by 18 specialized AI agents.',
    'og:image': content.image || `${window.location.origin}/og-image.png`,
    'og:url': content.url || window.location.href,
    'og:type': content.type || 'website',
    'og:site_name': 'BIZRA Genesis',
    'og:locale': 'en_US',
    'twitter:card': content.twitterCard || 'summary_large_image',
    'twitter:site': '@BIZRAGenesis',
    'twitter:creator': content.twitterCreator || '@BIZRAGenesis',
    'twitter:title': content.title || 'BIZRA Genesis',
    'twitter:description': content.description || 'Autonomous AI Intelligence',
    'twitter:image': content.image || `${window.location.origin}/twitter-card.png`
  };
}

/**
 * Update document meta tags
 */
export function updateMetaTags(tags) {
  Object.entries(tags).forEach(([property, content]) => {
    const isOpenGraph = property.startsWith('og:');
    const attributeName = isOpenGraph ? 'property' : 'name';

    let meta = document.querySelector(`meta[${attributeName}="${property}"]`);

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attributeName, property);
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', content);
  });
}

/**
 * Get share statistics
 */
export function getShareStats() {
  // This would integrate with backend analytics
  // For now, return mock data structure
  return {
    totalShares: 0,
    byPlatform: {
      twitter: 0,
      linkedin: 0,
      facebook: 0,
      reddit: 0,
      hackernews: 0,
      email: 0
    },
    byContentType: {
      referral: 0,
      achievement: 0,
      network: 0,
      custom: 0
    },
    clickThroughRate: 0,
    conversionRate: 0
  };
}

/**
 * Get available platforms
 */
export function getAvailablePlatforms() {
  return Object.entries(SOCIAL_PLATFORMS).map(([key, config]) => ({
    id: key,
    name: config.name,
    icon: config.icon,
    color: config.color
  }));
}

/**
 * Get share templates
 */
export function getShareTemplates() {
  return SHARE_TEMPLATES;
}

/**
 * Generate shareable image URL (for custom graphics)
 */
export function generateShareImageUrl(content) {
  // This would call a backend service to generate custom share graphics
  // For now, return a placeholder URL
  const params = new URLSearchParams({
    title: content.title || '',
    subtitle: content.subtitle || '',
    template: content.template || 'default'
  });

  return `${window.location.origin}/api/v1/share/generate-image?${params.toString()}`;
}

/**
 * Track share completion (called via webhook/postMessage)
 */
export function trackShareCompletion(platform, content) {
  analytics.trackEvent('Social', 'share_completed', platform, null, {
    content_type: content.contentType || 'custom',
    url: content.url
  });
}

/**
 * Native share API (mobile)
 */
export async function nativeShare(content) {
  if (!navigator.share) {
    console.warn('[SocialSharing] Native share not supported');
    return false;
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.text || content.description,
      url: content.url
    });

    // Track native share
    analytics.trackEvent('Social', 'native_share', 'mobile', null, {
      content_type: content.contentType || 'custom'
    });

    return true;
  } catch (error) {
    // User cancelled or error occurred
    if (error.name !== 'AbortError') {
      console.error('[SocialSharing] Native share failed:', error);
      analytics.trackError('native_share_error', error.message, false);
    }
    return false;
  }
}

/**
 * Check if native share is available
 */
export function isNativeShareAvailable() {
  return typeof navigator.share !== 'undefined';
}

export default {
  shareOnPlatform,
  shareReferral,
  shareAchievement,
  shareNetworkMilestone,
  copyToClipboard,
  generateOpenGraphTags,
  updateMetaTags,
  getShareStats,
  getAvailablePlatforms,
  getShareTemplates,
  generateShareImageUrl,
  trackShareCompletion,
  nativeShare,
  isNativeShareAvailable
};
