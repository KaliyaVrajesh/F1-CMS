/**
 * Liquid Distortion Effect Configuration
 * Centralized configuration for easy customization
 */

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const EFFECT_PRESETS = {
  subtle: {
    name: 'Subtle',
    description: 'Gentle, elegant ripples',
    rippleIntensity: 0.05,
    rippleSpeed: 1.5,
    rippleFade: 0.98,
    maxRipples: 12,
    chromaticAberration: 0.002,
    refractionStrength: 0.12,
    displacementSize: 512
  },
  
  medium: {
    name: 'Medium',
    description: 'Balanced, noticeable effect',
    rippleIntensity: 0.1,
    rippleSpeed: 2.2,
    rippleFade: 0.96,
    maxRipples: 18,
    chromaticAberration: 0.004,
    refractionStrength: 0.18,
    displacementSize: 1024
  },
  
  intense: {
    name: 'Intense',
    description: 'Dramatic, powerful distortion',
    rippleIntensity: 0.2,
    rippleSpeed: 3.0,
    rippleFade: 0.93,
    maxRipples: 25,
    chromaticAberration: 0.008,
    refractionStrength: 0.25,
    displacementSize: 1024
  },
  
  performance: {
    name: 'Performance',
    description: 'Optimized for lower-end devices',
    rippleIntensity: 0.08,
    rippleSpeed: 2.0,
    rippleFade: 0.97,
    maxRipples: 10,
    chromaticAberration: 0.003,
    refractionStrength: 0.15,
    displacementSize: 512
  },
  
  cinematic: {
    name: 'Cinematic',
    description: 'High-quality, movie-like effect',
    rippleIntensity: 0.15,
    rippleSpeed: 1.8,
    rippleFade: 0.97,
    maxRipples: 30,
    chromaticAberration: 0.006,
    refractionStrength: 0.22,
    displacementSize: 2048
  }
};

// ============================================
// TEAM COLOR SCHEMES
// ============================================

export const TEAM_COLORS = {
  redbull: {
    primary: '#0600ef',
    secondary: '#1e1b4b',
    tertiary: '#0f0a3c',
    accent: '#ffd700',
    name: 'RED BULL RACING'
  },
  
  mclaren: {
    primary: '#ff8700',
    secondary: '#ea580c',
    tertiary: '#c2410c',
    accent: '#000000',
    name: 'McLAREN F1 TEAM'
  },
  
  ferrari: {
    primary: '#dc0000',
    secondary: '#8b0000',
    tertiary: '#5c0000',
    accent: '#ffd700',
    name: 'SCUDERIA FERRARI'
  },
  
  mercedes: {
    primary: '#00d2be',
    secondary: '#00a19c',
    tertiary: '#007a7a',
    accent: '#c0c0c0',
    name: 'MERCEDES-AMG PETRONAS'
  },
  
  alpine: {
    primary: '#0090ff',
    secondary: '#005aff',
    tertiary: '#003d99',
    accent: '#ff1e00',
    name: 'BWT ALPINE F1 TEAM'
  },
  
  astonmartin: {
    primary: '#006f62',
    secondary: '#00594f',
    tertiary: '#00403a',
    accent: '#00d2be',
    name: 'ASTON MARTIN F1 TEAM'
  }
};

// ============================================
// DEVICE-SPECIFIC CONFIGURATIONS
// ============================================

export const getDeviceConfig = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 4;
  const pixelRatio = window.devicePixelRatio || 1;

  if (isMobile) {
    return {
      ...EFFECT_PRESETS.performance,
      displacementSize: 512,
      maxRipples: 8
    };
  }

  if (isLowEnd) {
    return EFFECT_PRESETS.performance;
  }

  if (pixelRatio > 2) {
    return EFFECT_PRESETS.cinematic;
  }

  return EFFECT_PRESETS.medium;
};

// ============================================
// CONFIGURATION BUILDER
// ============================================

export class LiquidEffectConfig {
  constructor(preset = 'medium') {
    this.config = { ...EFFECT_PRESETS[preset] };
  }

  /**
   * Set a preset configuration
   */
  setPreset(presetName) {
    if (EFFECT_PRESETS[presetName]) {
      this.config = { ...EFFECT_PRESETS[presetName] };
    }
    return this;
  }

  /**
   * Set ripple intensity (0.0 - 0.3)
   */
  setIntensity(value) {
    this.config.rippleIntensity = Math.max(0, Math.min(0.3, value));
    return this;
  }

  /**
   * Set ripple speed (1.0 - 5.0)
   */
  setSpeed(value) {
    this.config.rippleSpeed = Math.max(1, Math.min(5, value));
    return this;
  }

  /**
   * Set fade rate (0.9 - 0.99)
   */
  setFade(value) {
    this.config.rippleFade = Math.max(0.9, Math.min(0.99, value));
    return this;
  }

