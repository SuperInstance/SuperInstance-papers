/**
 * Basic Colony Configuration
 */

import type { ColonyConfig } from '../../src/core/types.js';

export const colonyConfig: ColonyConfig = {
  id: 'basic-colony-1',
  gardenerId: 'demo-user',
  name: 'Basic Demo Colony',
  maxAgents: 10,
  resourceBudget: {
    totalCompute: 100,
    totalMemory: 1000,
    totalNetwork: 100,
  },
};

export const plinkoConfig = {
  temperature: 1.0,        // Starting temperature (exploration)
  minTemperature: 0.1,     // Minimum temperature
  decayRate: 0.001,        // Temperature decay per decision
};

export const agentConfigs = [
  {
    id: 'greeter-agent',
    typeId: 'GreeterAgent',
    categoryId: 'task',
    modelFamily: 'demo-model',
    defaultParams: {},
    inputTopics: ['message'],
    outputTopic: 'response',
    minExamples: 10,
    requiresWorldModel: false,
  },
  {
    id: 'task-agent',
    typeId: 'TaskAgent',
    categoryId: 'task',
    modelFamily: 'demo-model',
    defaultParams: {},
    inputTopics: ['message'],
    outputTopic: 'response',
    minExamples: 10,
    requiresWorldModel: false,
  },
  {
    id: 'farewell-agent',
    typeId: 'FarewellAgent',
    categoryId: 'task',
    modelFamily: 'demo-model',
    defaultParams: {},
    inputTopics: ['message'],
    outputTopic: 'response',
    minExamples: 10,
    requiresWorldModel: false,
  },
];
