/**
 * POLLN Network Module Index
 * Pattern-Organized Large Language Network
 *
 * Exports all network protocol components for federated learning.
 */

export { P2PCoordinator, createDefaultP2PConfig } from './p2p-coordinator.js';
export { GossipProtocol, createDefaultGossipConfig, createFastGossipConfig, createEfficientGossipConfig } from './gossip-protocol.js';

export type { P2PCoordinatorConfig, PeerInfo, P2PMessage } from './p2p-coordinator.js';
export type { GossipConfig, GossipMessage, GossipStats } from './gossip-protocol.js';
