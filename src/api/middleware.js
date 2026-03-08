"use strict";
/**
 * API Middleware for POLLN WebSocket Server
 * Authentication, rate limiting, and validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIErrorFactory = exports.ValidationMiddleware = exports.RateLimitMiddleware = exports.AuthenticationMiddleware = void 0;
var uuid_1 = require("uuid");
// ============================================================================
// Authentication Middleware
// ============================================================================
var AuthenticationMiddleware = /** @class */ (function () {
    function AuthenticationMiddleware() {
        this.tokens = new Map();
        this.clients = new Map();
        this.defaultRateLimit = {
            requestsPerMinute: 100,
            burstLimit: 10,
            windowMs: 60000,
        };
    }
    /**
     * Generate a new API token
     */
    AuthenticationMiddleware.prototype.generateToken = function (gardenerId, permissions, expiresIn // 24 hours default
    ) {
        if (expiresIn === void 0) { expiresIn = 24 * 60 * 60 * 1000; }
        var token = (0, uuid_1.v4)();
        var now = Date.now();
        var apiToken = {
            token: token,
            gardenerId: gardenerId,
            permissions: permissions,
            createdAt: now,
            expiresAt: now + expiresIn,
            rateLimit: this.defaultRateLimit,
        };
        this.tokens.set(token, apiToken);
        return token;
    };
    /**
     * Revoke a token
     */
    AuthenticationMiddleware.prototype.revokeToken = function (token) {
        // Also remove any authenticated clients using this token
        var apiToken = this.tokens.get(token);
        if (apiToken) {
            for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
                var _b = _a[_i], clientId = _b[0], client = _b[1];
                if (client.token === token) {
                    this.clients.delete(clientId);
                }
            }
        }
        return this.tokens.delete(token);
    };
    /**
     * Validate a token
     */
    AuthenticationMiddleware.prototype.validateToken = function (token) {
        var apiToken = this.tokens.get(token);
        if (!apiToken) {
            return null;
        }
        // Check expiration
        if (Date.now() > apiToken.expiresAt) {
            this.tokens.delete(token);
            return null;
        }
        return apiToken;
    };
    /**
     * Authenticate a client connection
     */
    AuthenticationMiddleware.prototype.authenticate = function (clientId, token) {
        var apiToken = this.validateToken(token);
        if (!apiToken) {
            return null;
        }
        var client = {
            id: clientId,
            gardenerId: apiToken.gardenerId,
            permissions: apiToken.permissions,
            token: token,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
        };
        this.clients.set(clientId, client);
        return client;
    };
    /**
     * Deauthenticate a client
     */
    AuthenticationMiddleware.prototype.deauthenticate = function (clientId) {
        return this.clients.delete(clientId);
    };
    /**
     * Get client by ID
     */
    AuthenticationMiddleware.prototype.getClient = function (clientId) {
        return this.clients.get(clientId);
    };
    /**
     * Update client activity
     */
    AuthenticationMiddleware.prototype.updateActivity = function (clientId) {
        var client = this.clients.get(clientId);
        if (client) {
            client.lastActivity = Date.now();
        }
    };
    /**
     * Check if client has permission
     */
    AuthenticationMiddleware.prototype.hasPermission = function (client, resource, action) {
        return client.permissions.some(function (p) { return p.resource === resource && p.actions.includes(action); });
    };
    /**
     * Get all authenticated clients
     */
    AuthenticationMiddleware.prototype.getAllClients = function () {
        return Array.from(this.clients.values());
    };
    /**
     * Clean up expired tokens
     */
    AuthenticationMiddleware.prototype.cleanupExpiredTokens = function () {
        var count = 0;
        var now = Date.now();
        for (var _i = 0, _a = this.tokens; _i < _a.length; _i++) {
            var _b = _a[_i], token = _b[0], apiToken = _b[1];
            if (now > apiToken.expiresAt) {
                this.tokens.delete(token);
                count++;
            }
        }
        return count;
    };
    return AuthenticationMiddleware;
}());
exports.AuthenticationMiddleware = AuthenticationMiddleware;
// ============================================================================
// Rate Limiting Middleware
// ============================================================================
var RateLimitMiddleware = /** @class */ (function () {
    function RateLimitMiddleware(config) {
        var _a, _b, _c;
        this.trackers = new Map();
        this.config = {
            requestsPerMinute: (_a = config === null || config === void 0 ? void 0 : config.requestsPerMinute) !== null && _a !== void 0 ? _a : 100,
            burstLimit: (_b = config === null || config === void 0 ? void 0 : config.burstLimit) !== null && _b !== void 0 ? _b : 10,
            windowMs: (_c = config === null || config === void 0 ? void 0 : config.windowMs) !== null && _c !== void 0 ? _c : 60000,
        };
    }
    /**
     * Check if a request is allowed
     */
    RateLimitMiddleware.prototype.checkLimit = function (clientId) {
        var tracker = this.getOrCreateTracker(clientId);
        var now = Date.now();
        // Reset window if expired
        if (now >= tracker.resetAt) {
            tracker.count = 0;
            tracker.resetAt = now + this.config.windowMs;
            tracker.burstTokens = this.config.burstLimit;
        }
        // Check burst limit first
        if (tracker.burstTokens > 0) {
            tracker.burstTokens--;
            tracker.count++;
            return true;
        }
        // Check rate limit
        if (tracker.count < this.config.requestsPerMinute) {
            tracker.count++;
            return true;
        }
        return false;
    };
    /**
     * Get remaining requests for a client
     */
    RateLimitMiddleware.prototype.getRemainingRequests = function (clientId) {
        var tracker = this.trackers.get(clientId);
        if (!tracker) {
            return this.config.requestsPerMinute;
        }
        var now = Date.now();
        if (now >= tracker.resetAt) {
            return this.config.requestsPerMinute;
        }
        return Math.max(0, this.config.requestsPerMinute - tracker.count);
    };
    /**
     * Get time until reset
     */
    RateLimitMiddleware.prototype.getResetTime = function (clientId) {
        var tracker = this.trackers.get(clientId.toString());
        if (!tracker) {
            return 0;
        }
        var now = Date.now();
        return Math.max(0, tracker.resetAt - now);
    };
    /**
     * Get or create a tracker for a client
     */
    RateLimitMiddleware.prototype.getOrCreateTracker = function (clientId) {
        var tracker = this.trackers.get(clientId);
        if (!tracker) {
            tracker = {
                count: 0,
                resetAt: Date.now() + this.config.windowMs,
                burstTokens: this.config.burstLimit,
            };
            this.trackers.set(clientId, tracker);
        }
        return tracker;
    };
    /**
     * Clean up old trackers
     */
    RateLimitMiddleware.prototype.cleanup = function () {
        var count = 0;
        var now = Date.now();
        var threshold = now + this.config.windowMs;
        for (var _i = 0, _a = this.trackers; _i < _a.length; _i++) {
            var _b = _a[_i], clientId = _b[0], tracker = _b[1];
            if (now > tracker.resetAt + this.config.windowMs) {
                this.trackers.delete(clientId);
                count++;
            }
        }
        return count;
    };
    return RateLimitMiddleware;
}());
exports.RateLimitMiddleware = RateLimitMiddleware;
// ============================================================================
// Validation Middleware
// ============================================================================
var ValidationMiddleware = /** @class */ (function () {
    function ValidationMiddleware() {
    }
    /**
     * Validate a client message
     */
    ValidationMiddleware.prototype.validateMessage = function (message) {
        if (!message || typeof message !== 'object') {
            return false;
        }
        var msg = message;
        // Check required fields
        if (typeof msg.id !== 'string' || !msg.id) {
            return false;
        }
        if (typeof msg.timestamp !== 'number' || msg.timestamp <= 0) {
            return false;
        }
        if (typeof msg.type !== 'string' || !msg.type) {
            return false;
        }
        // Validate timestamp is not too old (5 minutes max)
        var maxAge = 5 * 60 * 1000;
        if (Date.now() - msg.timestamp > maxAge) {
            return false;
        }
        return true;
    };
    /**
     * Validate subscription payload
     */
    ValidationMiddleware.prototype.validateSubscription = function (type, payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        var p = payload;
        if (type === 'subscribe:colony' || type === 'unsubscribe:colony') {
            return typeof p.colonyId === 'string' && Array.isArray(p.events);
        }
        if (type === 'subscribe:agent' || type === 'unsubscribe:agent') {
            return typeof p.agentId === 'string' && Array.isArray(p.events);
        }
        if (type === 'subscribe:dreams' || type === 'unsubscribe:dreams') {
            return typeof p.colonyId === 'string';
        }
        return false;
    };
    /**
     * Validate command payload
     */
    ValidationMiddleware.prototype.validateCommand = function (type, payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        var p = payload;
        if (type === 'command:spawn') {
            return typeof p.typeId === 'string';
        }
        if (type === 'command:despawn') {
            return typeof p.agentId === 'string';
        }
        if (type === 'command:activate' || type === 'command:deactivate') {
            return typeof p.agentId === 'string';
        }
        if (type === 'command:dream') {
            return true; // Optional parameters
        }
        return false;
    };
    /**
     * Validate query payload
     */
    ValidationMiddleware.prototype.validateQuery = function (type, payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }
        var p = payload;
        if (type === 'query:stats') {
            return true; // All optional
        }
        if (type === 'query:agents') {
            return typeof p.colonyId === 'string';
        }
        if (type === 'query:agent') {
            return typeof p.agentId === 'string';
        }
        if (type === 'query:config') {
            return true; // All optional
        }
        return false;
    };
    return ValidationMiddleware;
}());
exports.ValidationMiddleware = ValidationMiddleware;
// ============================================================================
// Error Factory
// ============================================================================
var APIErrorFactory = /** @class */ (function () {
    function APIErrorFactory() {
    }
    APIErrorFactory.create = function (code, message, details) {
        var messages = {
            UNAUTHORIZED: 'Authentication required',
            FORBIDDEN: 'Insufficient permissions',
            NOT_FOUND: 'Resource not found',
            INVALID_PAYLOAD: 'Invalid request payload',
            RATE_LIMITED: 'Rate limit exceeded',
            INTERNAL_ERROR: 'Internal server error',
            AGENT_NOT_FOUND: 'Agent not found',
            COLONY_NOT_FOUND: 'Colony not found',
            COMMAND_FAILED: 'Command execution failed',
        };
        return {
            code: code,
            message: message !== null && message !== void 0 ? message : messages[code],
            details: details,
        };
    };
    APIErrorFactory.unauthorized = function (message) {
        return this.create('UNAUTHORIZED', message);
    };
    APIErrorFactory.forbidden = function (message) {
        return this.create('FORBIDDEN', message);
    };
    APIErrorFactory.notFound = function (resource) {
        return this.create('NOT_FOUND', "".concat(resource, " not found"));
    };
    APIErrorFactory.invalidPayload = function (details) {
        return this.create('INVALID_PAYLOAD', undefined, details);
    };
    APIErrorFactory.rateLimited = function () {
        return this.create('RATE_LIMITED');
    };
    APIErrorFactory.internalError = function (message) {
        return this.create('INTERNAL_ERROR', message);
    };
    return APIErrorFactory;
}());
exports.APIErrorFactory = APIErrorFactory;
