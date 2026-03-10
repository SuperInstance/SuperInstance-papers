/**
 * TILE COMPOSITION VALIDATION
 * ==========================
 *
 * When you hook two tiles together, you gotta make sure they play nice.
 * This is the safety inspector - checks the wiring before you flip the switch.
 *
 * Think of it like a commercial fisherman checking his nets:
 * - Are the meshes compatible? (Type checking)
 * - Will the whole thing hold together? (Safety validation)
 * - What's the weakest link? (Confidence bounds)
 * - Can we trust this setup? (Paradox detection)
 *
 * THE UNSAFE COMPOSITION PROBLEM:
 * Two tiles can be safe individually but dangerous together.
 *
 * Example:
 *   Tile A: "If confidence > 0.5, proceed" (safe alone)
 *   Tile B: "If amount < $10000, skip verification" (safe alone)
 *   A + B: Transaction passes if confidence > 0.5 AND amount < $10000
 *   Result: Fraudster makes 9999 purchases at 0.51 confidence = UNSAFE
 */

// ============================================================================
// CORE INTERFACES AND TYPES
// ============================================================================

/**
 * Data types for type checking
 * These are the basic types your tiles work with
 */
export enum TileDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  CONFIDENCE = 'confidence', // Special type from confidence-cascade
  ANY = 'any'
}

/**
 * Type constraint for a tile's input or output
 * Like a contract - this is what I promise to deliver
 */
export interface TypeConstraint {
  /** The data type */
  type: TileDataType;

  /** For arrays: what type of elements? */
  element_type?: TileDataType;

  /** For objects: what properties must exist? */
  required_props?: string[];

  /** For objects: types of specific properties */
  prop_types?: Record<string, TileDataType>;

  /** Is null/undefined allowed? */
  optional: boolean;

  /** Numeric range (if type is NUMBER) */
  range?: { min: number; max: number };

  /** String constraints (if type is STRING) */
  string_constraints?: {
    min_length?: number;
    max_length?: number;
    pattern?: RegExp;
  };
}

/**
 * Constraint bound - a value that can be enforced
 * Like saying "I need at least 0.8 confidence" or "amount must be positive"
 */
export interface ConstraintBound {
  /** The variable being constrained */
  variable: string;

  /** Minimum allowed value (for numbers) */
  min?: number;

  /** Maximum allowed value (for numbers) */
  max?: number;

  /** Exact value required (for any type) */
  exact?: any;

  /** One of these values (enum constraint) */
  one_of?: any[];

  /** Is this constraint required or just preferred? */
  required: boolean;

  /** Human-readable description */
  description: string;
}

/**
 * A tile in the composition chain
 */
export interface Tile {
  /** Unique identifier */
  id: string;

  /** What this tile does (human-readable) */
  description: string;

  /** Input type constraints */
  input_type: TypeConstraint;

  /** Output type constraints */
  output_type: TypeConstraint;

  /** Constraint bounds applied by this tile */
  constraints: ConstraintBound[];

  /** Base confidence of this tile (0-1) */
  base_confidence: number;

  /** Does this tile have side effects? (database writes, API calls, etc.) */
  has_side_effects: boolean;
}

/**
 * A composition: two or more tiles connected together
 */
export interface Composition {
  /** Unique identifier for this composition */
  id: string;

  /** The tiles in composition order */
  tiles: Tile[];

  /** How tiles are connected: 'sequential' or 'parallel' */
  connection_type: 'sequential' | 'parallel';

  /** Propagated constraints through the chain */
  propagated_constraints: ConstraintBound[];

  /** Calculated confidence bounds */
  confidence_bounds: ConfidenceBounds;
}

/**
 * Confidence bounds for a composition
 * Like a safety margin - best case, worst case, and expected
 */
export interface ConfidenceBounds {
  /** Best-case confidence (everything goes right) */
  upper: number;

  /** Worst-case confidence (everything goes wrong) */
  lower: number;

  /** Expected confidence (average case) */
  expected: number;

  /** How tight are these bounds? (0 = wide, 1 = narrow) */
  precision: number;
}

/**
 * Validation result - what the safety inspector found
 */
export interface ValidationResult {
  /** Is this composition safe to run? */
  is_safe: boolean;

  /** Are the types compatible? */
  types_compatible: boolean;

  /** Confidence bounds for the composition */
  confidence_bounds: ConfidenceBounds;

  /** Any safety issues found */
  issues: ValidationIssue[];

  /** Any paradoxes detected */
  paradoxes: Paradox[];

  /** Algebra law violations */
  law_violations: LawViolation[];
}

/**
 * A safety issue found during validation
 */
export interface ValidationIssue {
  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Where is the issue? */
  location: string;

  /** What's the problem? */
  message: string;

  /** Which tiles are involved? */
  tiles_involved: string[];

  /** Suggestion for fixing it */
  suggestion?: string;
}

/**
 * A paradox: contradictory constraints
 * Like saying "x > 5" and "x < 3" at the same time
 */
export interface Paradox {
  /** Unique identifier */
  id: string;

  /** Which constraints contradict each other */
  conflicting_constraints: ConstraintBound[];

  /** Why is this a paradox? */
  explanation: string;

