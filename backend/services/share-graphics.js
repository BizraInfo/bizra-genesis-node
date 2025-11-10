/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  Share Graphics Generator                                              ║
 * ║  Dynamic image generation for social sharing                           ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  width: 1200,
  height: 630, // Standard Open Graph image size
  backgroundColor: '#0a0e27',
  primaryColor: '#d4af37', // BIZRA Gold
  secondaryColor: '#f4d03f',
  textColor: '#ffffff',
  fontFamily: 'Arial',
  branding: {
    logo: null, // Path to logo image
    text: 'BIZRA Genesis',
    tagline: 'Autonomous AI Intelligence'
  }
};

/**
 * Template configurations
 */
const TEMPLATES = {
  default: {
    title: { fontSize: 64, fontWeight: 'bold', y: 250 },
    subtitle: { fontSize: 32, fontWeight: 'normal', y: 330 },
    footer: { fontSize: 24, y: 550 }
  },
  achievement: {
    icon: { size: 120, y: 180 },
    title: { fontSize: 56, fontWeight: 'bold', y: 350 },
    description: { fontSize: 28, y: 420 },
    tier: { fontSize: 32, fontWeight: 'bold', y: 480 },
    footer: { fontSize: 24, y: 570 }
  },
  referral: {
    code: { fontSize: 80, fontWeight: 'bold', y: 280 },
    title: { fontSize: 48, y: 190 },
    subtitle: { fontSize: 32, y: 380 },
    footer: { fontSize: 24, y: 570 }
  },
  network: {
    statValue: { fontSize: 96, fontWeight: 'bold', y: 280 },
    statLabel: { fontSize: 36, y: 360 },
    title: { fontSize: 48, y: 180 },
    footer: { fontSize: 24, y: 570 }
  },
  milestone: {
    icon: { size: 100, y: 170 },
    value: { fontSize: 88, fontWeight: 'bold', y: 330 },
    label: { fontSize: 40, y: 400 },
    footer: { fontSize: 24, y: 570 }
  }
};

/**
 * Generate share graphic
 */
export async function generateShareGraphic(content, template = 'default') {
  const config = { ...DEFAULT_CONFIG, ...content.config };
  const templateConfig = TEMPLATES[template] || TEMPLATES.default;

  // Create canvas
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');

  // Draw background
  await drawBackground(ctx, config);

  // Draw pattern overlay
  drawPattern(ctx, config);

  // Draw content based on template
  if (template === 'achievement') {
    await drawAchievementTemplate(ctx, content, templateConfig, config);
  } else if (template === 'referral') {
    await drawReferralTemplate(ctx, content, templateConfig, config);
  } else if (template === 'network') {
    await drawNetworkTemplate(ctx, content, templateConfig, config);
  } else if (template === 'milestone') {
    await drawMilestoneTemplate(ctx, content, templateConfig, config);
  } else {
    await drawDefaultTemplate(ctx, content, templateConfig, config);
  }

  // Draw footer branding
  drawFooter(ctx, config);

  // Return as buffer
  return canvas.toBuffer('image/png');
}

/**
 * Draw background gradient
 */
async function drawBackground(ctx, config) {
  const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
  gradient.addColorStop(0, config.backgroundColor);
  gradient.addColorStop(1, '#1a1f3a');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, config.width, config.height);
}

/**
 * Draw geometric pattern overlay
 */