  /**
   * Set maximum concurrent ripples (5 - 50)
   */
  setMaxRipples(value) {
    this.config.maxRipples = Math.max(5, Math.min(50, value));
    return this;
  }

  /**
   * Set chromatic aberration (0.0 - 0.01)
   */
  setChromaticAberration(value) {
    this.config.chromaticAberration = Math.max(0, Math.min(0.01, value));
    return this;
  }

  /**
   * Set refraction strength (0.0 - 0.5)
   */
  setRefractionStrength(value) {
    this.config.refractionStrength = Math.max(0, Math.min(0.5, value));
    return this;
  }

  /**
   * Set displacement map size (256, 512, 1024, 2048)
   */
  setDisplacementSize(value) {
    const validSizes = [256, 512, 1024, 2048];
    this.config.displacementSize = validSizes.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    return this;
  }

  /**
   * Enable/disable chromatic aberration
   */
  enableChromaticAberration(enabled = true) {
    if (!enabled) {
      this.config.chromaticAberration = 0;
    }
    return this;
  }

  /**
   * Optimize for performance
   */
  optimizeForPerformance() {
    this.config = { ...EFFECT_PRESETS.performance };
    return this;
  }

  /**
   * Optimize for quality
   */
  optimizeForQuality() {
    this.config = { ...EFFECT_PRESETS.cinematic };
    return this;
  }

  /**
   * Auto-detect and optimize for device
   */
  autoOptimize() {
    this.config = getDeviceConfig();
    return this;
  }

  /**
   * Get the final configuration
   */
  build() {
    return { ...this.config };
  }

  /**
   * Get configuration as JSON string
   */
  toJSON() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load configuration from JSON string
   */
  fromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      this.config = { ...this.config, ...parsed };
    } catch (error) {
      console.error('Failed to parse JSON configuration:', error);
    }
    return this;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a gradient texture configuration
 */
export const createGradientConfig = (colors, angle = 45) => {
  return {
    type: 'gradient',
    colors,
    angle
  };
};

/**
 * Create an image texture configuration
 */
export const createImageConfig = (url, options = {}) => {
  return {
    type: 'image',
    url,
    ...options
  };
};

/**
 * Interpolate between two configurations
 */
export const interpolateConfigs = (config1, config2, t) => {
  const result = {};
  
  for (const key in config1) {
    if (typeof config1[key] === 'number' && typeof config2[key] === 'number') {
      result[key] = config1[key] + (config2[key] - config1[key]) * t;
    } else {
      result[key] = t < 0.5 ? config1[key] : config2[key];
    }
  }
  
  return result;
};

/**
 * Validate configuration
 */
export const validateConfig = (config) => {
  const errors = [];

  if (config.rippleIntensity < 0 || config.rippleIntensity > 0.3) {
    errors.push('rippleIntensity must be between 0 and 0.3');
  }

  if (config.rippleSpeed < 1 || config.rippleSpeed > 5) {
    errors.push('rippleSpeed must be between 1 and 5');
  }

  if (config.rippleFade < 0.9 || config.rippleFade > 0.99) {
    errors.push('rippleFade must be between 0.9 and 0.99');
  }

  if (config.maxRipples < 5 || config.maxRipples > 50) {
    errors.push('maxRipples must be between 5 and 50');
  }

  if (![256, 512, 1024, 2048].includes(config.displacementSize)) {
    errors.push('displacementSize must be 256, 512, 1024, or 2048');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*

// Example 1: Use a preset
import { EFFECT_PRESETS } from './utils/liquidEffectConfig';
const config = EFFECT_PRESETS.intense;

// Example 2: Build custom configuration
import { LiquidEffectConfig } from './utils/liquidEffectConfig';
const config = new LiquidEffectConfig('medium')
  .setIntensity(0.15)
  .setSpeed(2.5)
  .setMaxRipples(20)
  .build();

// Example 3: Auto-optimize for device
const config = new LiquidEffectConfig()
  .autoOptimize()
  .build();

// Example 4: Chain multiple settings
const config = new LiquidEffectConfig('subtle')
  .setIntensity(0.08)
  .enableChromaticAberration(false)
  .optimizeForPerformance()
  .build();

// Example 5: Use team colors
import { TEAM_COLORS } from './utils/liquidEffectConfig';
const redbullColors = TEAM_COLORS.redbull;

// Example 6: Interpolate between presets
import { interpolateConfigs, EFFECT_PRESETS } from './utils/liquidEffectConfig';
const config = interpolateConfigs(
  EFFECT_PRESETS.subtle,
  EFFECT_PRESETS.intense,
  0.5 // 50% between subtle and intense
);

*/

export default LiquidEffectConfig;