  /** Which tiles are involved? */
  tiles_involved: string[];

  /** How to resolve it */
  resolution?: string;
}

/**
 * Algebra law violation
 * When the composition breaks mathematical properties
 */
export interface LawViolation {
  /** Which law was violated */
  law: 'associativity' | 'identity' | 'commutativity';

  /** What's the violation? */
  description: string;

  /** Which tiles are involved */
  tiles_involved: string[];

  /** Example showing the violation */
  example: string;
}

// ============================================================================
// TYPE COMPATIBILITY CHECKING
// ============================================================================

/**
 * Check if two type constraints are compatible
 *
 * MATHEMATICAL PROOF:
 * Let T1 and T2 be type constraints
 * T1 and T2 are compatible iff: ∃ x such that x ∈ T1 ∧ x ∈ T2
 * In other words: there exists at least one value that satisfies both
 *
 * @param output - Output type from first tile
 * @param input - Input type from second tile
 * @returns true if types can connect safely
 */
export function checkTypeCompatibility(
  output: TypeConstraint,
  input: TypeConstraint
): { compatible: boolean; reason: string } {
  // Type compatibility check

  // ANY is compatible with everything (wildcard)
  if (input.type === TileDataType.ANY) {
    return { compatible: true, reason: 'Input accepts any type' };
  }

  // Output is ANY but input requires specific type
  if (output.type === TileDataType.ANY && input.type !== TileDataType.ANY) {
    return {
      compatible: false,
      reason: `Output provides 'any' but input requires '${input.type}'`
    };
  }

  // Basic type mismatch
  if (output.type !== input.type) {
    return {
      compatible: false,
      reason: `Type mismatch: output is ${output.type}, input requires ${input.type}`
    };
  }

  // Array element type check
  if (output.type === TileDataType.ARRAY) {
    if (output.element_type && input.element_type) {
      if (output.element_type !== input.element_type) {
        return {
          compatible: false,
          reason: `Array element type mismatch: output is ${output.element_type}[], input requires ${input.element_type}[]`
        };
      }
    }
  }

  // Object property type check
  if (output.type === TileDataType.OBJECT && input.prop_types) {
    for (const [prop, required_type] of Object.entries(input.prop_types)) {
      if (output.prop_types && output.prop_types[prop]) {
        if (output.prop_types[prop] !== required_type) {
          return {
            compatible: false,
            reason: `Property '${prop}' type mismatch: output is ${output.prop_types[prop]}, input requires ${required_type}`
          };
        }
      }
    }
  }

  // Required properties check
  if (input.required_props && input.required_props.length > 0) {
    if (!output.prop_types) {
      return {
        compatible: false,
        reason: 'Input requires specific properties but output provides untyped object'
      };
    }

    for (const prop of input.required_props) {
      if (!output.prop_types[prop]) {
        return {
          compatible: false,
          reason: `Input requires property '${prop}' but output doesn't provide it`
        };
      }
    }
  }

  // Numeric range check
  if (output.type === TileDataType.NUMBER && output.range && input.range) {
    // Output range must be within input's acceptable range
    if (output.range.min < input.range.min || output.range.max > input.range.max) {
      return {
        compatible: false,
        reason: `Numeric range mismatch: output [${output.range.min}, ${output.range.max}] not within input [${input.range.min}, ${input.range.max}]`
      };
    }
  }

  // String constraint check
  if (output.type === TileDataType.STRING && input.string_constraints) {
    if (input.string_constraints.pattern) {
      // Can't statically verify pattern matches without test data
      // Return warning but allow it
      return {
        compatible: true,
        reason: 'String pattern compatibility requires runtime validation'
      };
    }

    if (input.string_constraints.min_length || input.string_constraints.max_length) {
      // Can't statically verify length without test data
      return {
        compatible: true,
        reason: 'String length compatibility requires runtime validation'
      };
    }
  }

  return { compatible: true, reason: 'Types are compatible' };
}

// ============================================================================
// CONSTRAINT PROPAGATION
// ============================================================================

/**
 * Compose constraints through a tile chain
 *
 * MATHEMATICAL PROOF:
 * Let C1, C2, ..., Cn be constraint sets from tiles T1, T2, ..., Tn
 * The propagated constraint C_prop is the intersection of all constraints:
 * C_prop = C1 ∩ C2 ∩ ... ∩ Cn
 *
 * If C_prop = ∅ (empty set), then constraints are contradictory (paradox)
 *
 * Example:
 *   T1 requires: confidence > 0.5
 *   T2 requires: confidence < 0.8
 *   T3 requires: confidence ≠ 0.6
 *   Propagated: 0.5 < confidence < 0.8 ∧ confidence ≠ 0.6
 *   This is satisfiable (0.55, 0.65, 0.70, 0.75 all work)
 *
 * @param tiles - Array of tiles in composition order
 * @returns Propagated constraints through the chain
 */
