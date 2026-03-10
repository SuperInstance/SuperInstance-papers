# Breakdown Engine Round 2: Advanced Ambiguity Resolution

**Author:** R&D Agent - Breakdown Engine Round 2
**Date:** 2026-03-08
**Status:** Design Specification
**Version:** 2.0.0
**Phase:** Round 2 - Advanced Features

---

## Executive Summary

**Vision:** "Fracture the 4th wall of AI. Turn chatbot logic into boxes for breakdown and analysis."

Round 1 of the Breakdown Engine established foundational reasoning step extraction with 18 step types, 6-dimensional confidence scoring, and basic ambiguity handling (implicit reasoning, circular reasoning, incomplete reasoning).

**Round 2 Mission:** Design advanced ambiguity resolution that transforms ambiguity from a bug into a feature. When reasoning can be parsed multiple ways, we don't just pick one—we explore the space of interpretations and engage users in meaningful disambiguation.

**Core Innovation:** Multi-interpretation reasoning steps that exist in superposition until collapsed by context or user interaction.

---

## Table of Contents

1. [Ambiguity Taxonomy (12+ Types)](#ambiguity-taxonomy)
2. [Multi-Interpretation Storage Format](#multi-interpretation-storage-format)
3. [Resolution Decision Tree](#resolution-decision-tree)
4. [Context-Dependent Disambiguation](#context-dependent-disambiguation)
5. [Creative vs Deterministic Classification](#creative-vs-deterministic-classification)
6. [User-in-the-Loop Resolution](#user-in-the-loop-resolution)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [Integration with Confidence Scoring](#integration-with-confidence-scoring)
9. [Real-World Examples](#real-world-examples)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Ambiguity Taxonomy (12+ Types)

### 1.1 Lexical Ambiguity

**Definition:** Words or phrases with multiple meanings.

```typescript
interface LexicalAmbiguity {
  type: 'lexical';
  ambiguousToken: string;
  interpretations: LexicalInterpretation[];
  confidence: number; // 0-1, how ambiguous?
}

interface LexicalInterpretation {
  wordSense: string;
  definition: string;
  domain: string; // e.g., 'medical', 'legal', 'technical'
  probability: number;
  examples: string[];
}
```

**Examples:**
- "bank" → financial institution vs river edge
- "run" → execute (code) vs operate (service) vs jog (exercise)
- "table" → data structure vs furniture vs database table

### 1.2 Syntactic Ambiguity

**Definition:** Multiple parse trees for same sentence structure.

```typescript
interface SyntacticAmbiguity {
  type: 'syntactic';
  ambiguousPhrase: string;
  parseTrees: ParseTree[];
  structuralDifference: string;
  confidence: number;
}

interface ParseTree {
  treeSyntax: string;
  meaning: string;
  dependencies: Dependency[];
  probability: number;
}
```

**Examples:**
- "I saw the man with the telescope" → (I saw (the man with telescope)) vs ((I saw the man) with telescope)
- "Check if the user is active and logged in or guest" → (active AND (logged in OR guest)) vs ((active AND logged in) OR guest)

### 1.3 Semantic Ambiguity

**Definition:** Sentence is grammatical but meaning is unclear.

```typescript
interface SemanticAmbiguity {
  type: 'semantic';
  ambiguousStatement: string;
  interpretations: SemanticInterpretation[];
  source: 'word_sense' | 'scope' | 'reference' | 'metaphor';
  confidence: number;
}

interface SemanticInterpretation {
  meaning: string;
  entailments: string[];
  presuppositions: string[];
  implications: string[];
  probability: number;
}
```

**Examples:**
- "Every child loves a dog" → (each child loves some dog) vs (each child loves the same dog)
- "John's book" → book John wrote vs book John owns vs book about John

### 1.4 Pragmatic Ambiguity

**Definition:** Meaning depends on context/intent not captured in literal text.

```typescript
interface PragmaticAmbiguity {
  type: 'pragmatic';
  utterance: string;
  interpretations: PragmaticInterpretation[];
  contextRequired: string[];
  confidence: number;
}

interface PragmaticInterpretation {
  intendedMeaning: string;
  speechAct: 'assertion' | 'request' | 'promise' | 'question' | 'command';
  implicatures: string[];
  requiredContext: Context[];
  probability: number;
}
```

**Examples:**
- "It's cold in here" → literal observation vs request to close window
- "Can you pass the salt?" → literal ability question vs polite request

### 1.5 Referential Ambiguity

**Definition:** Unclear what a pronoun or reference refers to.

```typescript
interface ReferentialAmbiguity {
  type: 'referential';
  ambiguousReference: string;
  candidates: ReferenceCandidate[];
  position: { start: number; end: number };
  confidence: number;
}

interface ReferenceCandidate {
  target: string; // What the reference might point to
  targetType: 'entity' | 'concept' | 'previous_step' | 'external';
  distance: number; // How far back in text
  salience: number; // How prominent/likely
  probability: number;
}
```

**Examples:**
- "The users didn't like the feature. They complained about it." → "they" = users, "it" = feature
- "When the system loads data and processes it, it should show progress." → which "it" shows progress?

### 1.6 Scope Ambiguity

**Definition:** Unclear what logical operators apply to.

```typescript
interface ScopeAmbiguity {
  type: 'scope';
  ambiguousExpression: string;
  interpretations: ScopeInterpretation[];
  operator: 'universal' | 'existential' | 'negation' | 'modal';
  confidence: number;
}

interface ScopeInterpretation {
  scope: string;
  logicalForm: string;
  truthConditions: string;
  probability: number;
}
```

**Examples:**
- "Not all users are active" → ¬(∀x: User(x) → Active(x)) vs ∀x: User(x) → ¬Active(x)
- "You must update the cache or database" → must(cache ∨ database) vs (must(cache)) ∨ database

### 1.7 Temporal Ambiguity

**Definition:** Unclear temporal relationship between events.

```typescript
interface TemporalAmbiguity {
  type: 'temporal';
  ambiguousStatement: string;
  interpretations: TemporalInterpretation[];
  confidence: number;
}

interface TemporalInterpretation {
  timeline: string;
  eventOrder: EventOrder[];
  causality: CausalityRelation[];
  probability: number;
}

interface EventOrder {
  event: string;
  position: 'before' | 'after' | 'simultaneous' | 'overlapping';
  relativeTo: string;
}
```

**Examples:**
- "Update the cache when the database changes" → update after vs update before vs update simultaneously
- "Log errors before fixing them" → sequential order implied vs generic instruction

### 1.8 Anaphoric Ambiguity

**Definition:** Unclear backward reference to previously mentioned item.

```typescript
interface AnaphoricAmbiguity {
  type: 'anaphoric';
  anaphor: string; // The referring expression
  antecedents: AntecedentCandidate[];
  contextRange: { start: number; end: number }; // Where to look for antecedents
  confidence: number;
}

interface AntecedentCandidate {
  text: string;
  position: number;
  grammaticalMatch: boolean;
  semanticMatch: number;
  recency: number;
  probability: number;
}
```

**Examples:**
- "The button opens the dialog. Clicking it closes the dialog." → "it" refers to button or dialog?
- "Data flows from API to cache. When it's full..." → "it" = cache or API?

### 1.9 Categorical Ambiguity

**Definition:** Unclear which category something belongs to.

```typescript
interface CategoricalAmbiguity {
  type: 'categorical';
  ambiguousEntity: string;
  candidateCategories: Category[];
  classificationBasis: string; // How are we categorizing?
  confidence: number;
}

interface Category {
  name: string;
  definition: string;
  prototype: string; // Typical example
  membershipCriteria: string[];
  probability: number;
}
```

**Examples:**
- "error" → user error vs system error vs network error
- "optimize" → optimize for speed vs memory vs cost vs accuracy

### 1.10 Causal Ambiguity

**Definition:** Unclear causal relationship between events.

```typescript
interface CausalAmbiguity {
  type: 'causal';
  ambiguousCausality: string;
  interpretations: CausalInterpretation[];
  confidence: number;
}

interface CausalInterpretation {
  cause: string;
  effect: string;
  mechanism: string; // How cause leads to effect
  direction: 'forward' | 'reverse' | 'bidirectional';
  strength: number; // How strong is causal link?
  probability: number;
}
```

**Examples:**
- "The system slowed down after the update" → update caused slowdown vs coincidental vs third factor
- "Users left because the app crashed" → crash caused departure vs both from other cause

### 1.11 Intentional Ambiguity

**Definition:** Unclear intent/purpose behind action or statement.

```typescript
interface IntentionalAmbiguity {
  type: 'intentional';
  ambiguousAction: string;
  interpretations: IntentionalInterpretation[];
  agent: string; // Who is acting?
  confidence: number;
}

interface IntentionalInterpretation {
  goal: string;
  motivation: string[];
  expectedOutcome: string;
  alternativeExplanations: string[];
  probability: number;
}
```

**Examples:**
- "The system retries the request" → recover from error vs detect flakiness vs load testing
- "We log user behavior" → improve product vs debugging vs surveillance vs analytics

### 1.12 Metaphorical Ambiguity

**Definition:** Unclear if statement is literal or figurative.

```typescript
interface MetaphoricalAmbiguity {
  type: 'metaphorical';
  ambiguousExpression: string;
  interpretations: MetaphoricalInterpretation[];
  confidence: number;
}

interface MetaphoricalInterpretation {
  isLiteral: boolean;
  literalMeaning: string;
  figurativeMeaning: string;
  metaphorType: 'conceptual' | 'structural' | 'orientational';
  sourceDomain: string;
  targetDomain: string;
  probability: number;
}
```

**Examples:**
- "The server is drowning in requests" → literal (water) vs figurative (overloaded)
- "This feature is a game-changer" → literal (game) vs figurative (revolutionary)
- "Clean up the code" → literal (remove dirt) vs figurative (refactor)

---

## 2. Multi-Interpretation Storage Format

### 2.1 Superposition State

When ambiguity is detected, reasoning steps exist in superposition:

```typescript
interface AmbiguousReasoningStep extends ReasoningStep {
  // Inherit all ReasoningStep fields

  // ==========================================================================
  // Multi-Interpretation State
  // ==========================================================================

  /**
   * Is this step currently in superposition?
   */
  isInSuperposition: boolean;

  /**
   * All valid interpretations
   */
  interpretations: Interpretation[];

  /**
   * Currently active interpretation (if collapsed)
   */
  activeInterpretation?: string; // interpretationId

  /**
   * Why are there multiple interpretations?
   */
  ambiguitySource: AmbiguitySource;

  /**
   * How should we resolve this?
   */
  resolutionStrategy: ResolutionStrategy;

  /**
   * Have we asked the user?
   */
  userConsulted: boolean;

  /**
   * User's choice (if consulted)
   */
  userChoice?: UserResolution;
}

/**
 * Single interpretation of an ambiguous step
 */
interface Interpretation {
  /**
   * Unique ID for this interpretation
   */
  id: string;

  /**
   * The interpreted step
   */
  step: Partial<ReasoningStep>;

  /**
   * Probability/likelihood of this interpretation
   */
  probability: number;

  /**
   * Why is this interpretation valid?
   */
  justification: string;

  /**
   * Evidence supporting this interpretation
   */
  evidence: Evidence[];

  /**
   * Conflicts with other interpretations?
   */
  conflicts: string[]; // interpretationIds

  /**
   * Dependencies specific to this interpretation
   */
  dependencies: string[];

  /**
   * Metadata about how this was generated
   */
  metadata: {
    source: 'llm' | 'pattern' | 'user' | 'context';
    confidence: number;
    timestamp: number;
  };
}

/**
 * Source of ambiguity
 */
interface AmbiguitySource {
  /**
   * Type of ambiguity
   */
  type: AmbiguityType;

  /**
   * Where in the step it occurs
   */
  location: {
    charOffset: { start: number; end: number };
    wordRange?: [number, number];
  };

  /**
   * What creates the ambiguity?
   */
  cause: string;

  /**
   * How many interpretations?
   */
  interpretationCount: number;

  /**
   * Can we resolve automatically?
   */
  autoResolvable: boolean;
}

/**
 * How to resolve the ambiguity
 */
type ResolutionStrategy =
  | 'context_dependent'    // Use surrounding cells to decide
  | 'user_choice'          // Ask user to pick
  | 'probabilistic'        // Use most likely
  | 'parallel_explore'     // Try all interpretations
  | 'defer'                // Decide later when needed
  | 'creative_embrace'     // Keep ambiguity as feature
  | 'deterministic_rule';  // Apply deterministic rule

/**
 * User's resolution choice
 */
interface UserResolution {
  /**
   * Which interpretation did user choose?
   */
  chosenInterpretation: string; // interpretationId

  /**
   * When did they choose?
   */
  timestamp: number;

  /**
   * Why did they choose this?
   */
  reasoning?: string;

  /**
   * Confidence in their choice
   */
  confidence: number;

  /**
   * Should this choice persist?
   */
  persist: boolean;
}
```

### 2.2 Ambiguity Graph

Track relationships between interpretations:

```typescript
interface AmbiguityGraph {
  /**
   * Nodes = interpretations
   */
  nodes: InterpretationNode[];

  /**
   * Edges = relationships
   */
  edges: InterpretationEdge[];

  /**
   * Find compatible interpretations
   */
  findCompatible(
    nodeId: string,
    constraints: CompatibilityConstraint[]
  ): InterpretationNode[];

  /**
   * Find conflicts
   */
  findConflicts(nodeId: string): InterpretationNode[];
}

interface InterpretationNode {
  id: string;
  interpretation: Interpretation;
  compatibleWith: string[]; // interpretationIds
  conflictsWith: string[]; // interpretationIds
}

interface InterpretationEdge {
  from: string; // interpretationId
  to: string; // interpretationId
  type: 'compatible' | 'conflicting' | 'neutral' | 'entails';
  strength: number; // 0-1
}
```

### 2.3 Collapse Protocol

When superposition collapses to single interpretation:

```typescript
interface CollapseEvent {
  /**
   * Which step collapsed?
   */
  stepId: string;

  /**
   * Which interpretation was chosen?
   */
  chosenInterpretation: string; // interpretationId

  /**
   * Why did it collapse?
   */
  collapseReason: CollapseReason;

  /**
   * What triggered collapse?
   */
  trigger: 'context' | 'user' | 'execution' | 'timeout' | 'conflict';

  /**
   * Confidence in collapse
   */
  confidence: number;

  /**
   * When did it collapse?
   */
  timestamp: number;

  /**
   * What were the alternatives?
   */
  alternatives: Interpretation[];
}

type CollapseReason =
  | { type: 'context_resolution'; context: string }
  | { type: 'user_choice'; userId: string; reasoning: string }
  | { type: 'execution_requirement'; neededFor: string }
  | { type: 'timeout_default'; defaultUsed: string }
  | { type: 'conflict_resolution'; conflictsWith: string[] }
  | { type: 'probability_threshold'; mostLikely: string };
```

---

## 3. Resolution Decision Tree

### 3.1 Decision Flow

```
                    ┌─────────────────────┐
                    │  Ambiguity Detected │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Can auto-resolve?   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
           ┌────▼─────┐                 ┌────▼─────┐
           │   YES    │                 │    NO    │
           └────┬─────┘                 └────┬─────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │ Try context resolution │     │ Creative or           │
    └───────────┬───────────┘     │ Deterministic?        │
                │                 └───────────┬───────────┘
        ┌───────┴───────┐                     │
        │               │         ┌───────────┴───────────┐
   ┌───▼───┐       ┌───▼───┐     │                       │
   │Resolved│     │Unresolved│ ┌───▼───┐           ┌────▼─────┐
   └───┬───┘       └───┬───┘ │Creative│           │Deterministic│
       │              │      └────┬───┘           └────┬─────┘
   ┌───▼───┐      ┌───▼───┐       │                    │
   │Collapse│     │Ask   │  ┌──────▼──────┐    ┌────────▼─────────┐
   │to chosen│     │User  │  │Keep ambiguity│    │Use deterministic│
   │interpretation│ │      │  │as superposition│  │rule to resolve │
   └────────┘     └──────┘  └──────┬───────┘    └─────────────────┘
                                │                     │
                        ┌───────▼────────┐   ┌───────▼────────┐
                        │Embrace as feature│   │Collapse to most│
                        │Multi-interpretation │ │likely or first│
                        └──────────────────┘   └────────────────┘
```

### 3.2 Decision Algorithm

```typescript
class AmbiguityResolver {
  /**
   * Decide how to resolve ambiguity
   */
  decideResolutionStrategy(
    step: AmbiguousReasoningStep,
    context: ResolutionContext
  ): ResolutionStrategy {

    // Check if auto-resolvable
    if (this.isAutoResolvable(step, context)) {
      return this.tryAutoResolution(step, context);
    }

    // Check if creative or deterministic
    const classification = this.classifyAmbiguityNature(step, context);

    if (classification === 'creative') {
      return 'creative_embrace';
    }

    if (classification === 'deterministic') {
      return 'deterministic_rule';
    }

    // Default: ask user
    return 'user_choice';
  }

  /**
   * Check if ambiguity can be auto-resolved
   */
  private isAutoResolvable(
    step: AmbiguousReasoningStep,
    context: ResolutionContext
  ): boolean {
    // Can context resolve it?
    if (this.hasDisambiguatingContext(step, context)) {
      return true;
    }

    // Is there a dominant interpretation?
    const maxProb = Math.max(...step.interpretations.map(i => i.probability));
    if (maxProb > 0.9) {
      return true;
    }

    // Is there a deterministic rule?
    if (this.hasDeterministicRule(step)) {
      return true;
    }

    return false;
  }

  /**
   * Try automatic resolution
   */
  private tryAutoResolution(
    step: AmbiguousReasoningStep,
    context: ResolutionContext
  ): ResolutionStrategy {

    // Try context-based
    if (this.hasDisambiguatingContext(step, context)) {
      return 'context_dependent';
    }

    // Use most likely
    const mostLikely = step.interpretations
      .sort((a, b) => b.probability - a.probability)[0];

    if (mostLikely.probability > 0.8) {
      return 'probabilistic';
    }

    // Defer to execution time
    return 'defer';
  }

  /**
   * Check if context provides disambiguation
   */
  private hasDisambiguatingContext(
    step: AmbiguousReasoningStep,
    context: ResolutionContext
  ): boolean {

    // Check surrounding steps
    const surroundingSteps = this.getSurroundingSteps(step, context);

    for (const interpretation of step.interpretations) {
      // Check if interpretation is compatible with context
      const compatible = surroundingSteps.every(surrounding =>
        this.areCompatible(interpretation, surrounding, context)
      );

      if (compatible && interpretation.probability > 0.7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classify ambiguity as creative or deterministic
   */
  private classifyAmbiguityNature(
    step: AmbiguousReasoningStep,
    context: ResolutionContext
  ): 'creative' | 'deterministic' | 'neither' {

    // Creative indicators
    const creativeSignals = [
      step.ambiguitySource.type === 'metaphorical',
      step.ambiguitySource.type === 'pragmatic',
      step.interpretations.length > 3,
      this.hasHighEntropy(step),
      this.inCreativeContext(step, context)
    ];

    // Deterministic indicators
    const deterministicSignals = [
      step.ambiguitySource.type === 'syntactic',
      step.ambiguitySource.type === 'scope',
      step.interpretations.length === 2,
      this.hasDeterministicRule(step),
      this.inTechnicalContext(step, context)
    ];

    const creativeScore = creativeSignals.filter(s => s).length;
    const deterministicScore = deterministicSignals.filter(s => s).length;

    if (creativeScore >= 2) return 'creative';
    if (deterministicScore >= 2) return 'deterministic';
    return 'neither';
  }

  /**
   * Check if interpretation is compatible with step
   */
  private areCompatible(
    interpretation: Interpretation,
    step: ReasoningStep,
    context: ResolutionContext
  ): boolean {

    // Check semantic consistency
    if (!this.isSemanticallyConsistent(interpretation, step)) {
      return false;
    }

    // Check dependency satisfaction
    if (!this.satisfiesDependencies(interpretation, step)) {
      return false;
    }

    // Check domain consistency
    if (!this.isDomainConsistent(interpretation, context)) {
      return false;
    }

    return true;
  }
}
```

---

## 4. Context-Dependent Disambiguation

### 4.1 Context Window

```typescript
interface DisambiguationContext {
  /**
   * Steps before the ambiguous step
   */
  precedingSteps: ReasoningStep[];

  /**
   * Steps after the ambiguous step
   */
  followingSteps: ReasoningStep[];

  /**
   * The current reasoning chain
   */
  reasoningChain: ReasoningChain;

  /**
   * User's intent/goal
   */
  userIntent: string;

  /**
   * Domain knowledge
   */
  domain: Domain;

  /**
   * Conversation history
   */
  conversationHistory: ConversationTurn[];

  /**
   * Active constraints
   */
  constraints: Constraint[];

  /**
   * Available context from other sources
   */
  externalContext: ExternalContext[];
}

interface ReasoningChain {
  steps: ReasoningStep[];
  dependencies: DependencyGraph;
  flow: 'linear' | 'branching' | 'converging' | 'cyclic';
  theme: string;
}

interface Domain {
  name: string;
  terminology: Map<string, string>; // term -> definition
  commonPatterns: Pattern[];
  constraints: DomainConstraint[];
}

interface Constraint {
  type: 'syntactic' | 'semantic' | 'pragmatic' | 'logical';
  description: string;
  enforcement: 'hard' | 'soft';
  confidence: number;
}
```

### 4.2 Disambiguation Algorithms

#### Algorithm 1: Semantic Consistency Check

```typescript
function semanticConsistencyDisambiguation(
  ambiguous: AmbiguousReasoningStep,
  context: DisambiguationContext
): Interpretation | null {

  const scores = ambiguous.interpretations.map(interpretation => {
    let consistencyScore = 0;

    // Check consistency with preceding steps
    for (const prev of context.precedingSteps) {
      const similarity = calculateSemanticSimilarity(
        interpretation.step,
        prev
      );
      consistencyScore += similarity * 0.3;
    }

    // Check consistency with following steps
    for (const next of context.followingSteps) {
      const similarity = calculateSemanticSimilarity(
        interpretation.step,
        next
      );
      consistencyScore += similarity * 0.4;
    }

    // Check consistency with domain
    const domainFit = calculateDomainFit(
      interpretation,
      context.domain
    );
    consistencyScore += domainFit * 0.2;

    // Check consistency with user intent
    const intentFit = calculateIntentFit(
      interpretation,
      context.userIntent
    );
    consistencyScore += intentFit * 0.1;

    return {
      interpretation,
      score: consistencyScore
    };
  });

  // Return highest scoring interpretation
  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0.7) {
    return scores[0].interpretation;
  }

  return null; // No clear winner
}

function calculateSemanticSimilarity(
  step1: Partial<ReasoningStep>,
  step2: ReasoningStep
): number {
  // Get embeddings
  const emb1 = embed(step1.summary || step1.rawText);
  const emb2 = embed(step2.summary || step2.rawText);

  // Cosine similarity
  return cosineSimilarity(emb1, emb2);
}

function calculateDomainFit(
  interpretation: Interpretation,
  domain: Domain
): number {

  // Check if interpretation uses domain terminology correctly
  let fit = 0;

  for (const [term, definition] of domain.terminology) {
    if (interpretation.step.rawText?.includes(term)) {
      // Check if usage matches domain definition
      if (interpretation.justification.includes definition)) {
        fit += 0.2;
      } else {
        fit -= 0.1; // Penalty for misuse
      }
    }
  }

  return Math.max(0, Math.min(1, fit));
}

function calculateIntentFit(
  interpretation: Interpretation,
  userIntent: string
): number {

  // Check if interpretation aligns with user's goal
  const intentEmbedding = embed(userIntent);
  const interpretationEmbedding = embed(interpretation.step.summary || '');

  return cosineSimilarity(intentEmbedding, interpretationEmbedding);
}
```

#### Algorithm 2: Dependency Satisfaction

```typescript
function dependencySatisfactionDisambiguation(
  ambiguous: AmbiguousReasoningStep,
  context: DisambiguationContext
): Interpretation | null {

  const scores = ambiguous.interpretations.map(interpretation => {
    let satisfiedCount = 0;
    let totalCount = 0;

    // Check each dependency
    for (const depId of interpretation.dependencies) {
      totalCount++;

      // Find the step this depends on
      const depStep = context.precedingSteps.find(s => s.id === depId);

      if (!depStep) continue;

      // Check if interpretation is compatible with dependency
      if (areInputsCompatible(interpretation.step, depStep)) {
        satisfiedCount++;
      }
    }

    return {
      interpretation,
      score: totalCount === 0 ? 0.5 : satisfiedCount / totalCount
    };
  });

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score >= 0.8) {
    return scores[0].interpretation;
  }

  return null;
}

function areInputsCompatible(
  interpretation: Partial<ReasoningStep>,
  dependency: ReasoningStep
): boolean {

  // Check if output types match input types
  const depOutput = extractOutputType(dependency);
  const interpInput = extractInputType(interpretation);

  return areTypesCompatible(depOutput, interpInput);
}
```

#### Algorithm 3: Pragmatic Inference

```typescript
function pragmaticDisambiguation(
  ambiguous: AmbiguousReasoningStep,
  context: DisambiguationContext
): Interpretation | null {

  // What is the user trying to accomplish?
  const goal = inferUserGoal(context);

  // Which interpretation best serves that goal?
  const scores = ambiguous.interpretations.map(interpretation => {

    // What would this interpretation accomplish?
    const effect = inferEffect(interpretation);

    // Does this align with goal?
    const alignment = calculateGoalAlignment(effect, goal);

    // Is this pragmatically appropriate?
    const appropriateness = calculatePragmaticAppropriateness(
      interpretation,
      context
    );

    return {
      interpretation,
      score: (alignment + appropriateness) / 2
    };
  });

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0.75) {
    return scores[0].interpretation;
  }

  return null;
}

function inferUserGoal(context: DisambiguationContext): string {
  // Use conversation history and current context
  // to infer what user is trying to do

  // Simple version: use most recent user message
  const userMessages = context.conversationHistory
    .filter(turn => turn.speaker === 'user');

  if (userMessages.length > 0) {
    return userMessages[userMessages.length - 1].intent;
  }

  // Fallback: use reasoning chain theme
  return context.reasoningChain.theme;
}

function inferEffect(interpretation: Interpretation): string {
  // What would happen if we follow this interpretation?

  // Use LLM to infer effect
  // Prompt: "What would be the effect of: {interpretation.step.summary}?"

  return interpretation.step.summary || '';
}

function calculateGoalAlignment(effect: string, goal: string): number {
  // How well does effect align with goal?

  const effectEmbedding = embed(effect);
  const goalEmbedding = embed(goal);

  return cosineSimilarity(effectEmbedding, goalEmbedding);
}

function calculatePragmaticAppropriateness(
  interpretation: Interpretation,
  context: DisambiguationContext
): number {

  // Is this interpretation pragmatically appropriate?

  // Check speech act compatibility
  const expectedSpeechAct = inferExpectedSpeechAct(context);
  const actualSpeechAct = detectSpeechAct(interpretation.step);

  if (expectedSpeechAct !== actualSpeechAct) {
    return 0.3; // Penalty for mismatch
  }

  // Check politeness/tone
  const expectedTone = inferExpectedTone(context);
  const actualTone = detectTone(interpretation.step);

  if (expectedTone !== actualTone) {
    return 0.5; // Smaller penalty for tone mismatch
  }

  return 1.0;
}
```

### 4.3 Context Accumulation

```typescript
class ContextAccumulator {
  private contextWindow: DisambiguationContext;

  /**
   * Add new step to context
   */
  addStep(step: ReasoningStep): void {
    // Update context with new information

    // Preceding steps grow
    this.contextWindow.precedingSteps.push(step);

    // Following steps shrink (if any)
    this.contextWindow.followingSteps =
      this.contextWindow.followingSteps.slice(1);

    // Update reasoning chain
    this.updateReasoningChain(step);

    // Infer user intent from new step
    this.updateUserIntent(step);
  }

  /**
   * Get disambiguation context for a step
   */
  getContextFor(step: ReasoningStep): DisambiguationContext {
    return {
      ...this.contextWindow,
      // Get 3 steps before and after
      precedingSteps: this.getPrecedingSteps(step, 3),
      followingSteps: this.getFollowingSteps(step, 3)
    };
  }

  /**
   * Check if context provides disambiguation
   */
  hasDisambiguatingContext(
    ambiguous: AmbiguousReasoningStep
  ): boolean {

    // Try each disambiguation algorithm
    const algorithms = [
      semanticConsistencyDisambiguation,
      dependencySatisfactionDisambiguation,
      pragmaticDisambiguation
    ];

    for (const algo of algorithms) {
      const result = algo(ambiguous, this.contextWindow);
      if (result) {
        return true;
      }
    }

    return false;
  }

  private updateReasoningChain(step: ReasoningStep): void {
    // Add step to reasoning chain
    this.contextWindow.reasoningChain.steps.push(step);

    // Update dependencies
    this.contextWindow.reasoningChain.dependencies.addNode(step);

    // Detect flow type
    this.contextWindow.reasoningChain.flow =
      this.detectFlowType(this.contextWindow.reasoningChain);
  }

  private updateUserIntent(step: ReasoningStep): void {
    // Infer intent from step
    const intent = this.inferIntentFromStep(step);

    // Update user intent (with some smoothing)
    const currentIntent = this.contextWindow.userIntent;
    const similarity = cosineSimilarity(
      embed(intent),
      embed(currentIntent)
    );

    if (similarity > 0.7) {
      // Similar, reinforce
      this.contextWindow.userIntent = intent;
    } else {
      // Different, blend
      this.contextWindow.userIntent =
        this.blendIntents(currentIntent, intent);
    }
  }
}
```

---

## 5. Creative vs Deterministic Classification

### 5.1 Classification Framework

```typescript
interface AmbiguityNatureClassifier {
  /**
   * Classify ambiguity as creative, deterministic, or neither
   */
  classify(
    step: AmbiguousReasoningStep,
    context: DisambiguationContext
  ): AmbiguityNature;
}

interface AmbiguityNature {
  type: 'creative' | 'deterministic' | 'uncertain';
  confidence: number;
  signals: Signal[];
  reasoning: string;
}

interface Signal {
  type: SignalType;
  present: boolean;
  strength: number; // 0-1
  description: string;
}

type SignalType =
  | 'multiple_valid_interpretations'
  | 'domain_specific'
  | 'technical_precision'
  | 'metaphorical_language'
  | 'user_intent_clarity'
  | 'contextual_constraints'
  | 'syntactic_structure'
  | 'pragmatic_function'
  | 'entropy_level'
  | 'interpretation_balance';
```

### 5.2 Creative Ambiguity Detection

**Creative ambiguity:** Multiple interpretations are valid and valuable. Ambiguity is a feature, not a bug.

```typescript
function detectCreativeAmbiguity(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): number { // Returns creativity score 0-1

  let creativityScore = 0;

  // Signal 1: Multiple valid interpretations
  if (step.interpretations.length >= 3) {
    const validCount = step.interpretations.filter(i =>
      i.probability > 0.2
    ).length;

    if (validCount >= 3) {
      creativityScore += 0.25;
    }
  }

  // Signal 2: Balanced probabilities
  const probs = step.interpretations.map(i => i.probability);
  const entropy = calculateEntropy(probs);
  const maxEntropy = Math.log(probs.length);
  const normalizedEntropy = entropy / maxEntropy;

  if (normalizedEntropy > 0.7) {
    creativityScore += 0.20; // High entropy = creative ambiguity
  }

  // Signal 3: Metaphorical or pragmatic ambiguity
  if (step.ambiguitySource.type === 'metaphorical' ||
      step.ambiguitySource.type === 'pragmatic') {
    creativityScore += 0.20;
  }

  // Signal 4: No clear "correct" answer
  const maxProb = Math.max(...probs);
  if (maxProb < 0.6) {
    creativityScore += 0.15; // No dominant interpretation
  }

  // Signal 5: Creative domain
  const creativeDomains = [
    'creative_writing',
    'brainstorming',
    'ideation',
    'design',
    'art',
    'marketing'
  ];

  if (creativeDomains.includes(context.domain.name)) {
    creativityScore += 0.10;
  }

  // Signal 6: User benefits from multiple options
  if (userBenefitsFromExploration(step, context)) {
    creativityScore += 0.10;
  }

  return Math.min(1, creativityScore);
}

function calculateEntropy(probabilities: number[]): number {
  // Shannon entropy
  return -probabilities.reduce((sum, p) => {
    if (p === 0) return sum;
    return sum + p * Math.log2(p);
  }, 0);
}

function userBenefitsFromExploration(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): boolean {

  // Check if user is in exploratory mode
  const exploratoryIntents = [
    'explore_options',
    'brainstorm',
    'generate_alternatives',
    'compare_approaches',
    'creative_thinking'
  ];

  return exploratoryIntents.some(intent =>
    context.userIntent.includes(intent)
  );
}
```

### 5.3 Deterministic Ambiguity Detection

**Deterministic ambiguity:** There IS a correct answer, we just need to find it. Ambiguity should be resolved.

```typescript
function detectDeterministicAmbiguity(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): number { // Returns determinism score 0-1

  let determinismScore = 0;

  // Signal 1: Syntactic or scope ambiguity
  if (step.ambiguitySource.type === 'syntactic' ||
      step.ambiguitySource.type === 'scope') {
    determinismScore += 0.25;
  }

  // Signal 2: Clear dominant interpretation
  const probs = step.interpretations.map(i => i.probability);
  const maxProb = Math.max(...probs);

  if (maxProb > 0.8) {
    determinismScore += 0.20;
  }

  // Signal 3: Low entropy (clear winner)
  const entropy = calculateEntropy(probs);
  const maxEntropy = Math.log(probs.length);
  const normalizedEntropy = entropy / maxEntropy;

  if (normalizedEntropy < 0.3) {
    determinismScore += 0.20;
  }

  // Signal 4: Technical/precise domain
  const technicalDomains = [
    'programming',
    'mathematics',
    'engineering',
    'science',
    'database',
    'api'
  ];

  if (technicalDomains.includes(context.domain.name)) {
    determinismScore + 0.15;
  }

  // Signal 5: Deterministic rule exists
  if (hasDeterministicRule(step)) {
    determinismScore += 0.15;
  }

  // Signal 6: User needs precise answer
  if (userNeedsPrecision(step, context)) {
    determinismScore += 0.05;
  }

  return Math.min(1, determinismScore);
}

function hasDeterministicRule(
  step: AmbiguousReasoningStep
): boolean {

  // Check for known deterministic patterns

  // Pattern 1: Operator precedence
  if (step.ambiguitySource.type === 'syntactic') {
    const code = step.rawText;
    if (/and|or|not|&&|\|\|/i.test(code)) {
      return true; // Can resolve with precedence rules
    }
  }

  // Pattern 2: Type-based resolution
  if (step.ambiguitySource.type === 'lexical') {
    const types = step.interpretations.map(i =>
      extractType(i.step)
    );
    // If all but one have type mismatches, resolve to matching one
    const validTypes = types.filter(t => t !== null);
    if (validTypes.length === 1) {
      return true;
    }
  }

  // Pattern 3: Database schema resolution
  if (step.ambiguitySource.type === 'referential') {
    // Can resolve with schema info
    return true;
  }

  return false;
}

function userNeedsPrecision(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): boolean {

  // Check if user is in precision-focused mode
  const precisionIntents = [
    'debug',
    'fix_error',
    'implement',
    'calculate',
    'verify',
    'test'
  ];

  return precisionIntents.some(intent =>
    context.userIntent.includes(intent)
  );
}
```

### 5.4 Classification Decision

```typescript
function classifyAmbiguityNature(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): AmbiguityNature {

  const creativeScore = detectCreativeAmbiguity(step, context);
  const deterministicScore = detectDeterministicAmbiguity(step, context);

  const signals: Signal[] = [
    {
      type: 'multiple_valid_interpretations',
      present: step.interpretations.length >= 3,
      strength: step.interpretations.length / 5,
      description: `${step.interpretations.length} interpretations found`
    },
    {
      type: 'entropy_level',
      present: true,
      strength: calculateEntropy(step.interpretations.map(i => i.probability)),
      description: 'Entropy of interpretation distribution'
    },
    {
      type: 'domain_specific',
      present: context.domain.name !== 'general',
      strength: 0.5,
      description: `Domain: ${context.domain.name}`
    }
  ];

  // Decide classification
  let type: 'creative' | 'deterministic' | 'uncertain';
  let confidence: number;
  let reasoning: string;

  if (creativeScore > 0.6 && creativeScore > deterministicScore) {
    type = 'creative';
    confidence = creativeScore;
    reasoning = `Ambiguity appears creative (score: ${creativeScore.toFixed(2)}). Multiple valid interpretations exist with balanced probabilities. User may benefit from exploring alternatives.`;
  } else if (deterministicScore > 0.6 && deterministicScore > creativeScore) {
    type = 'deterministic';
    confidence = deterministicScore;
    reasoning = `Ambiguity appears deterministic (score: ${deterministicScore.toFixed(2)}). A correct interpretation likely exists and should be resolved.`;
  } else {
    type = 'uncertain';
    confidence = Math.max(creativeScore, deterministicScore) * 0.7;
    reasoning = `Ambiguity nature is unclear. Creative: ${creativeScore.toFixed(2)}, Deterministic: ${deterministicScore.toFixed(2)}. Further context or user input needed.`;
  }

  return {
    type,
    confidence,
    signals,
    reasoning
  };
}
```

---

## 6. User-in-the-Loop Resolution

### 6.1 When to Consult User

```typescript
interface UserConsultationTrigger {
  /**
   * Should we ask the user?
   */
  shouldConsult: boolean;

  /**
   * Why or why not?
   */
  reasoning: string;

  /**
   * If yes, how should we ask?
   */
  consultationMethod?: ConsultationMethod;

  /**
   * Priority (if asking)
   */
  priority?: 'immediate' | 'eventual' | 'background';
}

function shouldConsultUser(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): UserConsultationTrigger {

  // Always consult if:

  // 1. Ambiguity blocks execution
  if (blocksExecution(step, context)) {
    return {
      shouldConsult: true,
      reasoning: 'Ambiguity prevents forward progress. User input required.',
      consultationMethod: {
        type: 'explicit_choice',
        urgency: 'high',
        options: step.interpretations.map(i => ({
          id: i.id,
          label: i.step.summary || i.step.rawText.substring(0, 50),
          description: i.justification,
          probability: i.probability
        }))
      },
      priority: 'immediate'
    };
  }

  // 2. High-value decision
  if (isHighValueDecision(step, context)) {
    return {
      shouldConsult: true,
      reasoning: 'This is a high-value decision. User should choose.',
      consultationMethod: {
        type: 'guided_choice',
        urgency: 'medium',
        options: step.interpretations.map(i => ({
          id: i.id,
          label: generateLabel(i, context),
          description: generateDescription(i, context),
          implications: generateImplications(i, context),
          probability: i.probability
        }))
      },
      priority: 'eventual'
    };
  }

  // 3. Creative ambiguity in exploratory context
  const nature = classifyAmbiguityNature(step, context);
  if (nature.type === 'creative' &&
      userBenefitsFromExploration(step, context)) {
    return {
      shouldConsult: true,
      reasoning: 'Creative ambiguity detected. User may want to explore alternatives.',
      consultationMethod: {
        type: 'exploratory',
        urgency: 'low',
        options: step.interpretations.map(i => ({
          id: i.id,
          label: i.step.summary || i.step.rawText.substring(0, 50),
          description: i.justification,
          preview: generatePreview(i, context)
        }))
      },
      priority: 'background'
    };
  }

  // 4. User has requested consultation
  if (context.userIntent.includes('clarify') ||
      context.userIntent.includes('choose') ||
      context.userIntent.includes('decide')) {
    return {
      shouldConsult: true,
      reasoning: 'User explicitly requested clarification.',
      consultationMethod: {
        type: 'explicit_choice',
        urgency: 'medium',
        options: step.interpretations.map(i => ({
          id: i.id,
          label: i.step.summary || i.step.rawText.substring(0, 50),
          description: i.justification,
          probability: i.probability
        }))
      },
      priority: 'eventual'
    };
  }

  // Don't consult if:

  // 5. Low-impact decision
  if (isLowImpact(step, context)) {
    return {
      shouldConsult: false,
      reasoning: 'Low-impact decision. System can choose.'
    };
  }

  // 6. Clear dominant interpretation
  const maxProb = Math.max(...step.interpretations.map(i => i.probability));
  if (maxProb > 0.9) {
    return {
      shouldConsult: false,
      reasoning: `Clear interpretation exists (${(maxProb * 100).toFixed(0)}% confidence). User consultation not needed.`
    };
  }

  // 7. User prefers autonomy
  if (userPrefersAutonomy(context)) {
    return {
      shouldConsult: false,
      reasoning: 'User prefers autonomous decisions. System will resolve.'
    };
  }

  // Default: don't consult
  return {
    shouldConsult: false,
    reasoning: 'Ambiguity can be resolved automatically.'
  };
}

function blocksExecution(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): boolean {

  // Check if ambiguity prevents next steps from executing

  for (const next of context.followingSteps) {
    // Does next step depend on this one?
    if (next.dependsOn.includes(step.id)) {

      // Can next step execute without knowing which interpretation?
      const inputs = extractInputTypes(next);

      // Check if any interpretation satisfies inputs
      const satisfied = step.interpretations.some(interp =>
        areTypesCompatible(extractOutputType(interp.step), inputs)
      );

      if (!satisfied) {
        return true; // Blocks execution
      }
    }
  }

  return false;
}

function isHighValueDecision(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): boolean {

  // High-value indicators

  // Affects many downstream steps
  const downstreamCount = countDownstreamDependencies(step, context);
  if (downstreamCount > 5) {
    return true;
  }

  // Related to core functionality
  const coreKeywords = [
    'authentication',
    'authorization',
    'payment',
    'security',
    'data_integrity',
    'user_safety'
  ];

  if (coreKeywords.some(kw =>
    step.rawText.toLowerCase().includes(kw)
  )) {
    return true;
  }

  // User marked as important
  if (step.metadata?.important === true) {
    return true;
  }

  return false;
}

function isLowImpact(
  step: AmbiguousReasoningStep,
  context: DisambiguationContext
): boolean {

  // Low-impact indicators

  // Affects few or no downstream steps
  const downstreamCount = countDownstreamDependencies(step, context);
  if (downstreamCount === 0) {
    return true;
  }

  // Cosmetic or minor functionality
  const cosmeticKeywords = [
    'formatting',
    'styling',
    'spacing',
    'color',
    'font',
    'display'
  ];

  if (cosmeticKeywords.some(kw =>
    step.rawText.toLowerCase().includes(kw)
  )) {
    return true;
  }

  // Can be easily reversed
  if (step.metadata?.reversible === true) {
    return true;
  }

  return false;
}

function userPrefersAutonomy(context: DisambiguationContext): boolean {

  // Check user settings/preferences
  // For now, check intent
  const autonomousIntents = [
    'auto',
    'automatic',
    'you_decide',
    'your_choice'
  ];

  return autonomousIntents.some(intent =>
    context.userIntent.includes(intent)
  );
}
```

### 6.2 Consultation Methods

```typescript
type ConsultationMethod =
  | ExplicitChoiceMethod
  | GuidedChoiceMethod
  | ExploratoryMethod
  | DeferredMethod;

interface ExplicitChoiceMethod {
  type: 'explicit_choice';
  urgency: 'low' | 'medium' | 'high';
  options: InterpretationOption[];
  default?: string; // interpretationId
  allowMultiple?: boolean;
}

interface GuidedChoiceMethod {
  type: 'guided_choice';
  urgency: 'low' | 'medium' | 'high';
  options: GuidedInterpretationOption[];
  recommendation?: {
    interpretationId: string;
    reasoning: string;
  };
}

interface ExploratoryMethod {
  type: 'exploratory';
  urgency: 'low' | 'medium' | 'high';
  options: ExploratoryOption[];
  allowParallel?: boolean;
  allowComparison?: boolean;
}

interface InterpretationOption {
  id: string;
  label: string;
  description: string;
  probability: number;
}

interface GuidedInterpretationOption extends InterpretationOption {
  implications: Implication[];
  pros: string[];
  cons: string[];
  examples: Example[];
}

interface ExploratoryOption extends InterpretationOption {
  preview: string;
  outcomePreview: string;
  relatedSteps: string[];
}

interface Implication {
  description: string;
  affectedSteps: string[];
  confidence: number;
}

interface Example {
  input: string;
  output: string;
  explanation: string;
}
```

### 6.3 UI Presentation

```typescript
interface AmbiguityPresentation {
  /**
   * Render ambiguity to user
   */
  render(step: AmbiguousReasoningStep): Presentation;
}

interface Presentation {
  /**
   * Main display
   */
  display: {
    title: string;
    subtitle: string;
    description: string;
  };

  /**
   * Visual representation
   */
  visual: {
    type: 'cards' | 'list' | 'tree' | 'graph';
    layout: Layout;
  };

  /**
   * Interpretations to display
   */
  interpretations: InterpretationPresentation[];

  /**
   * User actions available
   */
  actions: UserAction[];

  /**
   * Additional context
   */
  context: {
    precedingSteps: string[];
    followingSteps: string[];
    domain: string;
  };
}

interface InterpretationPresentation {
  id: string;
  label: string;
  description: string;
  probability: number;
  evidence: Evidence[];
  implications: string[];
  preview?: string;
  selected: boolean;
}

interface UserAction {
  type: 'select' | 'compare' | 'explore' | 'defer' | 'ask_question';
  label: string;
  description: string;
  icon?: string;
  primary?: boolean;
}

// Example UI for explicit choice
function renderExplicitChoice(
  step: AmbiguousReasoningStep
): Presentation {

  return {
    display: {
      title: 'Multiple Interpretations Detected',
      subtitle: `${step.interpretations.length} ways to understand this step`,
      description: step.rawText
    },
    visual: {
      type: 'cards',
      layout: 'horizontal'
    },
    interpretations: step.interpretations.map(interp => ({
      id: interp.id,
      label: interp.step.summary || interp.step.rawText.substring(0, 50),
      description: interp.justification,
      probability: interp.probability,
      evidence: interp.evidence,
      implications: generateImplications(interp),
      selected: false
    })),
    actions: [
      {
        type: 'select',
        label: 'Choose Interpretation',
        description: 'Select the intended meaning',
        primary: true
      },
      {
        type: 'compare',
        label: 'Compare Options',
        description: 'See detailed comparison'
      },
      {
        type: 'defer',
        label: 'Decide Later',
        description: 'Continue and revisit when needed'
      }
    ],
    context: {
      precedingSteps: getPrecedingStepSummaries(step),
      followingSteps: getFollowingStepSummaries(step),
      domain: 'technical'
    }
  };
}
```

### 6.4 User Response Handling

```typescript
interface UserResponseHandler {
  /**
   * Handle user's resolution choice
   */
  handleResponse(
    step: AmbiguousReasoningStep,
    response: UserResolutionResponse
  ): CollapseEvent;
}

interface UserResolutionResponse {
  type: 'choice' | 'defer' | 'question' | 'parallel';
  chosenInterpretation?: string; // interpretationId
  reasoning?: string;
  confidence?: number;
  persist?: boolean;
  additionalQuestions?: string[];
}

function handleUserResponse(
  step: AmbiguousReasoningStep,
  response: UserResolutionResponse
): CollapseEvent {

  if (response.type === 'choice' && response.chosenInterpretation) {

    // User made a choice
    const chosen = step.interpretations.find(
      i => i.id === response.chosenInterpretation
    );

    if (!chosen) {
      throw new Error('Invalid interpretation choice');
    }

    // Record user's choice
    const userChoice: UserResolution = {
      chosenInterpretation: response.chosenInterpretation,
      timestamp: Date.now(),
      reasoning: response.reasoning,
      confidence: response.confidence || 0.8,
      persist: response.persist !== false
    };

    // Return collapse event
    return {
      stepId: step.id,
      chosenInterpretation: response.chosenInterpretation,
      collapseReason: {
        type: 'user_choice',
        userId: 'current-user',
        reasoning: response.reasoning || 'User selected this interpretation'
      },
      trigger: 'user',
      confidence: response.confidence || 0.8,
      timestamp: Date.now(),
      alternatives: step.interpretations.filter(
        i => i.id !== response.chosenInterpretation
      )
    };
  }

  if (response.type === 'defer') {

    // User wants to decide later
    return {
      stepId: step.id,
      chosenInterpretation: '', // Empty = not collapsed yet
      collapseReason: {
        type: 'timeout_default',
        defaultUsed: ''
      },
      trigger: 'timeout',
      confidence: 0,
      timestamp: Date.now(),
      alternatives: step.interpretations
    };
  }

  if (response.type === 'question') {

    // User has questions - escalate to human
    throw new Error('Escalated to human: ' + response.additionalQuestions?.join(', '));
  }

  if (response.type === 'parallel') {

    // User wants to explore all interpretations
    // Keep in superposition
    return {
      stepId: step.id,
      chosenInterpretation: '', // Empty = superposition maintained
      collapseReason: {
        type: 'timeout_default',
        defaultUsed: ''
      },
      trigger: 'user',
      confidence: 0,
      timestamp: Date.now(),
      alternatives: step.interpretations
    };
  }

  throw new Error('Invalid response type');
}
```

---

## 7. TypeScript Interfaces

### 7.1 Complete Type Definitions

```typescript
// ============================================================================
// Core Types
// ============================================================================

/**
 * An ambiguous reasoning step that exists in superposition
 */
export interface AmbiguousReasoningStep extends ReasoningStep {
  /**
   * Is this step currently in superposition?
   */
  isInSuperposition: boolean;

  /**
   * All valid interpretations
   */
  interpretations: Interpretation[];

  /**
   * Currently active interpretation (if collapsed)
   */
  activeInterpretation?: string;

  /**
   * Source of ambiguity
   */
  ambiguitySource: AmbiguitySource;

  /**
   * How should we resolve this?
   */
  resolutionStrategy: ResolutionStrategy;

  /**
   * Have we consulted the user?
   */
  userConsulted: boolean;

  /**
   * User's resolution choice (if consulted)
   */
  userChoice?: UserResolution;

  /**
   * Collapse event (if collapsed)
   */
  collapseEvent?: CollapseEvent;
}

/**
 * Single interpretation of an ambiguous step
 */
export interface Interpretation {
  /**
   * Unique ID
   */
  id: string;

  /**
   * The interpreted step
   */
  step: Partial<ReasoningStep>;

  /**
   * Probability/likelihood
   */
  probability: number;

  /**
   * Why is this interpretation valid?
   */
  justification: string;

  /**
   * Supporting evidence
   */
  evidence: Evidence[];

  /**
   * Conflicts with other interpretations?
   */
  conflicts: string[];

  /**
   * Dependencies specific to this interpretation
   */
  dependencies: string[];

  /**
   * Generation metadata
   */
  metadata: InterpretationMetadata;
}

/**
 * Evidence supporting an interpretation
 */
export interface Evidence {
  type: 'syntactic' | 'semantic' | 'contextual' | 'pragmatic' | 'domain';
  description: string;
  strength: number;
  source: string;
}

/**
 * Interpretation metadata
 */
export interface InterpretationMetadata {
  source: 'llm' | 'pattern' | 'user' | 'context';
  confidence: number;
  timestamp: number;
  model?: string;
}

/**
 * Source of ambiguity
 */
export interface AmbiguitySource {
  type: AmbiguityType;
  location: {
    charOffset: { start: number; end: number };
    wordRange?: [number, number];
  };
  cause: string;
  interpretationCount: number;
  autoResolvable: boolean;
}

/**
 * Ambiguity types (12+ types)
 */
export type AmbiguityType =
  | 'lexical'           // Word has multiple meanings
  | 'syntactic'         // Multiple parse trees
  | 'semantic'          // Unclear meaning
  | 'pragmatic'         // Context-dependent intent
  | 'referential'       // Unclear reference
  | 'scope'             // Unclear operator scope
  | 'temporal'          // Unclear temporal relationship
  | 'anaphoric'         // Unclear backward reference
  | 'categorical'       // Unclear category
  | 'causal'            // Unclear causality
  | 'intentional'       // Unclear intent
  | 'metaphorical';     // Literal vs figurative

/**
 * Resolution strategy
 */
export type ResolutionStrategy =
  | 'context_dependent'    // Use surrounding cells
  | 'user_choice'          // Ask user
  | 'probabilistic'        // Use most likely
  | 'parallel_explore'     // Try all
  | 'defer'                // Decide later
  | 'creative_embrace'     // Keep as feature
  | 'deterministic_rule';  // Apply rule

/**
 * User's resolution choice
 */
export interface UserResolution {
  chosenInterpretation: string;
  timestamp: number;
  reasoning?: string;
  confidence: number;
  persist: boolean;
}

/**
 * Collapse event
 */
export interface CollapseEvent {
  stepId: string;
  chosenInterpretation: string;
  collapseReason: CollapseReason;
  trigger: 'context' | 'user' | 'execution' | 'timeout' | 'conflict';
  confidence: number;
  timestamp: number;
  alternatives: Interpretation[];
}

/**
 * Why did superposition collapse?
 */
export type CollapseReason =
  | { type: 'context_resolution'; context: string }
  | { type: 'user_choice'; userId: string; reasoning: string }
  | { type: 'execution_requirement'; neededFor: string }
  | { type: 'timeout_default'; defaultUsed: string }
  | { type: 'conflict_resolution'; conflictsWith: string[] }
  | { type: 'probability_threshold'; mostLikely: string };

// ============================================================================
// Ambiguity Detection
// ============================================================================

/**
 * Ambiguity detector
 */
export interface AmbiguityDetector {
  /**
   * Detect ambiguity in a reasoning step
   */
  detect(step: ReasoningStep): AmbiguityDetectionResult;
}

/**
 * Ambiguity detection result
 */
export interface AmbiguityDetectionResult {
  /**
   * Is this step ambiguous?
   */
  isAmbiguous: boolean;

  /**
   * What type of ambiguity?
   */
  ambiguityType?: AmbiguityType;

  /**
   * Where is the ambiguity?
   */
  location?: {
    charOffset: { start: number; end: number };
  };

  /**
   * Confidence in detection
   */
  confidence: number;

  /**
   * Should we create multi-interpretation step?
   */
  shouldCreateSuperposition: boolean;

  /**
   * Interpretations (if creating superposition)
   */
  interpretations?: Interpretation[];
}

// ============================================================================
// Context & Disambiguation
// ============================================================================

/**
 * Context for disambiguation
 */
export interface DisambiguationContext {
  precedingSteps: ReasoningStep[];
  followingSteps: ReasoningStep[];
  reasoningChain: ReasoningChain;
  userIntent: string;
  domain: Domain;
  conversationHistory: ConversationTurn[];
  constraints: Constraint[];
  externalContext: ExternalContext[];
}

/**
 * Reasoning chain
 */
export interface ReasoningChain {
  steps: ReasoningStep[];
  dependencies: DependencyGraph;
  flow: 'linear' | 'branching' | 'converging' | 'cyclic';
  theme: string;
}

/**
 * Domain knowledge
 */
export interface Domain {
  name: string;
  terminology: Map<string, string>;
  commonPatterns: Pattern[];
  constraints: DomainConstraint[];
}

/**
 * Constraint
 */
export interface Constraint {
  type: 'syntactic' | 'semantic' | 'pragmatic' | 'logical';
  description: string;
  enforcement: 'hard' | 'soft';
  confidence: number;
}

/**
 * Conversation turn
 */
export interface ConversationTurn {
  speaker: 'user' | 'system';
  message: string;
  intent?: string;
  timestamp: number;
}

/**
 * External context
 */
export interface ExternalContext {
  type: 'document' | 'database' | 'api' | 'knowledge_base';
  content: string;
  confidence: number;
}

// ============================================================================
// Classification
// ============================================================================

/**
 * Ambiguity nature classification
 */
export interface AmbiguityNature {
  type: 'creative' | 'deterministic' | 'uncertain';
  confidence: number;
  signals: Signal[];
  reasoning: string;
}

/**
 * Classification signal
 */
export interface Signal {
  type: SignalType;
  present: boolean;
  strength: number;
  description: string;
}

/**
 * Signal types
 */
export type SignalType =
  | 'multiple_valid_interpretations'
  | 'domain_specific'
  | 'technical_precision'
  | 'metaphorical_language'
  | 'user_intent_clarity'
  | 'contextual_constraints'
  | 'syntactic_structure'
  | 'pragmatic_function'
  | 'entropy_level'
  | 'interpretation_balance';

// ============================================================================
// User Consultation
// ============================================================================

/**
 * User consultation trigger
 */
export interface UserConsultationTrigger {
  shouldConsult: boolean;
  reasoning: string;
  consultationMethod?: ConsultationMethod;
  priority?: 'immediate' | 'eventual' | 'background';
}

/**
 * Consultation method
 */
export type ConsultationMethod =
  | ExplicitChoiceMethod
  | GuidedChoiceMethod
  | ExploratoryMethod;

/**
 * Explicit choice method
 */
export interface ExplicitChoiceMethod {
  type: 'explicit_choice';
  urgency: 'low' | 'medium' | 'high';
  options: InterpretationOption[];
  default?: string;
  allowMultiple?: boolean;
}

/**
 * Guided choice method
 */
export interface GuidedChoiceMethod {
  type: 'guided_choice';
  urgency: 'low' | 'medium' | 'high';
  options: GuidedInterpretationOption[];
  recommendation?: {
    interpretationId: string;
    reasoning: string;
  };
}

/**
 * Exploratory method
 */
export interface ExploratoryMethod {
  type: 'exploratory';
  urgency: 'low' | 'medium' | 'high';
  options: ExploratoryOption[];
  allowParallel?: boolean;
  allowComparison?: boolean;
}

/**
 * Interpretation option
 */
export interface InterpretationOption {
  id: string;
  label: string;
  description: string;
  probability: number;
}

/**
 * Guided interpretation option
 */
export interface GuidedInterpretationOption extends InterpretationOption {
  implications: Implication[];
  pros: string[];
  cons: string[];
  examples: Example[];
}

/**
 * Exploratory option
 */
export interface ExploratoryOption extends InterpretationOption {
  preview: string;
  outcomePreview: string;
  relatedSteps: string[];
}

/**
 * Implication
 */
export interface Implication {
  description: string;
  affectedSteps: string[];
  confidence: number;
}

/**
 * Example
 */
export interface Example {
  input: string;
  output: string;
  explanation: string;
}

/**
 * User response
 */
export interface UserResolutionResponse {
  type: 'choice' | 'defer' | 'question' | 'parallel';
  chosenInterpretation?: string;
  reasoning?: string;
  confidence?: number;
  persist?: boolean;
  additionalQuestions?: string[];
}

// ============================================================================
// Ambiguity Graph
// ============================================================================

/**
 * Graph of interpretation relationships
 */
export interface AmbiguityGraph {
  nodes: InterpretationNode[];
  edges: InterpretationEdge[];

  findCompatible(
    nodeId: string,
    constraints: CompatibilityConstraint[]
  ): InterpretationNode[];

  findConflicts(nodeId: string): InterpretationNode[];
}

/**
 * Interpretation node
 */
export interface InterpretationNode {
  id: string;
  interpretation: Interpretation;
  compatibleWith: string[];
  conflictsWith: string[];
}

/**
 * Interpretation edge
 */
export interface InterpretationEdge {
  from: string;
  to: string;
  type: 'compatible' | 'conflicting' | 'neutral' | 'entails';
  strength: number;
}

/**
 * Compatibility constraint
 */
export interface CompatibilityConstraint {
  type: 'semantic' | 'syntactic' | 'dependency' | 'domain';
  constraint: string;
  required: boolean;
}
```

---

## 8. Integration with Confidence Scoring

### 8.1 Ambiguity-Aware Confidence

```typescript
interface AmbiguityAwareConfidence extends ConfidenceScore {
  // Inherit all ConfidenceScore fields

  /**
   * Ambiguity-specific dimensions
   */
  ambiguity: {
    /**
     * How ambiguous is this step?
     */
    ambiguityLevel: number; // 0-1

    /**
     * How confident are we in each interpretation?
     */
    interpretationConfidence: Map<string, number>; // interpretationId -> confidence

    /**
     * How resolvable is the ambiguity?
     */
    resolvability: number; // 0-1

    /**
     * Have we resolved it?
     */
    resolved: boolean;

    /**
     * How did we resolve it?
     */
    resolutionMethod?: ResolutionStrategy;

    /**
     * Confidence in the resolution
     */
    resolutionConfidence: number;
  };

  /**
   * Impact on overall confidence
   */
  ambiguityImpact: {
    /**
     * How much does ambiguity reduce confidence?
     */
    penalty: number;

    /**
     * Why?
     */
    reason: string;
  };
}

function calculateAmbiguityAwareConfidence(
  step: AmbiguousReasoningStep,
  baseConfidence: ConfidenceScore
): AmbiguityAwareConfidence {

  // Calculate ambiguity level
  const ambiguityLevel = calculateAmbiguityLevel(step);

  // Calculate interpretation confidence
  const interpretationConfidence = new Map<string, number>();
  for (const interp of step.interpretations) {
    interpretationConfidence.set(interp.id, interp.probability);
  }

  // Calculate resolvability
  const resolvability = calculateResolvability(step);

  // Calculate resolution confidence
  const resolutionConfidence = step.collapseEvent
    ? step.collapseEvent.confidence
    : 0;

  // Calculate penalty
  const penalty = calculateAmbiguityPenalty(step, ambiguityLevel);

  // Adjust overall confidence
  const adjustedOverall = Math.max(
    0,
    baseConfidence.overall - penalty
  );

  return {
    ...baseConfidence,
    overall: adjustedOverall,

    ambiguity: {
      ambiguityLevel,
      interpretationConfidence,
      resolvability,
      resolved: !step.isInSuperposition,
      resolutionMethod: step.resolutionStrategy,
      resolutionConfidence
    },

    ambiguityImpact: {
      penalty,
      reason: generatePenaltyReason(step, ambiguityLevel)
    }
  };
}

function calculateAmbiguityLevel(
  step: AmbiguousReasoningStep
): number {

  // Entropy-based ambiguity level
  const probs = step.interpretations.map(i => i.probability);
  const entropy = calculateEntropy(probs);
  const maxEntropy = Math.log(probs.length);
  const normalizedEntropy = entropy / maxEntropy;

  // Adjust for number of interpretations
  const countFactor = Math.min(1, step.interpretations.length / 5);

  return (normalizedEntropy + countFactor) / 2;
}

function calculateResolvability(
  step: AmbiguousReasoningStep
): number {

  let resolvability = 0;

  // Can context resolve it?
  if (step.resolutionStrategy === 'context_dependent') {
    resolvability += 0.3;
  }

  // Is there a clear winner?
  const maxProb = Math.max(...step.interpretations.map(i => i.probability));
  if (maxProb > 0.8) {
    resolvability += 0.3;
  }

  // Is there a deterministic rule?
  if (step.resolutionStrategy === 'deterministic_rule') {
    resolvability += 0.4;
  }

  // Can user resolve it?
  if (step.resolutionStrategy === 'user_choice') {
    resolvability += 0.2; // Partially resolvable
  }

  return Math.min(1, resolvability);
}

function calculateAmbiguityPenalty(
  step: AmbiguousReasoningStep,
  ambiguityLevel: number
): number {

  // Base penalty from ambiguity level
  let penalty = ambiguityLevel * 0.3;

  // Additional penalty if unresolved
  if (step.isInSuperposition) {
    penalty += 0.2;
  }

  // Reduce penalty if highly resolvable
  const resolvability = calculateResolvability(step);
  penalty *= (1 - resolvability * 0.5);

  return penalty;
}

function generatePenaltyReason(
  step: AmbiguousReasoningStep,
  ambiguityLevel: number
): string {

  const reasons: string[] = [];

  if (ambiguityLevel > 0.7) {
    reasons.push('High ambiguity detected');
  }

  if (step.isInSuperposition) {
    reasons.push('Multiple interpretations remain active');
  }

  if (step.interpretations.length > 3) {
    reasons.push('Many possible interpretations');
  }

  const maxProb = Math.max(...step.interpretations.map(i => i.probability));
  if (maxProb < 0.5) {
    reasons.push('No clear dominant interpretation');
  }

  return reasons.join('; ');
}
```

### 8.2 Confidence Thresholds with Ambiguity

```typescript
interface AmbiguityAwareThresholdAction extends ThresholdAction {
  /**
   * Ambiguity-specific actions
   */
  ambiguityActions?: {
    /**
     * Should we ask user to resolve?
     */
    consultUser?: boolean;

    /**
     * Should we explore in parallel?
     */
    parallelExplore?: boolean;

    /**
     * Should we maintain superposition?
     */
    maintainSuperposition?: boolean;

    /**
     * Message to user about ambiguity
     */
    userMessage?: string;
  };
}

function getAmbiguityAwareThresholdAction(
  confidence: AmbiguityAwareConfidence
): AmbiguityAwareThresholdAction {

  // Get base action
  const baseAction = getThresholdAction(confidence.overall);

  // Add ambiguity-specific actions
  const ambiguityActions: AmbiguityAwareThresholdAction['ambiguityActions'] = {};

  // High ambiguity + low confidence = consult user
  if (confidence.ambiguity.ambiguityLevel > 0.7 &&
      confidence.overall < 0.7) {
    ambiguityActions.consultUser = true;
    ambiguityActions.userMessage =
      `This step has ${confidence.ambiguity.ambiguityLevel > 0.8 ? 'high' : 'moderate'} ambiguity. Please help clarify the intended meaning.`;
  }

  // High resolvability + moderate confidence = try auto-resolution
  if (confidence.ambiguity.resolvability > 0.7 &&
      confidence.overall >= 0.5) {
    ambiguityActions.consultUser = false;
    ambiguityActions.userMessage =
      'Ambiguity can be resolved automatically using context.';
  }

  // Creative ambiguity = explore parallel
  if (confidence.overall >= 0.5 &&
      confidence.ambiguity.resolutionMethod === 'creative_embrace') {
    ambiguityActions.parallelExplore = true;
    ambiguityActions.maintainSuperposition = true;
    ambiguityActions.userMessage =
      'Multiple interesting interpretations found. Exploring alternatives...';
  }

  return {
    ...baseAction,
    ambiguityActions
  };
}
```

---

## 9. Real-World Examples

### 9.1 Example 1: Lexical Ambiguity in Code

**Input Step:**
```
"Check if the user can access the resource and update the cache"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'lexical',
  location: { charOffset: { start: 24, end: 29 } }, // "access"
  confidence: 0.85,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.VERIFICATION,
        summary: 'Check user permission to access resource',
        rawText: 'Verify user.hasPermission(resource) === true'
      },
      probability: 0.7,
      justification: 'In security context, "access" means authorization check',
      evidence: [
        {
          type: 'domain',
          description: 'Security domain: access = authorization',
          strength: 0.9,
          source: 'domain_knowledge'
        }
      ]
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.ACTION,
        summary: 'Attempt to retrieve resource for user',
        rawText: 'resource = user.retrieveResource()'
      },
      probability: 0.3,
      justification: 'Could mean attempting retrieval operation',
      evidence: [
        {
          type: 'syntactic',
          description: 'Access verb can mean retrieve',
          strength: 0.6,
          source: 'dictionary'
        }
      ]
    }
  ]
}
```

**Context-Dependent Resolution:**
```typescript
// Preceding step: "User is authenticated"
// Following step: "Return forbidden if unauthorized"

// Disambiguation: Interpretation 1 (authorization check) is consistent
// with both "authenticated" (prerequisite) and "forbidden" (outcome)
```

### 9.2 Example 2: Syntactic Ambiguity in Logic

**Input Step:**
```
"Validate input is not empty or null and contains valid email"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'syntactic',
  location: { charOffset: { start: 0, end: 55 } },
  confidence: 0.92,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.VALIDATION,
        summary: 'Validate (not empty) OR (null AND valid email)',
        rawText: 'isValid = input !== "" || (input === null && isValidEmail(input))'
      },
      probability: 0.2,
      justification: 'Lower precedence: AND binds tighter than OR',
      evidence: [
        {
          type: 'syntactic',
          description: 'Operator precedence: AND > OR',
          strength: 0.95,
          source: 'language_spec'
        }
      ]
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.VALIDATION,
        summary: 'Validate (not empty OR null) AND (valid email)',
        rawText: 'isValid = (input !== "" || input === null) && isValidEmail(input)'
      },
      probability: 0.8,
      justification: 'Higher precedence: implied parentheses around OR',
      evidence: [
        {
          type: 'pragmatic',
          description: 'Pragmatic interpretation: email validation always required',
          strength: 0.85,
          source: 'domain_logic'
        }
      ]
    }
  ]
}
```

**Resolution:** Deterministic rule (operator precedence) suggests Interpretation 1, but pragmatic intent suggests Interpretation 2. **User consulted.**

### 9.3 Example 3: Pragmatic Ambiguity (Creative)

**Input Step:**
```
"The system should know when users are struggling"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'pragmatic',
  location: { charOffset: { start: 24, end: 47 } }, // "know when users are struggling"
  confidence: 0.75,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.ANALYSIS,
        summary: 'Detect frustration patterns in user behavior',
        rawText: 'Monitor user interactions for: repeated errors, rage clicks, slow responses'
      },
      probability: 0.35,
      justification: 'Behavioral analysis of user frustration',
      evidence: [
        {
          type: 'domain',
          description: 'UX pattern: struggle = frustration signals',
          strength: 0.8,
          source: 'ux_research'
        }
      ]
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.ANALYSIS,
        summary: 'Predict task difficulty for users',
        rawText: 'Analyze task complexity and user skill level to predict challenges'
      },
      probability: 0.30,
      justification: 'Cognitive load and skill assessment',
      evidence: [
        {
          type: 'semantic',
          description: 'Struggling = difficulty matching skill',
          strength: 0.7,
          source: 'cognitive_science'
        }
      ]
    },
    {
      id: 'interp-3',
      step: {
        type: StepType.ACTION,
        summary: 'Provide proactive help when needed',
        rawText: 'Trigger help prompts when user shows confusion indicators'
      },
      probability: 0.35,
      justification: 'Responsive help system',
      evidence: [
        {
          type: 'pragmatic',
          description: '"Should know" implies proactive response',
          strength: 0.75,
          source: 'product_requirements'
        }
      ]
    }
  ]
}
```

**Resolution:** **Creative ambiguity embraced.** All three interpretations are valid and valuable. System explores all three:
1. Behavioral detection
2. Predictive analysis
3. Proactive help

### 9.4 Example 4: Scope Ambiguity in Requirements

**Input Step:**
```
"All users must authenticate or guests can bypass"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'scope',
  location: { charOffset: { start: 0, end: 40 } },
  confidence: 0.88,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.ACTION,
        summary: 'All users authenticate OR (guests can bypass)',
        rawText: 'if (isUser) authenticate(); else if (isGuest) bypass();'
      },
      probability: 0.4,
      justification: 'Universal quantifier scope over entire condition',
      evidence: [
        {
          type: 'syntactic',
          description: '∀x: User(x) → Authenticate(x) ∨ Guest(x) → Bypass(x)',
          strength: 0.8,
          source: 'logic'
        }
      ]
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.ACTION,
        summary: '∀x: (User(x) → Authenticate(x)) ∨ (Guest(x) → Bypass(x))',
        rawText: 'if (user && !guest) authenticate(); else bypass();'
      },
      probability: 0.6,
      justification: 'Choice applies at individual level',
      evidence: [
        {
          type: 'pragmatic',
          description: 'More flexible: each user/guest gets appropriate handling',
          strength: 0.85,
          source: 'security_policy'
        }
      ]
    }
  ]
}
```

**Resolution:** **User consulted.** This affects security policy, so user must decide authentication requirements.

### 9.5 Example 5: Metaphorical Ambiguity (Creative)

**Input Step:**
```
"The database is drowning in requests"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'metaphorical',
  location: { charOffset: { start: 4, end: 32 } }, // "database is drowning"
  confidence: 0.90,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.OBSERVATION,
        summary: 'Database overwhelmed by high request volume',
        rawText: 'requestQueue.size > MAX_CAPACITY && responseTime > TIMEOUT'
      },
      probability: 0.95,
      justification: 'Metaphorical: drowning = overloaded',
      evidence: [
        {
          type: 'domain',
          description: 'Common metaphor: system drowning = overloaded',
          strength: 0.95,
          source: 'ops_jargon'
        }
      ],
      isLiteral: false
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.OBSERVATION,
        summary: 'Database server physically submerged in water',
        rawText: 'waterLevelSensor > CRITICAL_LEVEL'
      },
      probability: 0.05,
      justification: 'Literal interpretation (highly unlikely)',
      evidence: [
        {
          type: 'semantic',
          description: 'Literal meaning of drowning',
          strength: 0.1,
          source: 'dictionary'
        }
      ],
      isLiteral: true
    }
  ]
}
```

**Resolution:** **Automatic collapse** to Interpretation 1 (metaphorical) due to high probability (0.95) and domain context.

### 9.6 Example 6: Referential Ambiguity

**Input Step:**
```
"When the service receives data from the API and processes it, cache it"
```

**Ambiguity Detection:**
```typescript
{
  isAmbiguous: true,
  ambiguityType: 'referential',
  location: { charOffset: { start: 65, end: 68 } }, // "it"
  confidence: 0.82,
  shouldCreateSuperposition: true,

  interpretations: [
    {
      id: 'interp-1',
      step: {
        type: StepType.ACTION,
        summary: 'Cache the processed data',
        rawText: 'cache.store(processedData)'
      },
      probability: 0.7,
      justification: '"it" refers to closest noun (data)',
      evidence: [
        {
          type: 'syntactic',
          description: 'Recency principle: use closest antecedent',
          strength: 0.75,
          source: 'linguistics'
        }
      ],
      target: 'data'
    },
    {
      id: 'interp-2',
      step: {
        type: StepType.ACTION,
        summary: 'Cache the service result',
        rawText: 'cache.store(serviceResponse)'
      },
      probability: 0.3,
      justification: '"it" could refer to service result',
      evidence: [
        {
          type: 'semantic',
          description: 'Services often cache responses',
          strength: 0.6,
          source: 'common_pattern'
        }
      ],
      target: 'service_response'
    }
  ]
}
```

**Resolution:** **Context-dependent.** If preceding steps mention data transformation, Interpretation 1. If service response is discussed, Interpretation 2.

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Task 1.1: Core Type System**
- [ ] Define all TypeScript interfaces
- [ ] Create type guards and validators
- [ ] Implement type serialization/deserialization
- [ ] Write unit tests for type system

**Task 1.2: Ambiguity Detection Pipeline**
- [ ] Implement 12 ambiguity type detectors
- [ ] Create detection orchestrator
- [ ] Build confidence scoring for detection
- [ ] Add detection thresholds and tuning

**Task 1.3: Multi-Interpretation Storage**
- [ ] Implement superposition state management
- [ ] Create interpretation storage format
- [ ] Build ambiguity graph structure
- [ ] Add collapse protocol

### Phase 2: Context & Disambiguation (Week 3-4)

**Task 2.1: Context Accumulator**
- [ ] Implement context window management
- [ ] Build surrounding step tracker
- [ ] Create domain knowledge integration
- [ ] Add conversation history tracking

**Task 2.2: Disambiguation Algorithms**
- [ ] Implement semantic consistency check
- [ ] Implement dependency satisfaction
- [ ] Implement pragmatic inference
- [ ] Create algorithm orchestrator

**Task 2.3: Context-Dependent Resolution**
- [ ] Build resolution decision tree
- [ ] Implement auto-resolution logic
- [ ] Add context confidence scoring
- [ ] Create resolution fallback strategies

### Phase 3: Classification & User Interaction (Week 5-6)

**Task 3.1: Nature Classification**
- [ ] Implement creative ambiguity detector
- [ ] Implement deterministic ambiguity detector
- [ ] Create classification decision logic
- [ ] Add classification confidence scoring

**Task 3.2: User Consultation System**
- [ ] Build consultation trigger logic
- [ ] Implement consultation methods
- [ ] Create UI presentation components
- [ ] Add response handling system

**Task 3.3: Creative Embrace**
- [ ] Implement parallel exploration
- [ ] Create multi-interpretation execution
- [ ] Build interpretation comparison UI
- [ ] Add synthesis of results

### Phase 4: Integration & Testing (Week 7-8)

**Task 4.1: Confidence Integration**
- [ ] Integrate ambiguity into confidence scoring
- [ ] Implement ambiguity penalty calculation
- [ ] Create ambiguity-aware thresholds
- [ ] Add confidence adjustment logic

**Task 4.2: End-to-End Integration**
- [ ] Integrate with reasoning extraction
- [ ] Connect to confidence scoring system
- [ ] Add to cell lifecycle management
- [ ] Implement persistence layer

**Task 4.3: Testing & Validation**
- [ ] Unit tests for all components
- [ ] Integration tests for pipeline
- [ ] End-to-end tests with real examples
- [ ] Performance benchmarks

### Phase 5: Polish & Documentation (Week 9-10)

**Task 5.1: UI/UX Refinement**
- [ ] Refine ambiguity presentation UI
- [ ] Add user guidance and help
- [ ] Implement accessibility features
- [ ] Create interactive tutorials

**Task 5.2: Performance Optimization**
- [ ] Optimize detection algorithms
- [ ] Cache context and interpretations
- [ ] Implement lazy loading
- [ ] Add performance monitoring

**Task 5.3: Documentation**
- [ ] Write API documentation
- [ ] Create user guides
- [ ] Build example gallery
- [ ] Record video tutorials

### Success Metrics

**Technical Metrics:**
- Ambiguity detection accuracy: >85%
- False positive rate: <15%
- Context resolution success: >70%
- User satisfaction with consultations: >80%

**User Experience Metrics:**
- Time to resolve ambiguity: <30 seconds
- User comprehension rate: >90%
- Perceived helpfulness: >4/5
- Willingness to use again: >85%

**System Performance Metrics:**
- Added latency: <100ms per step
- Memory overhead: <20%
- Storage growth: <50% for ambiguous steps
- CPU overhead: <15%

---

## Conclusion

Round 2 of the Breakdown Engine transforms ambiguity from a problem into a powerful feature. By maintaining multi-interpretation reasoning steps in superposition, we create a system that:

1. **Embraces ambiguity** - Multiple interpretations are explored and preserved
2. **Context-aware resolution** - Uses surrounding cells to make smart decisions
3. **User empowerment** - Surfaces meaningful choices to users
4. **Creative exploration** - Leverages ambiguity as a source of alternatives
5. **Confidence integration** - Transparently communicates uncertainty

**Key Innovation:** Superposition of reasoning steps—maintaining multiple valid interpretations until context or user interaction collapses the wave function.

This transforms the Breakdown Engine from a passive parser into an active reasoning partner that helps users explore, understand, and refine LLM reasoning.

---

**Next Steps:**
1. Review and approve specification
2. Begin Phase 1 implementation
3. Set up testing infrastructure
4. Create example gallery
5. Build user research plan

---

**Document Status:** Complete
**Version:** 2.0.0
**Last Updated:** 2026-03-08
**Maintainer:** Breakdown Engine R&D Team
