/**
 * Basic authentication tests
 */

import { describe, it, expect } from '@jest/globals';
import { getAuthService } from '../auth/AuthService.js';

describe('AuthService Basic', () => {
  it('should create service instance', () => {
    const service = getAuthService();
    expect(service).toBeDefined();
  });

  it('should have default admin user', () => {
    const service = getAuthService();
    const users = service.getAllUsers();
    const admin = users.find(u => u.username === 'admin');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
  });
});
