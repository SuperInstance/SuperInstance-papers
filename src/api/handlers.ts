/**
 * Message Handlers for POLLN WebSocket API
 * Process incoming messages and generate responses
 */

import type { Colony } from '../core/colony.js';
import type { AgentState } from '../core/types.js';
import type { DreamBasedPolicyOptimizer } from '../core/dreaming.js';

// Import types from this module
import type {
  ClientMessage,
  ServerMessage,
  SubscribeColonyPayload,
  SubscribeAgentPayload,
  CommandSpawnPayload,
  CommandDespawnPayload,
  CommandActivatePayload,
  CommandDeactivatePayload,
  CommandDreamPayload,
  QueryStatsPayload,
  QueryAgentsPayload,
  QueryAgentPayload,
  QueryConfigPayload,
  ResponseStatsPayload,
  ResponseAgentsPayload,
  ResponseAgentPayload,
  ResponseConfigPayload,
  ResponseCommandPayload,
  CommandResult,
  AuthenticatedClient,
  Subscription,
  APIError,
} from './types.js';
import { APIErrorFactory } from './middleware.js';

// ============================================================================
// Handler Context
// ============================================================================

export interface HandlerContext {
  client: AuthenticatedClient;
  colonies: Map<string, Colony>;
  dreamOptimizer?: DreamBasedPolicyOptimizer;
  subscriptions: Map<string, Subscription[]>;
  onSubscriptionChange?: (clientId: string, subscriptions: Subscription[]) => void;
}

// ============================================================================
// Message Handler
// ============================================================================