export function composeConstraints(tiles: Tile[]): ConstraintBound[] {
  if (tiles.length === 0) {
    return [];
  }

  // Start with first tile's constraints
  let propagated: ConstraintBound[] = [...tiles[0].constraints];

  // For each subsequent tile, merge constraints
  for (let i = 1; i < tiles.length; i++) {
    const tile = tiles[i];

    // Merge constraints from this tile
    for (const new_constraint of tile.constraints) {
      // Check if we already have a constraint on this variable
      const existing = propagated.find(c => c.variable === new_constraint.variable);

      if (!existing) {
        // New variable, add it
        propagated.push(new_constraint);
      } else {
        // Existing variable, merge the constraints
        const merged = mergeConstraints(existing, new_constraint);
        if (merged) {
          // Replace existing with merged
          const idx = propagated.findIndex(c => c.variable === new_constraint.variable);
          propagated[idx] = merged;
        } else {
          // Constraints contradict - keep the stricter one (required)
          if (new_constraint.required && !existing.required) {
            const idx = propagated.findIndex(c => c.variable === new_constraint.variable);
            propagated[idx] = new_constraint;
          }
        }
      }
    }
  }

  return propagated;
}

/**
 * Merge two constraints on the same variable
 * Returns null if constraints are contradictory
 */
function mergeConstraints(
  c1: ConstraintBound,
  c2: ConstraintBound
): ConstraintBound | null {
  // If both have exact values, they must match
  if (c1.exact !== undefined && c2.exact !== undefined) {
    if (c1.exact !== c2.exact) {
      return null; // Contradiction
    }
    return c1; // Same exact value
  }

  // If one has exact value, use that
  if (c1.exact !== undefined) return c1;
  if (c2.exact !== undefined) return c2;

  // Merge one_of constraints (intersection)
  if (c1.one_of && c2.one_of) {
    const intersection = c1.one_of.filter(v => c2.one_of!.includes(v));
    if (intersection.length === 0) {
      return null; // No common values
    }
    return {
      ...c1,
      one_of: intersection,
      required: c1.required || c2.required
    };
  }

  // Merge one_of with exact
  if (c1.exact !== undefined && c2.one_of) {
    if (!c2.one_of.includes(c1.exact)) {
      return null; // Exact value not in allowed set
    }
    return c1;
  }

  if (c2.exact !== undefined && c1.one_of) {
    if (!c1.one_of.includes(c2.exact)) {
      return null; // Exact value not in allowed set
    }
    return c2;
  }

  // Merge range constraints (intersection of ranges)
  if (c1.min !== undefined || c1.max !== undefined) {
    if (c2.min !== undefined || c2.max !== undefined) {
      const min = Math.max(c1.min ?? -Infinity, c2.min ?? -Infinity);
      const max = Math.min(c1.max ?? Infinity, c2.max ?? Infinity);

      if (min > max) {
        return null; // Ranges don't overlap
      }

      return {
        ...c1,
        min: min === -Infinity ? undefined : min,
        max: max === Infinity ? undefined : max,
        required: c1.required || c2.required,
        description: `Merged: ${c1.description} AND ${c2.description}`
      };
    }
  }

  // Default: keep the stricter (required) constraint
  return c1.required ? c1 : c2.required ? c2 : c1;
}

// ============================================================================
// SAFETY VALIDATION
// ============================================================================

/**
 * Validate a tile composition for safety
 *
 * SAFETY RULES:
 * 1. Type compatibility: All tile connections must have compatible types
 * 2. No constraint paradoxes: Conflicting constraints must be detectable
 * 3. Side effect isolation: Tiles with side effects need special handling
 * 4. Confidence preservation: Chain shouldn't degrade confidence too much
 *
 * @param composition - The composition to validate
 * @returns Validation result with all issues found
 */
