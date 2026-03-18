/**
 * CLAW_RELATE Formula Function
 *
 * Creates a relationship between two Claw agents
 *
 * @syntax =CLAW_RELATE(from_claw_id, to_claw_id, relationship_type, [strategy])
 * @param from_claw_id - ID of the source claw
 * @param to_claw_id - ID of the target claw
 * @param relationship_type - Type of relationship (slave, coworker, peer, delegate, observer)
 * @param strategy - Optional coordination strategy (PARALLEL, SEQUENTIAL, CONSENSUS, MAJORITY_VOTE, WEIGHTED)
 * @returns Success status (TRUE) or error message
 *
 * @example
 * =CLAW_RELATE("claw_master", "claw_worker1", "slave", "PARALLEL")
 * =CLAW_RELATE(A1, A2, "coworker", "SEQUENTIAL")
 * =CLAW_RELATE("claw_orchestrator", "claw_analyzer", "delegate")
 */

import { FunctionType, type Nullable, type InterpreterValue, RelationshipType, CoordinationStrategy } from '../types';
import type { ClawFunctionType } from '../types';

/**
 * Valid relationship types
 */
const VALID_RELATIONSHIPS: string[] = [
  RelationshipType.SLAVE,
  RelationshipType.COWORKER,
  RelationshipType.PEER,
  RelationshipType.DELEGATE,
  RelationshipType.OBSERVER
];

/**
 * Valid coordination strategies
 */
const VALID_STRATEGIES: string[] = [
  CoordinationStrategy.PARALLEL,
  CoordinationStrategy.SEQUENTIAL,
  CoordinationStrategy.CONSENSUS,
  CoordinationStrategy.MAJORITY_VOTE,
  CoordinationStrategy.WEIGHTED
];

/**
 * Validate relationship type
 */
function isValidRelationship(type: string): boolean {
  return VALID_RELATIONSHIPS.includes(type.toLowerCase() as RelationshipType);
}

/**
 * Validate coordination strategy
 */
function isValidStrategy(strategy: string): boolean {
  return VALID_STRATEGIES.includes(strategy.toUpperCase() as CoordinationStrategy);
}

/**
 * Default strategy by relationship type
 */
function getDefaultStrategy(relationshipType: RelationshipType): CoordinationStrategy {
  switch (relationshipType) {
    case RelationshipType.SLAVE:
      return CoordinationStrategy.PARALLEL;
    case RelationshipType.COWORKER:
      return CoordinationStrategy.SEQUENTIAL;
    case RelationshipType.PEER:
      return CoordinationStrategy.CONSENSUS;
    case RelationshipType.DELEGATE:
      return CoordinationStrategy.SEQUENTIAL;
    case RelationshipType.OBSERVER:
      return CoordinationStrategy.PARALLEL;
    default:
      return CoordinationStrategy.PARALLEL;
  }
}

/**
 * CLAW_RELATE formula function implementation
 */
export const CLAW_RELATE: ClawFunctionType = {
  id: 10004,
  type: FunctionType.Function,
  name: 'CLAW_RELATE',
  description: 'Create a relationship between two Claw agents',
  minParams: 3,
  maxParams: 4,

  parameters: [
    {
      name: 'from_claw_id',
      description: 'ID of the source claw',
      type: 'string',
      required: true
    },
    {
      name: 'to_claw_id',
      description: 'ID of the target claw',
      type: 'string',
      required: true
    },
    {
      name: 'relationship_type',
      description: 'Type of relationship (slave, coworker, peer, delegate, observer)',
      type: 'string',
      required: true
    },
    {
      name: 'strategy',
      description: 'Optional coordination strategy (PARALLEL, SEQUENTIAL, CONSENSUS, MAJORITY_VOTE, WEIGHTED)',
      type: 'string',
      required: false
    }
  ],

  returns: {
    type: 'boolean',
    description: 'Success status (TRUE) or error message'
  },

  execute: async function (
    this: unknown,
    fromClawId: string,
    toClawId: string,
    relationshipType: string,
    strategy?: string
  ): Promise<Nullable<InterpreterValue>> {
    try {
      // Validate inputs
      if (!fromClawId || typeof fromClawId !== 'string' || fromClawId.trim() === '') {
        throw new Error('CLAW_RELATE: From claw ID is required and must be a non-empty string');
      }

      if (!toClawId || typeof toClawId !== 'string' || toClawId.trim() === '') {
        throw new Error('CLAW_RELATE: To claw ID is required and must be a non-empty string');
      }

      if (!relationshipType || typeof relationshipType !== 'string' || relationshipType.trim() === '') {
        throw new Error('CLAW_RELATE: Relationship type is required and must be a non-empty string');
      }

      // Validate relationship type
      const relType = relationshipType.toLowerCase() as RelationshipType;
      if (!isValidRelationship(relType)) {
        throw new Error(
          `CLAW_RELATE: Invalid relationship type "${relationshipType}". ` +
          `Must be one of: ${VALID_RELATIONSHIPS.join(', ')}`
        );
      }

      // Validate or default strategy
      let coordStrategy: CoordinationStrategy;
      if (strategy && strategy.trim() !== '') {
        if (!isValidStrategy(strategy)) {
          throw new Error(
            `CLAW_RELATE: Invalid strategy "${strategy}". ` +
            `Must be one of: ${VALID_STRATEGIES.join(', ')}`
          );
        }
        coordStrategy = strategy.toUpperCase() as CoordinationStrategy;
      } else {
        coordStrategy = getDefaultStrategy(relType);
      }

      // Call API to create relationship
      if (typeof fetch !== 'undefined') {
        try {
          const apiUrl = process.env.CLAW_API_URL || '/api/claws';
          const response = await fetch(`${apiUrl}/${encodeURIComponent(fromClawId.trim())}/relationships`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CLAW_API_KEY || ''}`
            },
            body: JSON.stringify({
              target: toClawId.trim(),
              type: relType,
              strategy: coordStrategy
            })
          });

          if (response.ok) {
            return true; // Success
          } else {
            const error = await response.json();
            throw new Error((error as { message?: string }).message || 'Failed to create relationship');
          }
        } catch (error) {
          console.warn('CLAW_RELATE: Backend API unavailable:', error);
          throw new Error('Backend API unavailable');
        }
      }

      // No fetch available (server-side rendering)
      throw new Error('Fetch API not available');

    } catch (error) {
      console.error('CLAW_RELATE Error:', error);
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export default CLAW_RELATE;
