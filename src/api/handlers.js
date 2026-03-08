"use strict";
/**
 * Message Handlers for POLLN WebSocket API
 * Process incoming messages and generate responses
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
var middleware_js_1 = require("./middleware.js");
// ============================================================================
// Message Handler
// ============================================================================
var MessageHandler = /** @class */ (function () {
    function MessageHandler() {
    }
    /**
     * Handle incoming client message
     */
    MessageHandler.prototype.handleMessage = function (message, context) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    switch (message.type) {
                        // Subscriptions
                        case 'subscribe:colony':
                            return [2 /*return*/, this.handleSubscribeColony(message, context)];
                        case 'unsubscribe:colony':
                            return [2 /*return*/, this.handleUnsubscribeColony(message, context)];
                        case 'subscribe:agent':
                            return [2 /*return*/, this.handleSubscribeAgent(message, context)];
                        case 'unsubscribe:agent':
                            return [2 /*return*/, this.handleUnsubscribeAgent(message, context)];
                        case 'subscribe:dreams':
                            return [2 /*return*/, this.handleSubscribeDreams(message, context)];
                        case 'unsubscribe:dreams':
                            return [2 /*return*/, this.handleUnsubscribeDreams(message, context)];
                        case 'subscribe:stats':
                            return [2 /*return*/, this.handleSubscribeStats(message, context)];
                        case 'unsubscribe:stats':
                            return [2 /*return*/, this.handleUnsubscribeStats(message, context)];
                        // Commands
                        case 'command:spawn':
                            return [2 /*return*/, this.handleCommandSpawn(message, context)];
                        case 'command:despawn':
                            return [2 /*return*/, this.handleCommandDespawn(message, context)];
                        case 'command:activate':
                            return [2 /*return*/, this.handleCommandActivate(message, context)];
                        case 'command:deactivate':
                            return [2 /*return*/, this.handleCommandDeactivate(message, context)];
                        case 'command:dream':
                            return [2 /*return*/, this.handleCommandDream(message, context)];
                        // Queries
                        case 'query:stats':
                            return [2 /*return*/, this.handleQueryStats(message, context)];
                        case 'query:agents':
                            return [2 /*return*/, this.handleQueryAgents(message, context)];
                        case 'query:agent':
                            return [2 /*return*/, this.handleQueryAgent(message, context)];
                        case 'query:config':
                            return [2 /*return*/, this.handleQueryConfig(message, context)];
                        // Ping/Pong
                        case 'ping':
                            return [2 /*return*/, this.handlePing(message)];
                        default:
                            return [2 /*return*/, this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.invalidPayload({ unknownMessageType: message.type }))];
                    }
                }
                catch (error) {
                    return [2 /*return*/, this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.internalError(error instanceof Error ? error.message : 'Unknown error'))];
                }
                return [2 /*return*/];
            });
        });
    };
    // ==========================================================================
    // Subscription Handlers
    // ==========================================================================
    MessageHandler.prototype.handleSubscribeColony = function (message, context) {
        var payload = message.payload;
        var colonyId = payload.colonyId, events = payload.events;
        // Check if colony exists
        var colony = context.colonies.get(colonyId);
        if (!colony) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Colony'));
        }
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'colony' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Add subscription
        this.addSubscription(context.client.id, {
            type: 'colony',
            id: colonyId,
            events: events,
            subscribedAt: Date.now(),
        }, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:colony', {
            colonyId: colonyId,
            subscribed: true,
            events: events,
        });
    };
    MessageHandler.prototype.handleUnsubscribeColony = function (message, context) {
        var payload = message.payload;
        this.removeSubscription(context.client.id, 'colony', payload.colonyId, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:colony', {
            colonyId: payload.colonyId,
            subscribed: false,
        });
    };
    MessageHandler.prototype.handleSubscribeAgent = function (message, context) {
        var payload = message.payload;
        var agentId = payload.agentId, events = payload.events;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'agent' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Add subscription
        this.addSubscription(context.client.id, {
            type: 'agent',
            id: agentId,
            events: events,
            subscribedAt: Date.now(),
        }, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:agent', {
            agentId: agentId,
            subscribed: true,
            events: events,
        });
    };
    MessageHandler.prototype.handleUnsubscribeAgent = function (message, context) {
        var payload = message.payload;
        this.removeSubscription(context.client.id, 'agent', payload.agentId, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:agent', {
            agentId: payload.agentId,
            subscribed: false,
        });
    };
    MessageHandler.prototype.handleSubscribeDreams = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'dream' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Add subscription
        this.addSubscription(context.client.id, {
            type: 'dreams',
            id: payload.colonyId,
            events: ['completed', 'failed'],
            subscribedAt: Date.now(),
        }, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:dream', {
            colonyId: payload.colonyId,
            subscribed: true,
        });
    };
    MessageHandler.prototype.handleUnsubscribeDreams = function (message, context) {
        var payload = message.payload;
        this.removeSubscription(context.client.id, 'dreams', payload.colonyId, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:dream', {
            colonyId: payload.colonyId,
            subscribed: false,
        });
    };
    MessageHandler.prototype.handleSubscribeStats = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'stats' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Add subscription
        this.addSubscription(context.client.id, {
            type: 'stats',
            id: payload.colonyId,
            events: ['updated'],
            subscribedAt: Date.now(),
        }, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:stats', {
            colonyId: payload.colonyId,
            subscribed: true,
        });
    };
    MessageHandler.prototype.handleUnsubscribeStats = function (message, context) {
        var payload = message.payload;
        this.removeSubscription(context.client.id, 'stats', payload.colonyId, context.subscriptions);
        this.notifySubscriptionChange(context);
        return this.createSuccessResponse(message.id, 'event:stats', {
            colonyId: payload.colonyId,
            subscribed: false,
        });
    };
    // ==========================================================================
    // Command Handlers
    // ==========================================================================
    MessageHandler.prototype.handleCommandSpawn = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'agent' && p.actions.includes('write'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // This is a placeholder - actual agent spawning would be implemented
        // by the caller through a callback or event
        var result = {
            success: true,
            message: 'Agent spawn command received',
            data: { typeId: payload.typeId },
        };
        return this.createSuccessResponse(message.id, 'response:command', result);
    };
    MessageHandler.prototype.handleCommandDespawn = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'agent' && p.actions.includes('write'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Placeholder implementation
        var result = {
            success: true,
            message: 'Agent despawn command received',
            data: { agentId: payload.agentId },
        };
        return this.createSuccessResponse(message.id, 'response:command', result);
    };
    MessageHandler.prototype.handleCommandActivate = function (message, context) {
        var payload = message.payload;
        var agentId = payload.agentId;
        // Find colony containing this agent
        var colony;
        var targetColonyId;
        for (var _i = 0, _a = context.colonies; _i < _a.length; _i++) {
            var _b = _a[_i], colonyId = _b[0], c = _b[1];
            if (c.getAgent(agentId)) {
                colony = c;
                targetColonyId = colonyId;
                break;
            }
        }
        if (!colony) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Agent'));
        }
        // Activate agent
        var success = colony.activateAgent(agentId);
        var result = {
            success: success,
            message: success ? 'Agent activated' : 'Failed to activate agent',
            data: { agentId: agentId, colonyId: targetColonyId },
        };
        return this.createSuccessResponse(message.id, 'response:command', result);
    };
    MessageHandler.prototype.handleCommandDeactivate = function (message, context) {
        var payload = message.payload;
        var agentId = payload.agentId;
        // Find colony containing this agent
        var colony;
        var targetColonyId;
        for (var _i = 0, _a = context.colonies; _i < _a.length; _i++) {
            var _b = _a[_i], colonyId = _b[0], c = _b[1];
            if (c.getAgent(agentId)) {
                colony = c;
                targetColonyId = colonyId;
                break;
            }
        }
        if (!colony) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Agent'));
        }
        // Deactivate agent
        var success = colony.deactivateAgent(agentId);
        var result = {
            success: success,
            message: success ? 'Agent deactivated' : 'Failed to deactivate agent',
            data: { agentId: agentId, colonyId: targetColonyId },
        };
        return this.createSuccessResponse(message.id, 'response:command', result);
    };
    MessageHandler.prototype.handleCommandDream = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'dream' && p.actions.includes('write'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Placeholder - dream triggering would be implemented through callback
        var result = {
            success: true,
            message: 'Dream cycle triggered',
            data: {
                colonyId: payload.colonyId,
                agentId: payload.agentId,
                episodeCount: payload.episodeCount,
            },
        };
        return this.createSuccessResponse(message.id, 'response:command', result);
    };
    // ==========================================================================
    // Query Handlers
    // ==========================================================================
    MessageHandler.prototype.handleQueryStats = function (message, context) {
        var payload = message.payload;
        var colonyId = payload.colonyId;
        if (!colonyId) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.invalidPayload({ missing: 'colonyId' }));
        }
        var colony = context.colonies.get(colonyId);
        if (!colony) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Colony'));
        }
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'stats' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        var stats = colony.getStats();
        var responsePayload = {
            colonyId: colonyId,
            stats: stats,
            agents: payload.includeAgents ? colony.getAllAgents() : undefined,
        };
        return this.createSuccessResponse(message.id, 'response:stats', responsePayload);
    };
    MessageHandler.prototype.handleQueryAgents = function (message, context) {
        var payload = message.payload;
        var colonyId = payload.colonyId, filter = payload.filter;
        var colony = context.colonies.get(colonyId);
        if (!colony) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Colony'));
        }
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'agent' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        var agents = colony.getAllAgents();
        // Apply filters
        if (filter === null || filter === void 0 ? void 0 : filter.status) {
            agents = agents.filter(function (a) { return a.status === filter.status; });
        }
        if (filter === null || filter === void 0 ? void 0 : filter.typeId) {
            agents = agents.filter(function (a) { return a.typeId === filter.typeId; });
        }
        var total = colony.getAllAgents().length;
        var filtered = agents.length;
        // Apply pagination
        if (filter === null || filter === void 0 ? void 0 : filter.limit) {
            var offset = filter.offset || 0;
            agents = agents.slice(offset, offset + filter.limit);
        }
        var responsePayload = {
            colonyId: colonyId,
            agents: agents,
            total: total,
            filtered: filtered,
        };
        return this.createSuccessResponse(message.id, 'response:agents', responsePayload);
    };
    MessageHandler.prototype.handleQueryAgent = function (message, context) {
        var _a;
        var payload = message.payload;
        var agentId = payload.agentId;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'agent' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        // Find agent
        var agent;
        var colonyId;
        for (var _i = 0, _b = context.colonies; _i < _b.length; _i++) {
            var _c = _b[_i], cid = _c[0], colony = _c[1];
            agent = colony.getAgent(agentId);
            if (agent) {
                colonyId = cid;
                break;
            }
        }
        if (!agent) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.notFound('Agent'));
        }
        var responsePayload = {
            agent: agent,
            config: colonyId ? (_a = context.colonies.get(colonyId)) === null || _a === void 0 ? void 0 : _a.getAgentConfig(agentId) : undefined,
        };
        return this.createSuccessResponse(message.id, 'response:agent', responsePayload);
    };
    MessageHandler.prototype.handleQueryConfig = function (message, context) {
        var payload = message.payload;
        // Check permissions
        if (!context.client.permissions.some(function (p) { return p.resource === 'colony' && p.actions.includes('read'); })) {
            return this.createErrorResponse(message.id, middleware_js_1.APIErrorFactory.forbidden());
        }
        var config;
        if (payload.colonyId) {
            var colony = context.colonies.get(payload.colonyId);
            if (colony) {
                config = __assign({}, colony.config);
            }
        }
        var responsePayload = {
            config: config,
        };
        return this.createSuccessResponse(message.id, 'response:config', responsePayload);
    };
    // ==========================================================================
    // Ping/Pong Handlers
    // ==========================================================================
    MessageHandler.prototype.handlePing = function (message) {
        return {
            id: message.id,
            timestamp: Date.now(),
            type: 'pong',
            payload: { originalTimestamp: message.timestamp },
        };
    };
    // ==========================================================================
    // Helper Methods
    // ==========================================================================
    MessageHandler.prototype.createSuccessResponse = function (messageId, responseType, payload) {
        return {
            id: messageId,
            timestamp: Date.now(),
            type: responseType,
            payload: payload,
            success: true,
        };
    };
    MessageHandler.prototype.createErrorResponse = function (messageId, error) {
        return {
            id: messageId,
            timestamp: Date.now(),
            type: 'error',
            payload: null,
            success: false,
            error: error,
        };
    };
    MessageHandler.prototype.addSubscription = function (clientId, subscription, allSubscriptions) {
        var subscriptions = allSubscriptions.get(clientId) || [];
        subscriptions.push(subscription);
        allSubscriptions.set(clientId, subscriptions);
    };
    MessageHandler.prototype.removeSubscription = function (clientId, type, id, allSubscriptions) {
        var subscriptions = allSubscriptions.get(clientId) || [];
        var filtered = subscriptions.filter(function (s) { return !(s.type === type && s.id === id); });
        allSubscriptions.set(clientId, filtered);
    };
    MessageHandler.prototype.notifySubscriptionChange = function (context) {
        if (context.onSubscriptionChange) {
            var subscriptions = context.subscriptions.get(context.client.id) || [];
            context.onSubscriptionChange(context.client.id, subscriptions);
        }
    };
    return MessageHandler;
}());
exports.MessageHandler = MessageHandler;