export function validateComposition(composition: Composition): ValidationResult {
  const issues: ValidationIssue[] = [];
  const paradoxes: Paradox[] = [];
  const law_violations: LawViolation[] = [];

  // Check type compatibility between all connected tiles
  let types_compatible = true;

  if (composition.connection_type === 'sequential') {
    for (let i = 0; i < composition.tiles.length - 1; i++) {
      const current = composition.tiles[i];
      const next = composition.tiles[i + 1];

      const compatibility = checkTypeCompatibility(current.output_type, next.input_type);

      if (!compatibility.compatible) {
        types_compatible = false;
        issues.push({
          severity: 'error',
          location: `Connection ${current.id} -> ${next.id}`,
          message: compatibility.reason,
          tiles_involved: [current.id, next.id],
          suggestion: 'Add a conversion tile between them or modify types'
        });
      }
    }
  } else if (composition.connection_type === 'parallel') {
    // For parallel, all inputs must be compatible
    const first_input = composition.tiles[0].input_type;
    for (let i = 1; i < composition.tiles.length; i++) {
      const compatibility = checkTypeCompatibility(first_input, composition.tiles[i].input_type);
      if (!compatibility.compatible) {
        types_compatible = false;
        issues.push({
          severity: 'error',
          location: `Parallel input mismatch at tile ${i}`,
          message: compatibility.reason,
          tiles_involved: [composition.tiles[0].id, composition.tiles[i].id]
        });
      }
    }
  }

  // Detect paradoxes in constraints
  const detected_paradoxes = detectCompositionParadox(composition);
  paradoxes.push(...detected_paradoxes);

  if (detected_paradoxes.length > 0) {
    issues.push({
      severity: 'error',
      location: 'Constraint propagation',
      message: `Found ${detected_paradoxes.length} constraint paradox(es)`,
      tiles_involved: detected_paradoxes.flatMap(p => p.tiles_involved),
      suggestion: 'Review and resolve conflicting constraints'
    });
  }

  // Check confidence degradation
  const { upper, lower, expected } = composition.confidence_bounds;

  if (lower < 0.5) {
    issues.push({
      severity: 'warning',
      location: 'Confidence bounds',
      message: `Worst-case confidence is ${(lower * 100).toFixed(1)}% - below 50%`,
      tiles_involved: composition.tiles.map(t => t.id),
      suggestion: 'Add redundant tiles or increase individual tile confidence'
    });
  }

  if (expected < 0.7) {
    issues.push({
      severity: 'info',
      location: 'Confidence bounds',
      message: `Expected confidence is only ${(expected * 100).toFixed(1)}%`,
      tiles_involved: composition.tiles.map(t => t.id),
      suggestion: 'Consider shorter chain or higher-quality tiles'
    });
  }

  // Check side effect isolation
  const side_effect_tiles = composition.tiles.filter(t => t.has_side_effects);
  if (side_effect_tiles.length > 0) {
    issues.push({
      severity: 'info',
      location: 'Side effects',
      message: `${side_effect_tiles.length} tile(s) have side effects`,
      tiles_involved: side_effect_tiles.map(t => t.id),
      suggestion: 'Ensure side effects are idempotent and have rollback mechanisms'
    });
  }

  // Check algebra law violations
  if (composition.connection_type === 'sequential') {
    const violations = checkAlgebraLaws(composition);
    law_violations.push(...violations);

    if (violations.length > 0) {
      issues.push({
        severity: 'warning',
        location: 'Algebra laws',
        message: `${violations.length} algebra law violation(s) detected`,
        tiles_involved: violations.flatMap(v => v.tiles_involved),
        suggestion: 'Review tile composition for mathematical inconsistencies'
      });
    }
  }

  // Determine overall safety
  const errors = issues.filter(i => i.severity === 'error').length;
  const is_safe = errors === 0 && paradoxes.length === 0;

  return {
    is_safe,
    types_compatible,
    confidence_bounds: composition.confidence_bounds,
    issues,
    paradoxes,
    law_violations
  };
}

/**
 * Detect paradoxes in a composition
 *
 * PARADOX DETECTION ALGORITHM:
 * A paradox occurs when constraints form an unsatisfiable set.
 * This is equivalent to checking if the intersection of all constraints is empty.
 *
 * Example of undetectable paradox (runtime only):
 *   T1: "If confidence > 0.5, proceed"
 *   T2: "If confidence < 0.8, skip verification"
 *   T3: "If verification skipped, require confidence > 0.9"
 *   Paradox: Can't have confidence > 0.5 AND < 0.8 AND > 0.9
 *   This requires symbolic execution to detect at static time.
 *
 * @param composition - The composition to check
 * @returns Array of detected paradoxes
 */
export function detectCompositionParadox(composition: Composition): Paradox[] {
  const paradoxes: Paradox[] = [];
  const constraints = composition.propagated_constraints;

  // Group constraints by variable
  const by_variable = new Map<string, ConstraintBound[]>();
  for (const c of constraints) {
    if (!by_variable.has(c.variable)) {
      by_variable.set(c.variable, []);
    }
    by_variable.get(c.variable)!.push(c);
  }

  // Check each variable for contradictions
  for (const [variable, var_constraints] of by_variable.entries()) {
    // Check range contradictions
    const mins = var_constraints.filter(c => c.min !== undefined).map(c => c.min!);
    const maxs = var_constraints.filter(c => c.max !== undefined).map(c => c.max!);

    if (mins.length > 0 && maxs.length > 0) {
      const max_min = Math.max(...mins);
      const min_max = Math.min(...maxs);

      if (max_min > min_max) {
        // Paradox: minimum value required is greater than maximum allowed
        paradoxes.push({
          id: `paradox_${variable}_range`,
          conflicting_constraints: var_constraints.filter(c => c.min !== undefined || c.max !== undefined),
          explanation: `Variable '${variable}' must be > ${max_min} AND < ${min_max}, which is impossible`,
          tiles_involved: composition.tiles.filter(t =>
            t.constraints.some(c => c.variable === variable)
          ).map(t => t.id),
          resolution: `Adjust range constraints on '${variable}' to allow overlap`
        });
      }
    }

    // Check exact value contradictions
    const exacts = var_constraints.filter(c => c.exact !== undefined);
    if (exacts.length > 1) {
      const unique_exacts = new Set(exacts.map(c => c.exact));
      if (unique_exacts.size > 1) {
        // Paradox: different exact values required
        paradoxes.push({
          id: `paradox_${variable}_exact`,
          conflicting_constraints: exacts,
          explanation: `Variable '${variable}' must be multiple different exact values: ${Array.from(unique_exacts).join(', ')}`,
          tiles_involved: composition.tiles.filter(t =>
            t.constraints.some(c => c.variable === variable && c.exact !== undefined)
          ).map(t => t.id),
          resolution: `Remove conflicting exact value constraints on '${variable}'`
        });
      }
    }

    // Check one_of contradictions
    const one_ofs = var_constraints.filter(c => c.one_of !== undefined);
    if (one_ofs.length > 1) {
      const intersection = one_ofs
        .reduce((acc, c) => acc.filter(v => c.one_of!.includes(v)), one_ofs[0].one_of!);

      if (intersection.length === 0) {
        // Paradox: no common values in allowed sets
        paradoxes.push({
          id: `paradox_${variable}_one_of`,
          conflicting_constraints: one_ofs,
          explanation: `Variable '${variable}' has disjoint allowed sets - no possible value satisfies all constraints`,
          tiles_involved: composition.tiles.filter(t =>
            t.constraints.some(c => c.variable === variable && c.one_of !== undefined)
          ).map(t => t.id),
          resolution: `Ensure allowed value sets for '${variable}' have at least one common value`
        });
      }
    }
  }

  // Check for "safe tile, unsafe composition" paradox
  // This is the most dangerous: two tiles that are safe individually but unsafe together
  const safe_but_unsafe = detectSafeTileUnsafeComposition(composition);
  paradoxes.push(...safe_but_unsafe);

  return paradoxes;
}

