// Environment configuration for SuperInstance website
// Defines settings for different deployment environments

export type Environment = 'development' | 'preview' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: Environment;
  url: string;
  apiUrl: string;
  analytics: {
    enabled: boolean;
    provider: 'cloudflare' | 'google' | 'plausible' | 'none';
    trackingId?: string;
  };
  featureFlags: {
    enableDemos: boolean;
    enableBlog: boolean;
    enableCommunity: boolean;
    enableExperimental: boolean;
  };
  monitoring: {
    errorTracking: boolean;
    performanceMonitoring: boolean;
    realUserMonitoring: boolean;
  };
  security: {
    requireHttps: boolean;
    cspEnabled: boolean;
    hstsEnabled: boolean;
  };
}

// Base configuration shared across all environments
const baseConfig: Omit<EnvironmentConfig, 'name' | 'url' | 'apiUrl'> = {
  analytics: {
    enabled: true,
    provider: 'cloudflare',
  },
  featureFlags: {
    enableDemos: true,
    enableBlog: true,
    enableCommunity: false,
    enableExperimental: false,
  },
  monitoring: {
    errorTracking: true,
    performanceMonitoring: true,
    realUserMonitoring: false,
  },
  security: {
    requireHttps: true,
    cspEnabled: true,
    hstsEnabled: true,
  },
};

// Environment-specific configurations
export const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'development',
    url: 'http://localhost:4321',
    apiUrl: 'http://localhost:3000',
    analytics: {
      ...baseConfig.analytics,
      enabled: false, // Disable analytics in development
      provider: 'none',
    },
    featureFlags: {
      ...baseConfig.featureFlags,
      enableExperimental: true, // Enable experimental features in dev
    },
    monitoring: {
      ...baseConfig.monitoring,
      realUserMonitoring: false, // Disable RUM in dev
    },
    security: {
      ...baseConfig.security,
      requireHttps: false, // Allow HTTP in development
      hstsEnabled: false, // Disable HSTS in development
    },
  },

  preview: {
    name: 'preview',
    url: 'https://preview.superinstance.ai',
    apiUrl: 'https://api-preview.superinstance.ai',
    analytics: {
      ...baseConfig.analytics,
      enabled: true,
      provider: 'cloudflare',
    },
    featureFlags: {
      ...baseConfig.featureFlags,
      enableCommunity: false, // Disable community in preview
      enableExperimental: true, // Enable experimental in preview
    },
    monitoring: {
      ...baseConfig.monitoring,
      realUserMonitoring: false, // Disable RUM in preview
    },
    security: {
      ...baseConfig.security,
      cspEnabled: true,
      hstsEnabled: true,
    },
  },

  staging: {
    name: 'staging',
    url: 'https://staging.superinstance.ai',
    apiUrl: 'https://api-staging.superinstance.ai',
    analytics: {
      ...baseConfig.analytics,
      enabled: true,
      provider: 'cloudflare',
    },
    featureFlags: {
      ...baseConfig.featureFlags,
      enableCommunity: false, // Disable community in staging
      enableExperimental: false, // Disable experimental in staging
    },
    monitoring: {
      ...baseConfig.monitoring,
      realUserMonitoring: false, // Disable RUM in staging
    },
    security: {
      ...baseConfig.security,
      cspEnabled: true,
      hstsEnabled: true,
    },
  },

  production: {
    name: 'production',
    url: 'https://superinstance.ai',
    apiUrl: 'https://api.superinstance.ai',
    analytics: {
      ...baseConfig.analytics,
      enabled: true,
      provider: 'cloudflare',
    },
    featureFlags: {
      ...baseConfig.featureFlags,
      enableCommunity: true, // Enable community in production
      enableExperimental: false, // Disable experimental in production
    },
    monitoring: {
      ...baseConfig.monitoring,
      realUserMonitoring: true, // Enable RUM in production
    },
    security: {
      ...baseConfig.security,
      cspEnabled: true,
      hstsEnabled: true,
    },
  },
};

// Helper function to get current environment
export function getCurrentEnvironment(): Environment {
  const env = import.meta.env?.MODE || process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    case 'preview':
      return 'preview';
    default:
      return 'development';
  }
}

// Get configuration for current environment
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();
  return environments[env];
}

// Check if running in production
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

// Check if running in staging
export function isStaging(): boolean {
  return getCurrentEnvironment() === 'staging';
}

// Check if running in development
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

// Check if running in preview
export function isPreview(): boolean {
  return getCurrentEnvironment() === 'preview';
}

// Get environment-specific variables
export function getEnvVars() {
  const config = getEnvironmentConfig();

  return {
    // Site configuration
    SITE_URL: config.url,
    API_URL: config.apiUrl,
    NODE_ENV: config.name,

    // Feature flags (as environment variables for components)
    ENABLE_DEMOS: config.featureFlags.enableDemos.toString(),
    ENABLE_BLOG: config.featureFlags.enableBlog.toString(),
    ENABLE_COMMUNITY: config.featureFlags.enableCommunity.toString(),
    ENABLE_EXPERIMENTAL: config.featureFlags.enableExperimental.toString(),

    // Analytics
    ANALYTICS_ENABLED: config.analytics.enabled.toString(),
    ANALYTICS_PROVIDER: config.analytics.provider,
    ANALYTICS_ID: config.analytics.trackingId || '',
  };
}

// Export default configuration
export default getEnvironmentConfig();