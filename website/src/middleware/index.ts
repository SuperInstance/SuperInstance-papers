/**
 * Main middleware file for SuperInstance website
 * Combines all middleware functions
 */

import { defineMiddleware } from 'astro:middleware';
import { securityMiddleware } from './security';

/**
 * Main middleware function
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Apply security middleware
  return securityMiddleware(context, next);
});

/**
 * Export middleware components for use in other files
 */
export { validateFormInput, sanitizeHtml, generateCsrfToken, validateCsrfToken, logSecurityEvent } from './security';