export class MessageHandler {
  /**
   * Handle incoming client message
   */
  async handleMessage(message: ClientMessage, context: HandlerContext): Promise<ServerMessage | null> {
    try {
      switch (message.type) {
        // Subscriptions
        case 'subscribe:colony':
          return this.handleSubscribeColony(message, context);
        case 'unsubscribe:colony':
          return this.handleUnsubscribeColony(message, context);
        case 'subscribe:agent':
          return this.handleSubscribeAgent(message, context);
        case 'unsubscribe:agent':
          return this.handleUnsubscribeAgent(message, context);
        case 'subscribe:dreams':
          return this.handleSubscribeDreams(message, context);
        case 'unsubscribe:dreams':
          return this.handleUnsubscribeDreams(message, context);
        case 'subscribe:stats':
          return this.handleSubscribeStats(message, context);
        case 'unsubscribe:stats':
          return this.handleUnsubscribeStats(message, context);

        // Commands
        case 'command:spawn':
          return this.handleCommandSpawn(message, context);
        case 'command:despawn':
          return this.handleCommandDespawn(message, context);
        case 'command:activate':
          return this.handleCommandActivate(message, context);
        case 'command:deactivate':
          return this.handleCommandDeactivate(message, context);
        case 'command:dream':
          return this.handleCommandDream(message, context);

        // Queries
        case 'query:stats':
          return this.handleQueryStats(message, context);
        case 'query:agents':
          return this.handleQueryAgents(message, context);
        case 'query:agent':
          return this.handleQueryAgent(message, context);
        case 'query:config':
          return this.handleQueryConfig(message, context);

        // Ping/Pong
        case 'ping':
          return this.handlePing(message);

        default:
          return this.createErrorResponse(
            message.id,
            APIErrorFactory.invalidPayload({ unknownMessageType: message.type })
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        message.id,
        APIErrorFactory.internalError(error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ==========================================================================
  // Subscription Handlers
  // ==========================================================================

  private handleSubscribeColony(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as SubscribeColonyPayload;
    const { colonyId, events } = payload;

    // Check if colony exists
    const colony = context.colonies.get(colonyId);
    if (!colony) {
      return this.createErrorResponse(
        message.id,
        APIErrorFactory.notFound('Colony')
      );
    }

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'colony' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // Add subscription
    this.addSubscription(context.client.id, {
      type: 'colony',
      id: colonyId,
      events,
      subscribedAt: Date.now(),
    }, context.subscriptions);

    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:colony', {
      colonyId,
      subscribed: true,
      events,
    });
  }

  private handleUnsubscribeColony(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as SubscribeColonyPayload;

    this.removeSubscription(context.client.id, 'colony', payload.colonyId, context.subscriptions);
    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:colony', {
      colonyId: payload.colonyId,
      subscribed: false,
    });
  }

  private handleSubscribeAgent(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as SubscribeAgentPayload;
    const { agentId, events } = payload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'agent' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // Add subscription
    this.addSubscription(context.client.id, {
      type: 'agent',
      id: agentId,
      events,
      subscribedAt: Date.now(),
    }, context.subscriptions);

    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:agent', {
      agentId,
      subscribed: true,
      events,
    });
  }

  private handleUnsubscribeAgent(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as SubscribeAgentPayload;

    this.removeSubscription(context.client.id, 'agent', payload.agentId, context.subscriptions);
    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:agent', {
      agentId: payload.agentId,
      subscribed: false,
    });
  }

  private handleSubscribeDreams(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as { colonyId: string };

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'dream' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
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
  }

  private handleUnsubscribeDreams(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as { colonyId: string };

    this.removeSubscription(context.client.id, 'dreams', payload.colonyId, context.subscriptions);
    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:dream', {
      colonyId: payload.colonyId,
      subscribed: false,
    });
  }

  private handleSubscribeStats(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as { colonyId: string };

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'stats' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
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
  }

  private handleUnsubscribeStats(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as { colonyId: string };

    this.removeSubscription(context.client.id, 'stats', payload.colonyId, context.subscriptions);
    this.notifySubscriptionChange(context);

    return this.createSuccessResponse(message.id, 'event:stats', {
      colonyId: payload.colonyId,
      subscribed: false,
    });
  }

  // ==========================================================================
  // Command Handlers
  // ==========================================================================

  private handleCommandSpawn(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as CommandSpawnPayload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'agent' && p.actions.includes('write'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // This is a placeholder - actual agent spawning would be implemented
    // by the caller through a callback or event
    const result: CommandResult = {
      success: true,
      message: 'Agent spawn command received',
      data: { typeId: payload.typeId },
    };

    return this.createSuccessResponse(message.id, 'response:command', result);
  }

  private handleCommandDespawn(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as CommandDespawnPayload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'agent' && p.actions.includes('write'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // Placeholder implementation
    const result: CommandResult = {
      success: true,
      message: 'Agent despawn command received',
      data: { agentId: payload.agentId },
    };

    return this.createSuccessResponse(message.id, 'response:command', result);
  }

  private handleCommandActivate(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as CommandActivatePayload;
    const { agentId } = payload;

    // Find colony containing this agent
    let colony: Colony | undefined;
    let targetColonyId: string | undefined;

    for (const [colonyId, c] of context.colonies) {
      if (c.getAgent(agentId)) {
        colony = c;
        targetColonyId = colonyId;
        break;
      }
    }

    if (!colony) {
      return this.createErrorResponse(message.id, APIErrorFactory.notFound('Agent'));
    }

    // Activate agent
    const success = colony.activateAgent(agentId);

    const result: CommandResult = {
      success,
      message: success ? 'Agent activated' : 'Failed to activate agent',
      data: { agentId, colonyId: targetColonyId },
    };

    return this.createSuccessResponse(message.id, 'response:command', result);
  }

  private handleCommandDeactivate(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as CommandDeactivatePayload;
    const { agentId } = payload;

    // Find colony containing this agent
    let colony: Colony | undefined;
    let targetColonyId: string | undefined;

    for (const [colonyId, c] of context.colonies) {
      if (c.getAgent(agentId)) {
        colony = c;
        targetColonyId = colonyId;
        break;
      }
    }

    if (!colony) {
      return this.createErrorResponse(message.id, APIErrorFactory.notFound('Agent'));
    }

    // Deactivate agent
    const success = colony.deactivateAgent(agentId);

    const result: CommandResult = {
      success,
      message: success ? 'Agent deactivated' : 'Failed to deactivate agent',
      data: { agentId, colonyId: targetColonyId },
    };

    return this.createSuccessResponse(message.id, 'response:command', result);
  }

  private handleCommandDream(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as CommandDreamPayload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'dream' && p.actions.includes('write'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // Placeholder - dream triggering would be implemented through callback
    const result: CommandResult = {
      success: true,
      message: 'Dream cycle triggered',
      data: {
        colonyId: payload.colonyId,
        agentId: payload.agentId,
        episodeCount: payload.episodeCount,
      },
    };

    return this.createSuccessResponse(message.id, 'response:command', result);
  }

  // ==========================================================================
  // Query Handlers
  // ==========================================================================

  private async handleQueryStats(message: ClientMessage, context: HandlerContext): Promise<ServerMessage> {
    const payload = message.payload as QueryStatsPayload;
    const { colonyId } = payload;

    if (!colonyId) {
      return this.createErrorResponse(message.id, APIErrorFactory.invalidPayload({ missing: 'colonyId' }));
    }

    // Guard against null/undefined context.colonies
    if (!context?.colonies) {
      return this.createErrorResponse(message.id, APIErrorFactory.internalError('Context colonies map is not available'));
    }

    const colony = context.colonies.get(colonyId);
    if (!colony) {
      return this.createErrorResponse(message.id, APIErrorFactory.notFound('Colony'));
    }

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'stats' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    const stats = await colony.getStats();

    const responsePayload: ResponseStatsPayload = {
      colonyId,
      stats,
      agents: payload.includeAgents ? colony.getAllAgents() : undefined,
    };

    return this.createSuccessResponse(message.id, 'response:stats', responsePayload);
  }

  private handleQueryAgents(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as QueryAgentsPayload;
    const { colonyId, filter } = payload;

    const colony = context.colonies.get(colonyId);
    if (!colony) {
      return this.createErrorResponse(message.id, APIErrorFactory.notFound('Colony'));
    }

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'agent' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    let agents = colony.getAllAgents();

    // Apply filters
    if (filter?.status) {
      agents = agents.filter((a: AgentState) => a.status === filter.status);
    }
    if (filter?.typeId) {
      agents = agents.filter((a: AgentState) => a.typeId === filter.typeId);
    }

    const total = colony.getAllAgents().length;
    const filtered = agents.length;

    // Apply pagination
    if (filter?.limit) {
      const offset = filter.offset || 0;
      agents = agents.slice(offset, offset + filter.limit);
    }

    const responsePayload: ResponseAgentsPayload = {
      colonyId,
      agents,
      total,
      filtered,
    };

    return this.createSuccessResponse(message.id, 'response:agents', responsePayload);
  }

  private handleQueryAgent(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as QueryAgentPayload;
    const { agentId } = payload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'agent' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    // Find agent
    let agent: ReturnType<Colony['getAgent']> | undefined;
    let colonyId: string | undefined;

    for (const [cid, colony] of context.colonies) {
      agent = colony.getAgent(agentId);
      if (agent) {
        colonyId = cid;
        break;
      }
    }

    if (!agent) {
      return this.createErrorResponse(message.id, APIErrorFactory.notFound('Agent'));
    }

    const responsePayload: ResponseAgentPayload = {
      agent,
      config: colonyId ? (context.colonies.get(colonyId)?.getAgentConfig(agentId) as Record<string, unknown> | undefined) : undefined,
    };

    return this.createSuccessResponse(message.id, 'response:agent', responsePayload);
  }

  private handleQueryConfig(message: ClientMessage, context: HandlerContext): ServerMessage {
    const payload = message.payload as QueryConfigPayload;

    // Check permissions
    if (!context.client.permissions.some((p) => p.resource === 'colony' && p.actions.includes('read'))) {
      return this.createErrorResponse(message.id, APIErrorFactory.forbidden());
    }

    let config: Record<string, unknown> | undefined;

    if (payload.colonyId) {
      const colony = context.colonies.get(payload.colonyId);
      if (colony) {
        config = { ...colony.config };
      }
    }

    const responsePayload: ResponseConfigPayload = {
      config,
    };

    return this.createSuccessResponse(message.id, 'response:config', responsePayload);
  }

  // ==========================================================================
  // Ping/Pong Handlers
  // ==========================================================================

  private handlePing(message: ClientMessage): ServerMessage {
    return {
      id: message.id,
      timestamp: Date.now(),
      type: 'pong',
      payload: { originalTimestamp: message.timestamp },
      success: true,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private createSuccessResponse(
    messageId: string,
    responseType: string,
    payload: unknown
  ): ServerMessage {
    return {
      id: messageId,
      timestamp: Date.now(),
      type: responseType as any,
      payload,
      success: true,
    };
  }

  private createErrorResponse(messageId: string, error: APIError): ServerMessage {
    return {
      id: messageId,
      timestamp: Date.now(),
      type: 'error',
      payload: null,
      success: false,
      error,
    };
  }

  private addSubscription(
    clientId: string,
    subscription: Subscription,
    allSubscriptions: Map<string, Subscription[]>
  ): void {
    const subscriptions = allSubscriptions.get(clientId) || [];
    subscriptions.push(subscription);
    allSubscriptions.set(clientId, subscriptions);
  }

  private removeSubscription(
    clientId: string,
    type: Subscription['type'],
    id: string,
    allSubscriptions: Map<string, Subscription[]>
  ): void {
    const subscriptions = allSubscriptions.get(clientId) || [];
    const filtered = subscriptions.filter((s) => !(s.type === type && s.id === id));
    allSubscriptions.set(clientId, filtered);
  }

  private notifySubscriptionChange(context: HandlerContext): void {
    if (context.onSubscriptionChange) {
      const subscriptions = context.subscriptions.get(context.client.id) || [];
      context.onSubscriptionChange(context.client.id, subscriptions);
    }
  }
}
