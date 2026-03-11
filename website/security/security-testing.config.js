// Security testing configuration for SuperInstance website

export const securityConfig = {
  // OWASP Top 10 security testing
  owaspTop10: {
    // A01:2021 - Broken Access Control
    accessControl: {
      enabled: true,
      tests: [
        'vertical-privilege-escalation',
        'horizontal-privilege-escalation',
        'insecure-direct-object-references',
        'missing-function-level-access-control',
      ],
    },

    // A02:2021 - Cryptographic Failures
    cryptography: {
      enabled: true,
      tests: [
        'weak-encryption-algorithms',
        'insecure-transport',
        'sensitive-data-exposure',
        'improper-certificate-validation',
      ],
    },

    // A03:2021 - Injection
    injection: {
      enabled: true,
      tests: [
        'sql-injection',
        'nosql-injection',
        'command-injection',
        'ldap-injection',
        'xpath-injection',
      ],
    },

    // A04:2021 - Insecure Design
    insecureDesign: {
      enabled: true,
      tests: [
        'missing-security-requirements',
        'insecure-defaults',
        'broken-authentication',
      ],
    },

    // A05:2021 - Security Misconfiguration
    misconfiguration: {
      enabled: true,
      tests: [
        'unnecessary-features-enabled',
        'default-accounts-active',
        'error-handling-leaks-info',
        'security-headers-missing',
      ],
    },

    // A06:2021 - Vulnerable and Outdated Components
    vulnerableComponents: {
      enabled: true,
      tests: [
        'outdated-dependencies',
        'known-vulnerabilities',
        'unsupported-components',
      ],
    },

    // A07:2021 - Identification and Authentication Failures
    authentication: {
      enabled: true,
      tests: [
        'weak-password-policy',
        'missing-multi-factor-auth',
        'credential-stuffing',
        'session-fixation',
      ],
    },

    // A08:2021 - Software and Data Integrity Failures
    integrity: {
      enabled: true,
      tests: [
        'insecure-deserialization',
        'ci-cd-pipeline-compromise',
        'untrusted-code-execution',
      ],
    },

    // A09:2021 - Security Logging and Monitoring Failures
    logging: {
      enabled: true,
      tests: [
        'missing-audit-logs',
        'logs-not-monitored',
        'insufficient-log-detail',
      ],
    },

    // A10:2021 - Server-Side Request Forgery (SSRF)
    ssrf: {
      enabled: true,
      tests: [
        'internal-network-access',
        'cloud-metadata-access',
        'file-protocol-access',
      ],
    },
  },

  // Web application security headers
  securityHeaders: {
    required: [
      {
        name: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://api.superinstance.ai;",
        description: 'Prevents XSS and data injection attacks',
      },
      {
        name: 'X-Frame-Options',
        value: 'DENY',
        description: 'Prevents clickjacking attacks',
      },
      {
        name: 'X-Content-Type-Options',
        value: 'nosniff',
        description: 'Prevents MIME type sniffing',
      },
      {
        name: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
        description: 'Controls referrer information',
      },
      {
        name: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
        description: 'Controls browser features',
      },
      {
        name: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
        description: 'Enforces HTTPS',
      },
    ],
  },

  // Dependency scanning configuration
  dependencyScanning: {
    tools: ['npm-audit', 'snyk', 'dependabot'],
    severityLevels: ['critical', 'high', 'medium', 'low'],
    autoRemediate: false,
    schedule: 'daily',
  },

  // SAST (Static Application Security Testing) configuration
  sast: {
    tools: ['eslint-security', 'typescript-eslint', 'sonarqube'],
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      'security/detect-object-injection': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-non-literal-regexp': 'error',
    },
  },

  // DAST (Dynamic Application Security Testing) configuration
  dast: {
    tools: ['zap', 'burp-suite', 'nikto'],
    scanTypes: ['passive', 'active', 'ajax'],
    authentication: {
      enabled: false, // No authentication required for static site
      method: 'form-based',
    },
  },

  // API security testing
  apiSecurity: {
    enabled: false, // No APIs in static site initially
    tools: ['postman-security', 'insomnia'],
    tests: [
      'rate-limiting',
      'input-validation',
      'authentication',
      'authorization',
      'data-exposure',
    ],
  },

  // Compliance requirements
  compliance: {
    gdpr: {
      enabled: true,
      requirements: [
        'data-minimization',
        'user-consent',
        'right-to-access',
        'right-to-erasure',
      ],
    },
    ccpa: {
      enabled: true,
      requirements: [
        'opt-out-mechanism',
        'data-deletion',
        'data-disclosure',
      ],
    },
    hipaa: {
      enabled: false, // Not handling healthcare data
    },
    pciDss: {
      enabled: false, // Not handling payment data
    },
  },

  // Penetration testing scope
  penetrationTesting: {
    scope: [
      'superinstance.ai',
      'staging.superinstance.ai',
      'api.superinstance.ai',
    ],
    methodology: 'owasp-testing-guide',
    frequency: 'quarterly',
    reportFormat: ['pdf', 'html', 'json'],
  },

  // Incident response
  incidentResponse: {
    contactPoints: [
      'security@superinstance.ai',
      'admin@superinstance.ai',
    ],
    sla: {
      critical: '1 hour',
      high: '4 hours',
      medium: '24 hours',
      low: '72 hours',
    },
  },

  // Security monitoring
  monitoring: {
    tools: ['sentry', 'cloudflare-waf', 'google-safe-browsing'],
    alerts: {
      xssAttempts: true,
      sqlInjectionAttempts: true,
      bruteForceAttempts: true,
      malwareDetection: true,
      dataLeakage: true,
    },
  },
};