function drawPattern(ctx, config) {
  ctx.save();
  ctx.globalAlpha = 0.05;

  const patternSize = 50;
  ctx.strokeStyle = config.primaryColor;
  ctx.lineWidth = 1;

  for (let x = 0; x < config.width; x += patternSize) {
    for (let y = 0; y < config.height; y += patternSize) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + patternSize, y + patternSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + patternSize, y);
      ctx.lineTo(x, y + patternSize);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draw default template
 */
async function drawDefaultTemplate(ctx, content, templateConfig, config) {
  const { title, subtitle } = content;

  // Title
  ctx.fillStyle = config.primaryColor;
  ctx.font = `${templateConfig.title.fontWeight} ${templateConfig.title.fontSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'BIZRA Genesis', config.width / 2, templateConfig.title.y);

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = config.textColor;
    ctx.font = `${templateConfig.subtitle.fontSize}px ${config.fontFamily}`;
    ctx.fillText(subtitle, config.width / 2, templateConfig.subtitle.y);
  }
}

/**
 * Draw achievement template
 */
async function drawAchievementTemplate(ctx, content, templateConfig, config) {
  const { achievement } = content;

  // Achievement icon (emoji)
  ctx.font = `${templateConfig.icon.size}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(achievement.icon || '🏆', config.width / 2, templateConfig.icon.y);

  // Achievement name
  ctx.fillStyle = config.primaryColor;
  ctx.font = `${templateConfig.title.fontWeight} ${templateConfig.title.fontSize}px ${config.fontFamily}`;
  ctx.fillText(achievement.name, config.width / 2, templateConfig.title.y);

  // Achievement description
  ctx.fillStyle = config.textColor;
  ctx.font = `${templateConfig.description.fontSize}px ${config.fontFamily}`;

  // Wrap text if too long
  const maxWidth = config.width - 100;
  const words = achievement.description.split(' ');
  let line = '';
  let y = templateConfig.description.y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, config.width / 2, y);
      line = word + ' ';
      y += templateConfig.description.fontSize + 10;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, config.width / 2, y);

  // Tier badge
  const tierGradient = ctx.createLinearGradient(0, 0, 0, 50);

  if (achievement.tier === 'bronze') {
    tierGradient.addColorStop(0, '#CD7F32');
    tierGradient.addColorStop(1, '#B8860B');
  } else if (achievement.tier === 'silver') {
    tierGradient.addColorStop(0, '#C0C0C0');
    tierGradient.addColorStop(1, '#808080');
  } else if (achievement.tier === 'gold') {
    tierGradient.addColorStop(0, '#FFD700');
    tierGradient.addColorStop(1, '#FFA500');
  } else if (achievement.tier === 'platinum') {
    tierGradient.addColorStop(0, '#E5E4E2');
    tierGradient.addColorStop(1, '#B0B0B0');
  } else if (achievement.tier === 'diamond') {
    tierGradient.addColorStop(0, '#B9F2FF');
    tierGradient.addColorStop(1, '#4DD0E1');
  }

  ctx.fillStyle = tierGradient;
  ctx.font = `${templateConfig.tier.fontWeight} ${templateConfig.tier.fontSize}px ${config.fontFamily}`;
  ctx.fillText(`${achievement.tier.toUpperCase()} TIER`, config.width / 2, templateConfig.tier.y);
}

/**
 * Draw referral template
 */
