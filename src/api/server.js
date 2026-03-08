"use strict";
/**
 * POLLN WebSocket API Server
 * Real-time monitoring and control for POLLN colonies
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
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
exports.ValidationMiddleware = exports.RateLimitMiddleware = exports.AuthenticationMiddleware = exports.POLLNServer = void 0;
exports.createPOLLNServer = createPOLLNServer;
var events_1 = require("events");
var http_1 = require("http");
var ws_1 = require("ws");
var middleware_js_1 = require("./middleware.js");
var handlers_js_1 = require("./handlers.js");
// ============================================================================
// WebSocket Server
// ============================================================================
var POLLNServer = /** @class */ (function (_super) {
    __extends(POLLNServer, _super);
    function POLLNServer(config) {
        var _a;
        var _this = _super.call(this) || this;
        _this.httpServer = null;
        _this.wsServer = null;
        // State
        _this.colonies = new Map();
        _this.connections = new Map();
        _this.subscriptions = new Map();
        _this.startedAt = 0;
        // Statistics
        _this.stats = {
            uptime: 0,
            connections: {
                total: 0,
                active: 0,
                authenticated: 0,
            },
            messages: {
                received: 0,
                sent: 0,
                errors: 0,
            },
            rateLimits: {
                rejected: 0,
            },
        };
        // Heartbeat
        _this.heartbeatInterval = null;
        _this.config = config;
        // Initialize middleware
        _this.auth = new middleware_js_1.AuthenticationMiddleware();
        _this.rateLimit = new middleware_js_1.RateLimitMiddleware(config.rateLimit);
        _this.validation = new middleware_js_1.ValidationMiddleware();
        _this.handler = new handlers_js_1.MessageHandler();
        // Setup default token if auth is enabled
        if (((_a = config.auth) === null || _a === void 0 ? void 0 : _a.enableAuth) && config.auth.defaultToken) {
            _this.auth.generateToken('default', [
                { resource: 'colony', actions: ['read', 'write'] },
                { resource: 'agent', actions: ['read', 'write'] },
                { resource: 'dream', actions: ['read', 'write'] },
                { resource: 'stats', actions: ['read'] },
            ], config.auth.tokenExpiresIn);
        }
        return _this;
    }
    // ==========================================================================
    // Server Lifecycle
    // ==========================================================================
    /**
     * Start the WebSocket server
     */
    POLLNServer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.wsServer) {
                    throw new Error('Server already started');
                }
                this.startedAt = Date.now();
                // Create HTTP server
                this.httpServer = (0, http_1.createServer)();
                // Create WebSocket server
                this.wsServer = new ws_1.WebSocketServer({
                    server: this.httpServer,
                    path: '/api/ws',
                });
                // Setup connection handling
                this.wsServer.on('connection', this.handleConnection.bind(this));
                // Start heartbeat
                this.startHeartbeat();
                // Start server
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.httpServer.listen(_this.config.port, _this.config.host, function () {
                            _this.emit('started', {
                                port: _this.config.port,
                                host: _this.config.host || '0.0.0.0',
                            });
                            resolve();
                        });
                        _this.httpServer.on('error', reject);
                    })];
            });
        });
    };
    /**
     * Stop the WebSocket server
     */
    POLLNServer.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.wsServer) {
                    return [2 /*return*/];
                }
                // Stop heartbeat
                this.stopHeartbeat();
                // Close all connections
                this.wsServer.clients.forEach(function (ws) {
                    ws.close(1000, 'Server shutting down');
                });
                // Close server
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.wsServer.close(function () {
                            _this.httpServer.close(function () {
                                _this.wsServer = null;
                                _this.httpServer = null;
                                _this.emit('stopped');
                                resolve();
                            });
                        });
                    })];
            });
        });
    };
    // ==========================================================================
    // Connection Handling
    // ==========================================================================
    POLLNServer.prototype.handleConnection = function (ws, req) {
        var _this = this;
        var _a;
        var clientId = this.generateClientId();
        var ip = req.socket.remoteAddress;
        // Track connection
        this.stats.connections.total++;
        this.stats.connections.active++;
        var connectionInfo = {
            id: clientId,
            clientId: clientId,
            connectedAt: Date.now(),
            subscriptions: [],
            isAuthenticated: false,
            ip: ip,
        };
        this.connections.set(clientId, connectionInfo);
        this.emit('connection:opened', { clientId: clientId, ip: ip });
        // Setup WebSocket handlers
        ws.on('message', function (data) { return _this.handleMessage(clientId, ws, data); });
        ws.on('close', function () { return _this.handleDisconnection(clientId, ws); });
        ws.on('error', function (error) { return _this.handleError(clientId, error); });
        ws.on('pong', function () { return _this.handlePong(clientId, ws); });
        // Send welcome message (optional, based on auth)
        if (!((_a = this.config.auth) === null || _a === void 0 ? void 0 : _a.enableAuth)) {
            this.sendMessage(ws, {
                id: this.generateMessageId(),
                timestamp: Date.now(),
                type: 'event:colony',
                payload: {
                    message: 'Connected to POLLN WebSocket API',
                    serverTime: Date.now(),
                },
            });
        }
    };
    POLLNServer.prototype.handleDisconnection = function (clientId, ws) {
        var connection = this.connections.get(clientId);
        if (!connection) {
            return;
        }
        // Deauthenticate if needed
        if (connection.isAuthenticated) {
            this.auth.deauthenticate(clientId);
            this.stats.connections.authenticated--;
        }
        // Clean up
        this.connections.delete(clientId);
        this.subscriptions.delete(clientId);
        this.stats.connections.active--;
        this.emit('connection:closed', { clientId: clientId });
    };
    POLLNServer.prototype.handleError = function (clientId, error) {
        this.stats.messages.errors++;
        this.emit('connection:error', { clientId: clientId, error: error });
    };
    POLLNServer.prototype.handlePong = function (clientId, ws) {
        var connection = this.connections.get(clientId);
        if (connection) {
            connection.isAlive = true;
        }
    };
    // ==========================================================================
    // Message Handling
    // ==========================================================================
    POLLNServer.prototype.handleMessage = function (clientId, ws, data) {
        return __awaiter(this, void 0, void 0, function () {
            var message, client, connection, token, context, response;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.stats.messages.received++;
                        // Update rate limit tracking
                        if (!this.rateLimit.checkLimit(clientId)) {
                            this.stats.rateLimits.rejected++;
                            this.sendError(ws, middleware_js_1.APIErrorFactory.rateLimited());
                            return [2 /*return*/];
                        }
                        try {
                            message = JSON.parse(data.toString());
                        }
                        catch (error) {
                            this.stats.messages.errors++;
                            this.sendError(ws, middleware_js_1.APIErrorFactory.invalidPayload());
                            return [2 /*return*/];
                        }
                        // Validate message
                        if (!this.validation.validateMessage(message)) {
                            this.stats.messages.errors++;
                            this.sendError(ws, middleware_js_1.APIErrorFactory.invalidPayload());
                            return [2 /*return*/];
                        }
                        client = null;
                        connection = this.connections.get(clientId);
                        if ((_a = this.config.auth) === null || _a === void 0 ? void 0 : _a.enableAuth) {
                            if (!(connection === null || connection === void 0 ? void 0 : connection.isAuthenticated)) {
                                token = (_b = message.payload) === null || _b === void 0 ? void 0 : _b.token;
                                if (!token) {
                                    this.sendError(ws, middleware_js_1.APIErrorFactory.unauthorized());
                                    return [2 /*return*/];
                                }
                                client = this.auth.authenticate(clientId, token);
                                if (!client) {
                                    this.sendError(ws, middleware_js_1.APIErrorFactory.unauthorized());
                                    return [2 /*return*/];
                                }
                                connection.isAuthenticated = true;
                                this.stats.connections.authenticated++;
                            }
                            else {
                                client = this.auth.getClient(clientId);
                            }
                            this.auth.updateActivity(clientId);
                        }
                        context = {
                            client: client || {
                                id: clientId,
                                gardenerId: 'anonymous',
                                permissions: [
                                    { resource: 'colony', actions: ['read', 'write'] },
                                    { resource: 'agent', actions: ['read', 'write'] },
                                    { resource: 'dream', actions: ['read', 'write'] },
                                    { resource: 'stats', actions: ['read'] },
                                ],
                                token: '',
                                connectedAt: Date.now(),
                                lastActivity: Date.now(),
                            },
                            colonies: this.colonies,
                            dreamOptimizer: this.dreamOptimizer,
                            subscriptions: this.subscriptions,
                            onSubscriptionChange: function (id, subs) {
                                _this.subscriptions.set(id, subs);
                                var conn = _this.connections.get(id);
                                if (conn) {
                                    conn.subscriptions = subs;
                                }
                            },
                        };
                        return [4 /*yield*/, this.handler.handleMessage(message, context)];
                    case 1:
                        response = _c.sent();
                        if (response) {
                            this.sendMessage(ws, response);
                            this.stats.messages.sent++;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // ==========================================================================
    // Broadcasting
    // ==========================================================================
    /**
     * Broadcast colony event to subscribed clients
     */
    POLLNServer.prototype.broadcastColonyEvent = function (colonyId, eventType, data) {
        var payload = {
            colonyId: colonyId,
            eventType: eventType,
            data: data,
        };
        this.broadcastToSubscribers('colony', colonyId, {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'event:colony',
            payload: payload,
        });
    };
    /**
     * Broadcast agent event to subscribed clients
     */
    POLLNServer.prototype.broadcastAgentEvent = function (agentId, colonyId, eventType, data) {
        var payload = {
            agentId: agentId,
            colonyId: colonyId,
            eventType: eventType,
            data: data,
        };
        this.broadcastToSubscribers('agent', agentId, {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'event:agent',
            payload: payload,
        });
    };
    /**
     * Broadcast dream event to subscribed clients
     */
    POLLNServer.prototype.broadcastDreamEvent = function (colonyId, dreamData) {
        var payload = {
            colonyId: colonyId,
            dreamId: dreamData.dreamId || this.generateMessageId(),
            episode: dreamData.episode || {},
            metrics: dreamData.metrics || { loss: 0, reconstructionError: 0, klDivergence: 0 },
        };
        this.broadcastToSubscribers('dreams', colonyId, {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'event:dream',
            payload: payload,
        });
    };
    /**
     * Broadcast stats update to subscribed clients
     */
    POLLNServer.prototype.broadcastStatsUpdate = function (colonyId) {
        var colony = this.colonies.get(colonyId);
        if (!colony) {
            return;
        }
        var payload = {
            colonyId: colonyId,
            stats: colony.getStats(),
            timestamp: Date.now(),
        };
        this.broadcastToSubscribers('stats', colonyId, {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'event:stats',
            payload: payload,
        });
    };
    /**
     * Broadcast message to subscribers of a specific resource
     */
    POLLNServer.prototype.broadcastToSubscribers = function (type, id, message) {
        for (var _i = 0, _a = this.subscriptions; _i < _a.length; _i++) {
            var _b = _a[_i], clientId = _b[0], subscriptions = _b[1];
            var isSubscribed = subscriptions.some(function (s) { return s.type === type && s.id === id; });
            if (isSubscribed) {
                var connection = this.connections.get(clientId);
                if (connection) {
                    var ws = this.findWebSocket(clientId);
                    if (ws && ws.readyState === ws_1.WebSocket.OPEN) {
                        this.sendMessage(ws, message);
                        this.stats.messages.sent++;
                    }
                }
            }
        }
    };
    // ==========================================================================
    // Colony Management
    // ==========================================================================
    /**
     * Register a colony with the server
     */
    POLLNServer.prototype.registerColony = function (colony) {
        var _this = this;
        this.colonies.set(colony.id, colony);
        // Forward colony events to WebSocket clients
        colony.on('agent_registered', function (data) {
            _this.broadcastColonyEvent(colony.id, 'agent_registered', data);
        });
        colony.on('agent_unregistered', function (data) {
            _this.broadcastColonyEvent(colony.id, 'agent_unregistered', data);
        });
        colony.on('agent_updated', function (data) {
            _this.broadcastColonyEvent(colony.id, 'agent_updated', data);
        });
        this.emit('colony:registered', { colonyId: colony.id });
    };
    /**
     * Unregister a colony from the server
     */
    POLLNServer.prototype.unregisterColony = function (colonyId) {
        var colony = this.colonies.get(colonyId);
        if (colony) {
            // Remove all event listeners
            colony.removeAllListeners();
            this.colonies.delete(colonyId);
            this.emit('colony:unregistered', { colonyId: colonyId });
        }
    };
    /**
     * Set the dream optimizer
     */
    POLLNServer.prototype.setDreamOptimizer = function (optimizer) {
        this.dreamOptimizer = optimizer;
    };
    // ==========================================================================
    // Utility Methods
    // ==========================================================================
    POLLNServer.prototype.sendMessage = function (ws, message) {
        try {
            ws.send(JSON.stringify(message));
        }
        catch (error) {
            this.stats.messages.errors++;
        }
    };
    POLLNServer.prototype.sendError = function (ws, error) {
        this.sendMessage(ws, {
            id: this.generateMessageId(),
            timestamp: Date.now(),
            type: 'error',
            payload: null,
            success: false,
            error: error,
        });
    };
    POLLNServer.prototype.findWebSocket = function (clientId) {
        if (!this.wsServer) {
            return null;
        }
        for (var _i = 0, _a = this.wsServer.clients; _i < _a.length; _i++) {
            var ws = _a[_i];
            // @ts-ignore - WebSocket has _socket property
            if (ws._pollnClientId === clientId) {
                return ws;
            }
        }
        return null;
    };
    POLLNServer.prototype.generateClientId = function () {
        return "client_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    POLLNServer.prototype.generateMessageId = function () {
        return "msg_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    // ==========================================================================
    // Heartbeat
    // ==========================================================================
    POLLNServer.prototype.startHeartbeat = function () {
        var _this = this;
        var _a;
        var interval = ((_a = this.config.heartbeat) === null || _a === void 0 ? void 0 : _a.interval) || 30000;
        this.heartbeatInterval = setInterval(function () {
            if (!_this.wsServer) {
                return;
            }
            _this.wsServer.clients.forEach(function (ws) {
                // @ts-ignore
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                // @ts-ignore
                ws.isAlive = false;
                ws.ping();
            });
        }, interval);
    };
    POLLNServer.prototype.stopHeartbeat = function () {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    };
    // ==========================================================================
    // Statistics
    // ==========================================================================
    /**
     * Get server statistics
     */
    POLLNServer.prototype.getStats = function () {
        return __assign(__assign({}, this.stats), { uptime: Date.now() - this.startedAt });
    };
    /**
     * Get connection count
     */
    POLLNServer.prototype.getConnectionCount = function () {
        return this.connections.size;
    };
    /**
     * Get active connections
     */
    POLLNServer.prototype.getActiveConnections = function () {
        return Array.from(this.connections.values());
    };
    return POLLNServer;
}(events_1.EventEmitter));
exports.POLLNServer = POLLNServer;
// ============================================================================
// Express Integration Helper
// ============================================================================
function createPOLLNServer(config) {
    return new POLLNServer(config);
}
var middleware_js_2 = require("./middleware.js");
Object.defineProperty(exports, "AuthenticationMiddleware", { enumerable: true, get: function () { return middleware_js_2.AuthenticationMiddleware; } });
Object.defineProperty(exports, "RateLimitMiddleware", { enumerable: true, get: function () { return middleware_js_2.RateLimitMiddleware; } });
Object.defineProperty(exports, "ValidationMiddleware", { enumerable: true, get: function () { return middleware_js_2.ValidationMiddleware; } });
__exportStar(require("./types.js"), exports);
__exportStar(require("./handlers.js"), exports);