// Security test scenarios
export const securityTestScenarios = [
  {
    name: 'XSS Protection Test',
    description: 'Test for Cross-Site Scripting vulnerabilities',
    type: 'injection',
    steps: [
      'Inject script tags in form inputs',
      'Test URL parameters for script execution',
      'Check for proper output encoding',
      'Verify Content-Security-Policy headers',
    ],
    expected: 'No script execution, proper encoding applied',
  },
  {
    name: 'CSRF Protection Test',
    description: 'Test for Cross-Site Request Forgery vulnerabilities',
    type: 'access-control',
    steps: [
      'Attempt to submit forms without CSRF tokens',
      'Test same-origin policy enforcement',
      'Verify anti-CSRF tokens in forms',
    ],
    expected: 'CSRF tokens required, same-origin policy enforced',
  },
  {
    name: 'Clickjacking Protection Test',
    description: 'Test for UI redress attacks',
    type: 'misconfiguration',
    steps: [
      'Check X-Frame-Options header',
      'Test frame busting JavaScript',
      'Verify Content-Security-Policy frame-ancestors',
    ],
    expected: 'X-Frame-Options: DENY or proper CSP',
  },
  {
    name: 'Security Headers Test',
    description: 'Verify all security headers are present',
    type: 'misconfiguration',
    steps: [
      'Check for Content-Security-Policy',
      'Verify X-Content-Type-Options',
      'Check Referrer-Policy',
      'Verify Permissions-Policy',
      'Check Strict-Transport-Security',
    ],
    expected: 'All security headers present with correct values',
  },
  {
    name: 'Dependency Vulnerability Scan',
    description: 'Scan for known vulnerabilities in dependencies',
    type: 'vulnerable-components',
    steps: [
      'Run npm audit',
      'Scan with Snyk',
      'Check for outdated packages',
      'Verify no known CVEs in dependencies',
    ],
    expected: 'No critical or high severity vulnerabilities',
  },
  {
    name: 'Sensitive Data Exposure Test',
    description: 'Check for exposure of sensitive data',
    type: 'cryptography',
    steps: [
      'Check for hardcoded secrets',
      'Verify no sensitive data in client-side code',
      'Check for proper HTTPS enforcement',
      'Verify no sensitive data in logs',
    ],
    expected: 'No sensitive data exposed, HTTPS enforced',
  },
  {
    name: 'Authentication Bypass Test',
    description: 'Test for authentication bypass vulnerabilities',
    type: 'authentication',
    steps: [
      'Test direct access to protected routes',
      'Check for insecure session management',
      'Verify proper logout functionality',
      'Test for session fixation',
    ],
    expected: 'Authentication required for protected routes',
  },
  {
    name: 'Input Validation Test',
    description: 'Test for input validation vulnerabilities',
    type: 'injection',
    steps: [
      'Test SQL injection payloads',
      'Test NoSQL injection payloads',
      'Test command injection payloads',
      'Test path traversal payloads',
    ],
    expected: 'Input properly validated and sanitized',
  },
];

// Security thresholds for CI/CD
export const securityThresholds = {
  // Vulnerability severity thresholds
  vulnerabilities: {
    critical: 0,
    high: 0,
    medium: 5,
    low: 10,
  },

  // Security score thresholds
  scores: {
    owasp: 90, // Minimum OWASP score percentage
    securityHeaders: 100, // All security headers must be present
    dependencyHealth: 90, // Minimum dependency health score
  },

  // Compliance requirements
  compliance: {
    gdpr: true, // Must be GDPR compliant
    ccpa: true, // Must be CCPA compliant
    accessibility: true, // Must be WCAG compliant
  },

  // Monitoring requirements
  monitoring: {
    errorTracking: true, // Error tracking must be enabled
    securityMonitoring: true, // Security monitoring must be enabled
    logRetention: 30, // Minimum days of log retention
  },
};