async function drawReferralTemplate(ctx, content, templateConfig, config) {
  const { invitationCode, title, subtitle } = content;

  // Title
  ctx.fillStyle = config.primaryColor;
  ctx.font = `${templateConfig.title.fontSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'Join BIZRA Genesis', config.width / 2, templateConfig.title.y);

  // Invitation code (highlighted)
  ctx.save();

  // Draw code background
  const codeWidth = 500;
  const codeHeight = 120;
  const codeX = (config.width - codeWidth) / 2;
  const codeY = templateConfig.code.y - 90;

  const codeGradient = ctx.createLinearGradient(codeX, codeY, codeX, codeY + codeHeight);
  codeGradient.addColorStop(0, config.primaryColor);
  codeGradient.addColorStop(1, config.secondaryColor);

  ctx.fillStyle = codeGradient;
  roundRect(ctx, codeX, codeY, codeWidth, codeHeight, 20);
  ctx.fill();

  // Draw code text
  ctx.fillStyle = config.backgroundColor;
  ctx.font = `${templateConfig.code.fontWeight} ${templateConfig.code.fontSize}px monospace`;
  ctx.fillText(invitationCode, config.width / 2, templateConfig.code.y);

  ctx.restore();

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = config.textColor;
    ctx.font = `${templateConfig.subtitle.fontSize}px ${config.fontFamily}`;
    ctx.fillText(subtitle, config.width / 2, templateConfig.subtitle.y);
  }
}

/**
 * Draw network template
 */
async function drawNetworkTemplate(ctx, content, templateConfig, config) {
  const { stats, title } = content;

  // Title
  ctx.fillStyle = config.textColor;
  ctx.font = `${templateConfig.title.fontSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'My BIZRA Genesis Network', config.width / 2, templateConfig.title.y);

  // Main stat value (e.g., total network size)
  ctx.fillStyle = config.primaryColor;
  ctx.font = `${templateConfig.statValue.fontWeight} ${templateConfig.statValue.fontSize}px ${config.fontFamily}`;
  ctx.fillText(stats.totalInvited.toString(), config.width / 2, templateConfig.statValue.y);

  // Stat label
  ctx.fillStyle = config.textColor;
  ctx.font = `${templateConfig.statLabel.fontSize}px ${config.fontFamily}`;
  ctx.fillText('Members', config.width / 2, templateConfig.statLabel.y);

  // Additional stats (viral coefficient)
  if (stats.viralCoefficient) {
    const coeff = stats.viralCoefficient.toFixed(2);
    ctx.fillStyle = config.primaryColor;
    ctx.font = `bold 32px ${config.fontFamily}`;
    ctx.fillText(`${coeff}x Viral Coefficient 🚀`, config.width / 2, templateConfig.statLabel.y + 60);
  }
}

/**
 * Draw milestone template
 */
async function drawMilestoneTemplate(ctx, content, templateConfig, config) {
  const { milestone } = content;

  // Title
  ctx.fillStyle = config.textColor;
  ctx.font = `32px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('Milestone Achieved', config.width / 2, 140);

  // Icon
  ctx.font = `${templateConfig.icon.size}px ${config.fontFamily}`;
  ctx.fillText(milestone.icon || '🎯', config.width / 2, templateConfig.icon.y);

  // Value
  ctx.fillStyle = config.primaryColor;
  ctx.font = `${templateConfig.value.fontWeight} ${templateConfig.value.fontSize}px ${config.fontFamily}`;
  ctx.fillText(milestone.value, config.width / 2, templateConfig.value.y);

  // Label
  ctx.fillStyle = config.textColor;
  ctx.font = `${templateConfig.label.fontSize}px ${config.fontFamily}`;
  ctx.fillText(milestone.label, config.width / 2, templateConfig.label.y);
}

/**
 * Draw footer branding
 */
function drawFooter(ctx, config) {
  ctx.fillStyle = config.textColor;
  ctx.font = `24px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.8;
  ctx.fillText(config.branding.text, config.width / 2, 570);

  ctx.font = `18px ${config.fontFamily}`;
  ctx.globalAlpha = 0.6;
  ctx.fillText(config.branding.tagline, config.width / 2, 600);

  ctx.globalAlpha = 1.0;
}

/**
 * Helper: Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generate Open Graph image
 */
export async function generateOpenGraphImage(content) {
  return generateShareGraphic(content, 'default');
}

/**
 * Generate Twitter Card image
 */
export async function generateTwitterCardImage(content) {
  const twitterConfig = {
    width: 1200,
    height: 675 // Twitter optimal size
  };

  return generateShareGraphic({ ...content, config: twitterConfig }, content.template || 'default');
}

/**
 * Cache configuration for generated images
 */
const imageCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

export function getCachedImage(key) {
  const cached = imageCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    imageCache.delete(key);
    return null;
  }

  return cached.buffer;
}

export function setCachedImage(key, buffer) {
  imageCache.set(key, {
    buffer,
    timestamp: Date.now()
  });
}

export function clearImageCache() {
  imageCache.clear();
}

export default {
  generateShareGraphic,
  generateOpenGraphImage,
  generateTwitterCardImage,
  getCachedImage,
  setCachedImage,
  clearImageCache
};