/**
 * Detect the "safe tile, unsafe composition" paradox
 *
 * This is the KILLER paradox: two tiles that pass validation individually
 * but create a dangerous vulnerability when composed.
 *
 * REAL-WORLD EXAMPLE:
 *   Tile A: "Proceed if confidence > 0.5" (safe alone, reasonable threshold)
 *   Tile B: "Skip verification if amount < $10000" (safe alone, reasonable limit)
 *   Composed: Transactions with 0.51 confidence and $9999 amount proceed WITHOUT verification
 *   Vulnerability: Fraudster makes 100 small purchases just above the threshold
 *
 * DETECTION STRATEGY:
 * 1. Find tiles that relax constraints
 * 2. Find tiles that depend on those constraints
 * 3. Check if the relaxation exposes a vulnerability
 */
function detectSafeTileUnsafeComposition(composition: Composition): Paradox[] {
  const paradoxes: Paradox[] = [];

  // Look for confidence-relaxing tiles
  const confidence_relaxers = composition.tiles.filter(t =>
    t.constraints.some(c =>
      c.variable === 'confidence' &&
      c.max !== undefined &&
      c.max < 0.8 // Relaxed threshold (< 80%)
    )
  );

  // Look for amount-based skipping tiles
  const amount_skippers = composition.tiles.filter(t =>
    t.constraints.some(c =>
      c.variable === 'amount' &&
      c.max !== undefined
    )
  );

  // If both exist in the chain, flag the paradox
  if (confidence_relaxers.length > 0 && amount_skippers.length > 0) {
    const relaxed_threshold = Math.min(...confidence_relaxers.flatMap(t =>
      t.constraints.filter(c => c.variable === 'confidence' && c.max !== undefined).map(c => c.max!)
    ));

    const skip_limit = Math.min(...amount_skippers.flatMap(t =>
      t.constraints.filter(c => c.variable === 'amount' && c.max !== undefined).map(c => c.max!)
    ));

    paradoxes.push({
      id: 'paradox_safe_tile_unsafe_composition',
      conflicting_constraints: [
        ...confidence_relaxers.flatMap(t => t.constraints.filter(c => c.variable === 'confidence')),
        ...amount_skippers.flatMap(t => t.constraints.filter(c => c.variable === 'amount'))
      ],
      explanation: `SAFE TILE PARADOX: Individually safe tiles create unsafe composition. ` +
        `Transactions with confidence > ${relaxed_threshold} AND amount < ${skip_limit} ` +
        `may bypass verification. Each tile is safe alone, but together they create a vulnerability.`,
      tiles_involved: [...confidence_relaxers.map(t => t.id), ...amount_skippers.map(t => t.id)],
      resolution: 'Add a verification tile that checks both confidence AND amount together, or raise the confidence threshold when amount is high'
    });
  }

  return paradoxes;
}

// ============================================================================
// CONFIDENCE BOUNDS CALCULATION
// ============================================================================

/**
 * Calculate confidence bounds for a composition
 *
 * MATHEMATICAL PROOF:
 * For sequential composition with n tiles of confidence c1, c2, ..., cn:
 * - Upper bound: max(c1, c2, ..., cn) - best case, all align
 * - Lower bound: c1 * c2 * ... * cn - worst case, all multiply
 * - Expected: geometric mean = (c1 * c2 * ... * cn)^(1/n)
 * - Precision: 1 - (upper - lower) - tighter is better
 *
 * For parallel composition with weighted confidence:
 * - Upper bound: max(weighted averages)
 * - Lower bound: min(weighted averages)
 * - Expected: mean(weighted averages)
 * - Precision: depends on weight distribution
 *
 * @param composition - The composition to calculate bounds for
 * @returns Confidence bounds (upper, lower, expected, precision)
 */
