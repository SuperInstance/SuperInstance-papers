/**
 * POLLN Federation Strategies Index
 * Pattern-Organized Large Language Network
 *
 * Exports all federated learning aggregation strategies.
 */

export { FederatedAveraging, createDefaultFedAvgConfig, createFastFedAvgConfig, createStableFedAvgConfig } from './fed-avg.js';
export { FederatedProximal, createDefaultFedProxConfig, createHeterogeneousFedProxConfig, createHomogeneousFedProxConfig } from './fed-prox.js';
export { AsynchronousFederated, createDefaultAsyncFedConfig, createFastAsyncFedConfig, createStableAsyncFedConfig } from './fed-async.js';
export { AdaptiveFederated, createDefaultAdaptiveFedConfig, createQualityFocusedAdaptiveFedConfig, createDiversityFocusedAdaptiveFedConfig } from './fed-adaptive.js';