export function calculateConfidenceBounds(composition: Composition): ConfidenceBounds {
  const tiles = composition.tiles;

  if (tiles.length === 0) {
    return { upper: 0, lower: 0, expected: 0, precision: 0 };
  }

  if (composition.connection_type === 'sequential') {
    // Sequential: confidence multiplies
    const confidences = tiles.map(t => t.base_confidence);

    // Lower bound: product (worst case)
    const lower = confidences.reduce((a, b) => a * b, 1.0);

    // Upper bound: maximum (best case - all reinforce each other)
    const upper = Math.max(...confidences);

    // Expected: geometric mean
    const product = confidences.reduce((a, b) => a * b, 1.0);
    const expected = Math.pow(product, 1.0 / confidences.length);

    // Precision: 1 - range (normalized)
    const precision = 1 - (upper - lower);

    return { upper, lower, expected, precision: Math.max(0, precision) };
  } else {
    // Parallel: weighted average
    // For simplicity, assume equal weights
    const confidences = tiles.map(t => t.base_confidence);

    const upper = Math.max(...confidences);
    const lower = Math.min(...confidences);
    const expected = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const precision = 1 - (upper - lower);

    return { upper, lower, expected, precision: Math.max(0, precision) };
  }
}

// ============================================================================
// ALGEBRA LAW VALIDATION
// ============================================================================

/**
 * Check composition algebra laws
 *
 * MATHEMATICAL PROOF:
 * A composition system forms a monoid if:
 * 1. Associativity: (A ∘ B) ∘ C = A ∘ (B ∘ C)
 * 2. Identity: A ∘ I = I ∘ A = A (where I is identity tile)
 *
 * Additional properties:
 * 3. Commutativity: A ∘ B = B ∘ A (for parallel only)
 *
 * TILE COMPOSITION violates associativity when tiles have side effects.
 * TILE COMPOSITION violates identity when tiles have non-trivial constraints.
 *
 * @param composition - The composition to validate
 * @returns Array of law violations
 */
export function checkAlgebraLaws(composition: Composition): LawViolation[] {
  const violations: LawViolation[] = [];
  const tiles = composition.tiles;

  // Check associativity for sequential composition
  if (composition.connection_type === 'sequential' && tiles.length >= 3) {
    // (A ∘ B) ∘ C vs A ∘ (B ∘ C)
    // These are equivalent if no tiles have side effects

    const has_side_effects = tiles.some(t => t.has_side_effects);

    if (has_side_effects) {
      violations.push({
        law: 'associativity',
        description: 'Sequential composition is not associative when tiles have side effects',
        tiles_involved: tiles.filter(t => t.has_side_effects).map(t => t.id),
        example: `(A ∘ B) ∘ C ≠ A ∘ (B ∘ C) when tiles have side effects. Order of evaluation matters.`
      });
    }

    // Check if constraint propagation breaks associativity
    const c1 = composeConstraints([tiles[0], tiles[1]]);
    const c2 = composeConstraints([tiles[0], tiles[1], tiles[2]]);

    const c1_then_c2 = composeConstraints([
      { ...tiles[0], constraints: c1 },
      tiles[2]
    ]);

    const c1_c2 = composeConstraints([tiles[1], tiles[2]]);
    const c0_then_c1c2 = composeConstraints([
      tiles[0],
      { ...tiles[1], constraints: c1_c2 }
    ]);

    // Check if the constraints match
    const constraints_match = JSON.stringify(c1_then_c2) === JSON.stringify(c0_then_c1c2);

    if (!constraints_match) {
      violations.push({
        law: 'associativity',
        description: 'Constraint propagation breaks associativity',
        tiles_involved: tiles.map(t => t.id),
        example: `compose(A, compose(B, C)) ≠ compose(compose(A, B), C) due to constraint merging`
      });
    }
  }

  // Check identity element
  // Identity tile should: pass through all types, no constraints, confidence = 1.0
  const identity_candidates = tiles.filter(t =>
    t.base_confidence === 1.0 &&
    t.constraints.length === 0 &&
    JSON.stringify(t.input_type) === JSON.stringify(t.output_type)
  );

  if (identity_candidates.length > 0) {
    // Check if they actually behave as identity
    for (const identity of identity_candidates) {
      const other_tiles = tiles.filter(t => t.id !== identity.id);

      if (other_tiles.length > 0) {
        const other = other_tiles[0];

        // A ∘ I = A?
        const a_then_i = composeConstraints([other, identity]);
        const a = composeConstraints([other]);

        if (JSON.stringify(a_then_i) !== JSON.stringify(a)) {
          violations.push({
            law: 'identity',
            description: 'Tile appears to be identity but violates identity law',
            tiles_involved: [identity.id, other.id],
            example: `${other.id} ∘ ${identity.id} ≠ ${other.id}`
          });
        }
      }
    }
  }

  // Check commutativity for parallel composition
  if (composition.connection_type === 'parallel' && tiles.length >= 2) {
    // A ∥ B should equal B ∥ A for true commutativity
    // This holds if tiles don't modify shared state

    const modifies_shared_state = tiles.some(t => t.has_side_effects);

    if (modifies_shared_state) {
      violations.push({
        law: 'commutativity',
        description: 'Parallel composition is not commutative when tiles modify shared state',
        tiles_involved: tiles.filter(t => t.has_side_effects).map(t => t.id),
        example: `A ∥ B ≠ B ∥ A when A or B have side effects on shared state`
      });
    }
  }

  return violations;
}

// ============================================================================
// EXAMPLE: DETECTING UNSAFE COMPOSITION
// ============================================================================

/**
 * REAL-WORLD EXAMPLE: Fraud Detection System
 *
 * Two tiles that are safe individually but DANGEROUS together:
 *
 * Tile A: Low Confidence Pass-Through
 *   - Input: Transaction
 *   - Output: Transaction
 *   - Constraint: If confidence > 0.5, proceed
 *   - Safe alone: 50% is reasonable for low-risk transactions
 *
 * Tile B: Small Amount Skip
 *   - Input: Transaction
 *   - Output: Transaction
 *   - Constraint: If amount < $10000, skip enhanced verification
 *   - Safe alone: $10k is reasonable threshold for enhanced verification
 *
 * COMPOSED (A → B):
 *   Transaction with 0.51 confidence AND $9999 amount:
 *   - Passes Tile A (confidence > 0.5)
 *   - Passes Tile B (amount < $10000)
 *   - SKIPS ENHANCED VERIFICATION
 *   - VULNERABILITY: Fraudster makes 100 purchases at $9999 with just above 50% confidence
 *
 * This is the SAFE TILE, UNSAFE COMPOSITION paradox.
 */
export function createUnsafeCompositionExample(): {
  composition: Composition;
  validation: ValidationResult;
  explanation: string;
} {
  // Define the two dangerous tiles
  const low_confidence_tile: Tile = {
    id: 'low_confidence_pass',
    description: 'Passes transactions with confidence > 0.5',
    input_type: {
      type: TileDataType.OBJECT,
      optional: false,
      prop_types: {
        confidence: TileDataType.NUMBER,
        amount: TileDataType.NUMBER,
        merchant_id: TileDataType.STRING
      }
    },
    output_type: {
      type: TileDataType.OBJECT,
      optional: false,
      prop_types: {
        confidence: TileDataType.NUMBER,
        amount: TileDataType.NUMBER,
        merchant_id: TileDataType.STRING
      }
    },
    constraints: [
      {
        variable: 'confidence',
        min: 0.5,
        required: true,
        description: 'Confidence must be at least 50%'
      }
    ],
    base_confidence: 0.95,
    has_side_effects: false
  };

  const small_amount_skip: Tile = {
    id: 'small_amount_skip_verification',
    description: 'Skips enhanced verification for amounts < $10000',
    input_type: {
      type: TileDataType.OBJECT,
      optional: false,
      prop_types: {
        confidence: TileDataType.NUMBER,
        amount: TileDataType.NUMBER,
        merchant_id: TileDataType.STRING
      }
    },
    output_type: {
      type: TileDataType.OBJECT,
      optional: false,
      prop_types: {
        confidence: TileDataType.NUMBER,
        amount: TileDataType.NUMBER,
        merchant_id: TileDataType.STRING
      }
    },
    constraints: [
      {
        variable: 'amount',
        max: 10000,
        required: false,
        description: 'Skip verification for amounts under $10k'
      }
    ],
    base_confidence: 0.90,
    has_side_effects: false
  };

  // Create the composition
  const composition: Composition = {
    id: 'fraud_detection_composition',
    tiles: [low_confidence_tile, small_amount_skip],
    connection_type: 'sequential',
    propagated_constraints: composeConstraints([low_confidence_tile, small_amount_skip]),
    confidence_bounds: calculateConfidenceBounds({
      id: 'temp',
      tiles: [low_confidence_tile, small_amount_skip],
      connection_type: 'sequential',
      propagated_constraints: [],
      confidence_bounds: { upper: 0, lower: 0, expected: 0, precision: 0 }
    })
  };

  // Validate it
  const validation = validateComposition(composition);

  return {
    composition,
    validation,
    explanation: `
SAFE TILE, UNSAFE COMPOSITION EXAMPLE
====================================

Two tiles that seem reasonable individually:

1. LOW CONFIDENCE PASS (Safe Alone):
   - Allows transactions with confidence > 50%
   - Reasonable: Low-risk transactions don't need 99% confidence
   - Base confidence: 95%

2. SMALL AMOUNT SKIP (Safe Alone):
   - Skips enhanced verification for amounts < $10,000
   - Reasonable: Small transactions don't warrant full investigation
   - Base confidence: 90%

COMPOSED (Tile 1 → Tile 2):
   - Passes if: confidence > 0.5 AND amount < $10,000
   - Vulnerability: Transaction with 51% confidence and $9,999
   - Result: SKIPS ENHANCED VERIFICATION
   - Attack: Fraudster makes 100 purchases at $9,999 with 51% confidence

VALIDATION RESULTS:
   - Is safe: ${validation.is_safe ? 'YES (WRONG!)' : 'NO (CORRECT!)'}
   - Issues found: ${validation.issues.length}
   - Paradoxes detected: ${validation.paradoxes.length}

THE FIX:
   Add a third tile that checks BOTH constraints together:
   - If confidence < 0.8 AND amount > 1000, require verification
   - This blocks the attack vector while preserving efficiency for legitimate transactions

This is why composition validation matters - individual safety doesn't guarantee system safety.
    `.trim()
  };
}

/**
 * Run the unsafe composition example and print results
 */
export function runUnsafeCompositionExample(): void {
  console.log('=== TILE COMPOSITION VALIDATION ===\n');
  console.log('SAFE TILE, UNSAFE COMPOSITION DETECTION\n');

  const example = createUnsafeCompositionExample();

  console.log(example.explanation);
  console.log('\n--- VALIDATION DETAILS ---\n');

  console.log('Composition:');
  console.log(`  Tiles: ${example.composition.tiles.map(t => t.id).join(' → ')}`);
  console.log(`  Connection type: ${example.composition.connection_type}`);
  console.log(`  Propagated constraints: ${example.composition.propagated_constraints.length}`);
  console.log(`  Confidence bounds:`);
  console.log(`    Upper: ${(example.composition.confidence_bounds.upper * 100).toFixed(1)}%`);
  console.log(`    Lower: ${(example.composition.confidence_bounds.lower * 100).toFixed(1)}%`);
  console.log(`    Expected: ${(example.composition.confidence_bounds.expected * 100).toFixed(1)}%`);
  console.log(`    Precision: ${(example.composition.confidence_bounds.precision * 100).toFixed(1)}%`);

  console.log('\nValidation Result:');
  console.log(`  Is safe: ${example.validation.is_safe}`);
  console.log(`  Types compatible: ${example.validation.types_compatible}`);
  console.log(`  Issues: ${example.validation.issues.length}`);
  console.log(`  Paradoxes: ${example.validation.paradoxes.length}`);
  console.log(`  Law violations: ${example.validation.law_violations.length}`);

  if (example.validation.issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of example.validation.issues) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
      console.log(`    Location: ${issue.location}`);
      console.log(`    Tiles: ${issue.tiles_involved.join(', ')}`);
      if (issue.suggestion) {
        console.log(`    Suggestion: ${issue.suggestion}`);
      }
    }
  }

  if (example.validation.paradoxes.length > 0) {
    console.log('\nParadoxes:');
    for (const paradox of example.validation.paradoxes) {
      console.log(`  ${paradox.id}`);
      console.log(`    Explanation: ${paradox.explanation}`);
      console.log(`    Tiles: ${paradox.tiles_involved.join(', ')}`);
      if (paradox.resolution) {
        console.log(`    Resolution: ${paradox.resolution}`);
      }
    }
  }

  if (example.validation.law_violations.length > 0) {
    console.log('\nLaw Violations:');
    for (const violation of example.validation.law_violations) {
      console.log(`  [${violation.law}] ${violation.description}`);
      console.log(`    Tiles: ${violation.tiles_involved.join(', ')}`);
      console.log(`    Example: ${violation.example}`);
    }
  }

  console.log('\n=== END EXAMPLE ===\n');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a safe tile for testing
 */
export function createSafeTile(
  id: string,
  description: string,
  input_type: TileDataType,
  output_type: TileDataType,
  confidence: number = 0.9
): Tile {
  return {
    id,
    description,
    input_type: { type: input_type, optional: false },
    output_type: { type: output_type, optional: false },
    constraints: [],
    base_confidence: confidence,
    has_side_effects: false
  };
}

/**
 * Create a tile with constraints for testing
 */
export function createConstrainedTile(
  id: string,
  description: string,
  constraints: ConstraintBound[],
  confidence: number = 0.9
): Tile {
  return {
    id,
    description,
    input_type: { type: TileDataType.ANY, optional: false },
    output_type: { type: TileDataType.ANY, optional: false },
    constraints,
    base_confidence: confidence,
    has_side_effects: false
  };
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Safety: ${result.is_safe ? '✓ SAFE' : '✗ UNSAFE'}`);
  lines.push(`Type compatibility: ${result.types_compatible ? '✓' : '✗'}`);
  lines.push(`Confidence bounds:`);
  lines.push(`  Upper: ${(result.confidence_bounds.upper * 100).toFixed(1)}%`);
  lines.push(`  Lower: ${(result.confidence_bounds.lower * 100).toFixed(1)}%`);
  lines.push(`  Expected: ${(result.confidence_bounds.expected * 100).toFixed(1)}%`);
  lines.push(`  Precision: ${(result.confidence_bounds.precision * 100).toFixed(1)}%`);

  if (result.issues.length > 0) {
    lines.push(`\nIssues (${result.issues.length}):`);
    for (const issue of result.issues) {
      lines.push(`  [${issue.severity}] ${issue.message}`);
    }
  }

  if (result.paradoxes.length > 0) {
    lines.push(`\nParadoxes (${result.paradoxes.length}):`);
    for (const paradox of result.paradoxes) {
      lines.push(`  ${paradox.id}: ${paradox.explanation}`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core functions
  checkTypeCompatibility,
  composeConstraints,
  validateComposition,
  detectCompositionParadox,
  calculateConfidenceBounds,
  checkAlgebraLaws,

  // Examples and utilities
  createUnsafeCompositionExample,
  runUnsafeCompositionExample,
  createSafeTile,
  createConstrainedTile,
  formatValidationResult,

  // Types
  TileDataType,
  type ValidationResult,
  type Composition,
  type Tile,
  type ConstraintBound,
  type TypeConstraint,
  type ConfidenceBounds,
  type Paradox,
  type ValidationIssue,
  type LawViolation
};
