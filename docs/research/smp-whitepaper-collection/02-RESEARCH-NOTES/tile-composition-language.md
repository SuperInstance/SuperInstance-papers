# Tile Composition Language (TCL): A DSL for SMP Tiles

**Agent:** Schema Developer / Language Designer
**Date:** 2026-03-09
**Mission:** Design a developer-friendly DSL for tile composition
**Status:** BREAKTHROUGH - Configuration, not programming

---

## Executive Summary

Tile Composition Language (TCL) is a domain-specific language for composing SMP tiles. It's designed to feel like **writing configurations, not writing code**. Think YAML meets functional programming meets visual block diagrams.

**The breakthrough:** You describe WHAT you want, not HOW to wire it together. The compiler handles composition algebra, type checking, constraint propagation, and optimization.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Language Constructs](#2-language-constructs)
3. [Type System](#3-type-system)
4. [Visual Syntax](#4-visual-syntax)
5. [Error Messages](#5-error-messages)
6. [Code Generation](#6-code-generation)
7. [Examples](#7-examples)
8. [Grammar Reference](#8-grammar-reference)

---

## 1. Design Philosophy

### Core Principles

**1. Declarative over Imperative**

```yaml
# GOOD: Describe what you want
pipeline: tokenize -> detect -> aggregate

# BAD: Describe how to do it
tokens = tokenize(input)
detections = detect(tokens)
result = aggregate(detections)
```

**2. Configuration over Programming**

```yaml
# Feels like config, not code
tile sentiment_analyzer:
  input: text
  output: sentiment_score
  confidence: 0.9
```

**3. Visual Mental Model**

```yaml
# The code should look like the diagram
#    ┌─────┐    ┌─────┐    ┌─────┐
#    │  A  │───>│  B  │───>│  C  │
#    └─────┘    └─────┘    └─────┘

pipeline: A -> B -> C
```

**4. Composability First**

```yaml
# Small tiles compose into big systems
sentiment = tokenize -> classify -> score
entities = tokenize -> ner -> merge
analysis = sentiment || entities  # Run in parallel
```

**5. Safety by Default**

```yaml
# Types checked, constraints propagated
# Compiler catches composition errors
pipeline: risky_tile -> safe_tile  # ERROR: Type mismatch!
```

---

## 2. Language Constructs

### 2.1 Tile Definition

Define a tile with input/output types and constraints:

```yaml
tile sentiment_classifier:
  # Core identity
  version: "1.0.0"
  category: role  # ephemeral | role | core

  # Type signature
  input:
    type: object
    properties:
      text: string
      language: string?

  output:
    type: object
    properties:
      sentiment: enum["positive", "negative", "neutral"]
      confidence: number[0, 1]

  # Constraints
  constraints:
    - text.length > 0
    - text.length <= 5000

  # Metadata
  base_confidence: 0.85
  description: "Classifies text sentiment"

  # Learning parameters
  learning:
    adapt_interval: 100
    max_observations: 1000
```

**Language Design Note:** The `?` suffix indicates optional fields. The `enum[type]` syntax defines enumerated types. The `number[min, max]` syntax defines numeric ranges.

### 2.2 Sequential Composition

Chain tiles in sequence using `->` operator:

```yaml
pipeline sentiment_analysis:
  # Sequential pipeline
  flow: input -> tokenize -> classify -> aggregate -> output

  # Explicit naming of intermediate steps
  steps:
    tokenize: TextTokenizer()
    classify: SentimentClassifier()
    aggregate: ConfidenceAggregator()

  # Flow control
  strategy: series  # series | parallel | conditional
```

**Algebraic Property:** Sequential composition is associative. `(A -> B) -> C = A -> (B -> C)`

### 2.3 Parallel Composition

Run multiple tiles in parallel using `||` operator:

```yaml
pipeline multi_analysis:
  # Parallel execution
  flow: input -> (sentiment || entities || topics) -> merge

  # Define parallel branches
  branches:
    sentiment:
      - SentimentClassifier()
      - ScoreNormalizer()

    entities:
      - NamedEntityRecognizer()
      - EntityValidator()

    topics:
      - TopicExtractor()
      - TopicRanker()

  # Merge strategy
  merge:
    strategy: combine  # combine | race | majority_vote
    weights:
      sentiment: 1.0
      entities: 0.8
      topics: 0.6
```

**Algebraic Property:** Parallel composition commutes. `A || B = B || A`

### 2.4 Conditional Composition

Choose between tiles based on conditions:

```yaml
pipeline smart_router:
  # Conditional routing
  flow: input -> check_confidence ->?
    if confidence > 0.8: fast_track
    else: detailed_analysis

  # Define conditions
  conditions:
    fast_track:
      - QuickValidate()
      - Approve()

    detailed_analysis:
      - DeepAnalyze()
      - ManualReview()

  # Fallback
  fallback: FallbackLLM()
```

**Algebraic Property:** Conditional composition distributes. `f -> (g ? h) = (f -> g) ? (f -> h)`

### 2.5 Feedback Composition

Create loops for iterative refinement:

```yaml
pipeline iterative_refinement:
  # Feedback loop
  flow: input -> generate -> review ->*
    if not satisfied: generate
    else: output

  # Loop configuration
  loop:
    max_iterations: 3
    convergence_threshold: 0.95

  # Exit conditions
  exit_when:
    - confidence >= 0.95
    - iteration >= max_iterations
```

**Algebraic Property:** Fixed-point semantics. `μ(f) = f(f(f(...)))`

### 2.6 Data Flow Primitives

Control how data flows between tiles:

```yaml
pipeline data_flow:
  # Forward pass
  flow: input -> process -> output

  # With accumulation
  accumulate:
    - tile1: collect="tokens"
    - tile2: collect="detections"
    - tile3: input="tokens, detections"

  # With branching
  branch:
    - condition: input.type == "text"
      then: text_processor
    - condition: input.type == "image"
      then: image_processor
    - default: fallback_processor

  # With merging
  merge:
    strategy: zip  # zip | concat | combine
    input_from: [branch1, branch2]
```

### 2.7 Constraint Expressions

Define and propagate constraints:

```yaml
pipeline constrained:
  # Tile-level constraints
  tile safe_processor:
    constraints:
      - input.confidence >= 0.8
      - input.amount < 10000
      - output.verified == true

  # Pipeline-level constraints
  constraints:
    - all_tiles.confidence >= 0.7
    - pipeline.execution_time <= 5000ms
    - pipeline.cost <= 0.01

  # Constraint propagation
  propagate: strict  # strict | permissive | custom
```

---

## 3. Type System

### 3.1 Static Typing

Catch errors at compile time:

```yaml
# Type definitions
type Text = string[min_length=1, max_length=5000]
type Confidence = number[0, 1]
type Sentiment = enum["positive", "negative", "neutral"]
type SentimentResult = object{sentiment: Sentiment, confidence: Confidence}

# Tile with static types
tile classifier:
  input: Text
  output: SentimentResult

# Type-checked composition
pipeline: Text -> classifier -> score  # ✓ Type-safe
pipeline: Text -> classifier -> wrong_type  # ✗ Type error!
```

**Compiler Error:**
```
Type Error: Incompatible types in composition
  Location: pipeline -> classifier -> wrong_type
  Expected: SentimentResult
  Found: WrongType
  Suggestion: Add conversion tile or modify types
```

### 3.2 Runtime Validation

Validate data at runtime:

```yaml
tile validated_classifier:
  input: Text
  output: SentimentResult

  # Runtime validation
  validate:
    input:
      - text != null
      - text.length > 0
      - text.length <= 5000
    output:
      - sentiment in ["positive", "negative", "neutral"]
      - confidence >= 0
      - confidence <= 1

  # Validation strategy
  on_failure: reject  # reject | fallback | sanitize
```

### 3.3 Gradual Typing

Mix typed and untyped tiles:

```yaml
# Gradually add types to legacy code
tile legacy_tile:
  input: any  # Accept anything
  output: any  # Output anything
  # Gradual typing: works but not type-safe

tile modern_tile:
  input: Text
  output: SentimentResult
  # Full typing: type-safe

# Mix them (with warnings)
pipeline: legacy_tile -> modern_tile  # Works but warns
```

**Compiler Warning:**
```
Type Warning: Composition with gradual types
  Location: legacy_tile -> modern_tile
  Issue: Type safety not guaranteed
  Recommendation: Add types to legacy_tile for full safety
```

### 3.4 Type Inference

Let the compiler infer types:

```yaml
# Types can be inferred from usage
tile inferred:
  # No explicit types
  process: (input) => {
    tokens = tokenize(input)
    return classify(tokens)
  }

# Compiler infers:
# input: string
# output: ClassificationResult
```

**Inferred Types Output:**
```
Inferred Types for tile 'inferred':
  input: string
  output: ClassificationResult
  Confidence: 85%
  Suggestion: Consider adding explicit types for better safety
```

### 3.5 Generic Types

Define reusable tile templates:

```yaml
# Generic tile definition
template processor<TInput, TOutput>:
  input: TInput
  output: TOutput
  process: generic_process<TInput, TOutput>

# Specialize for specific types
tile text_processor = processor<string, SentimentResult>
tile image_processor = processor<Image, ClassificationResult>

# Generic pipeline
template pipeline<T>:
  flow: T -> validate -> process -> output

# Use with specific type
pipeline<string>: text_pipeline
```

---

## 4. Visual Syntax

### 4.1 Flow Diagrams

Automatic diagram generation from code:

```yaml
# This code:
pipeline sentiment:
  flow: input -> tokenize -> classify -> score -> output

# Generates this diagram:
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────┐    ┌────────┐
│  input  │───>│ tokenize │───>│ classify  │───>│ score  │───>│ output │
└─────────┘    └──────────┘    └───────────┘    └────────┘    └────────┘
   string         string[]      Detection[]      Score       Result
```

### 4.2 Block Diagrams

Hierarchical block representation:

```yaml
# Complex pipeline
pipeline analysis:
  parallel:
    sentiment: [tokenize, classify, score]
    entities: [tokenize, ner, merge]
    topics: [tokenize, lda, rank]
  merge: combine_all

# Generates:
┌────────────────────────────────────────────────────┐
│                    input                            │
└────────────────┬───────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │   Parallel      │
        ├────────┬────────┤
        │        │        │
┌───────┴──┐ ┌───┴────┐ ┌─┴───────┐
│sentiment │ │entities│ │ topics  │
├─────────┤ ├───────┤ ├─────────┤
│tokenize │ │tokenize│ │tokenize │
│classify │ │ner    │ │lda      │
│score    │ │merge  │ │rank     │
└────┬────┘ └───┬────┘ └────┬────┘
     │          │           │
     └──────────┴───────────┘
                 │
        ┌────────┴────────┐
        │   combine_all   │
        └────────┬────────┘
                 │
            ┌────┴────┐
            │  output │
            └─────────┘
```

### 4.3 Live Previews

Real-time visualization in IDE:

```yaml
# As you type, see the diagram update live
pipeline example:
  flow: input -> step1 -> step2 -> step3 -> output

# IDE shows live preview:
# [Step 1]────>[Step 2]────>[Step 3]
#    │            │            │
#  Text       Detection    Result
```

### 4.4 Interactive Diagrams

Click to inspect and edit:

```yaml
# Click on any tile to see details
[SentimentClassifier]  ← Click
  ├─ Input: string
  ├─ Output: SentimentResult
  ├─ Confidence: 0.85
  ├─ Constraints: [text.length > 0]
  └─ Dependencies: [tokenizer, model]

# Click and drag to reconnect
[Tile A]────>[Tile B]
           │
           └──────>[Tile C]  ← Drag to rewire
```

---

## 5. Error Messages

### 5.1 Helpful Errors

Clear, actionable error messages:

```yaml
# Type mismatch error
❌ Type Error: Cannot compose 'tokenizer' with 'classifier'

   Location: pipeline -> tokenizer -> classifier

   Problem:
     tokenizer outputs: string[]
     classifier expects: string

   Suggestion:
     Add flattening tile:
     tokenizer -> flatten -> classifier

   Or modify classifier to accept string[]
```

### 5.2 Contextual Errors

Show the full context:

```yaml
# Constraint violation error
❌ Constraint Error: Contradictory constraints detected

   Pipeline: fraud_detection

   Conflicting constraints:
     Tile A: confidence > 0.5
     Tile B: confidence < 0.3

   These can never both be satisfied!

   Full chain:
     input -> [Tile A] -> [Tile B] -> output
                ↑            ↑
            confidence   confidence
              > 0.5       < 0.3

   Suggestion:
     Adjust thresholds to allow overlap:
     Tile A: confidence > 0.3
     Tile B: confidence >= 0.5
```

### 5.3 Actionable Errors

Provide concrete fixes:

```yaml
# Composition paradox error
⚠️  Warning: Safe tile, unsafe composition detected

   Tiles involved:
     • low_confidence_pass (safe alone)
     • small_amount_skip (safe alone)

   Vulnerability:
     Transactions with 51% confidence and $9,999
     amount bypass verification.

   Recommended fix:
     Add joint constraint tile:

     tile combined_check:
       constraints:
         - if confidence < 0.8 and amount > 1000:
           require_verification = true

     Insert between tiles:
     low_confidence_pass -> combined_check -> small_amount_skip

   Alternative:
     Raise confidence threshold:
     low_confidence_pass: confidence > 0.8 (was > 0.5)
```

### 5.4 Prevention Errors

Catch problems before they happen:

```yaml
# Potential infinite loop
⚠️  Warning: Possible infinite loop

   Pipeline: iterative_refinement

   Issue:
     Feedback loop may never terminate

   Loop condition:
     while not satisfied:
       generate -> review

   Problem:
     'satisfied' may never become true

   Suggestion:
     Add safety limit:

     loop:
       max_iterations: 5
       timeout: 30s
       exit_when:
         - confidence >= 0.95
         - iteration >= max_iterations
         - time_elapsed >= timeout
```

---

## 6. Code Generation

### 6.1 TypeScript Generation

Generate idiomatic TypeScript:

```yaml
# Input TCL
pipeline sentiment:
  flow: input -> tokenize -> classify -> output

# Generated TypeScript
interface Tile<Input, Output> {
  execute(input: Input, context: TileContext): Promise<TileResult<Output>>;
}

class SentimentPipeline {
  private tokenizer: Tile<string, string[]>;
  private classifier: Tile<string[], SentimentResult>;

  constructor(
    tokenizer: Tile<string, string[]>,
    classifier: Tile<string[], SentimentResult>
  ) {
    this.tokenizer = tokenizer;
    this.classifier = classifier;
  }

  async execute(input: string): Promise<TileResult<SentimentResult>> {
    const tokens = await this.tokenizer.execute(input, context);
    const result = await this.classifier.execute(tokens.output, context);
    return result;
  }
}
```

### 6.2 Python Generation

Generate async Python code:

```yaml
# Input TCL
pipeline sentiment:
  flow: input -> tokenize -> classify -> output

# Generated Python
from typing import TypeVar, Generic
from dataclasses import dataclass

TInput = TypeVar('TInput')
TOutput = TypeVar('TOutput')

@dataclass
class TileResult(Generic[TOutput]):
    output: TOutput
    success: bool
    confidence: float

class Tile(Generic[TInput, TOutput]):
    async def execute(
        self,
        input: TInput,
        context: TileContext
    ) -> TileResult[TOutput]:
        raise NotImplementedError

class SentimentPipeline:
    def __init__(
        self,
        tokenizer: Tile[str, list[str]],
        classifier: Tile[list[str], SentimentResult]
    ):
        self.tokenizer = tokenizer
        self.classifier = classifier

    async def execute(self, input: str) -> TileResult[SentimentResult]:
        tokens = await self.tokenizer.execute(input, context)
        result = await self.classifier.execute(tokens.output, context)
        return result
```

### 6.3 Rust Generation

Generate safe, concurrent Rust:

```yaml
# Input TCL
pipeline sentiment:
  flow: input -> tokenize -> classify -> output

# Generated Rust
use std::marker::PhantomData;
use async_trait::async_trait;

pub struct TileContext {
    pub colony_id: String,
    pub timestamp: u64,
}

pub struct TileResult<T> {
    pub output: T,
    pub success: bool,
    pub confidence: f64,
}

#[async_trait]
pub trait Tile<Input, Output>: Send + Sync {
    async fn execute(
        &self,
        input: Input,
        context: &TileContext,
    ) -> TileResult<Output>;
}

pub struct SentimentPipeline {
    tokenizer: Box<dyn Tile<String, Vec<String>>>,
    classifier: Box<dyn Tile<Vec<String>, SentimentResult>>,
}

impl SentimentPipeline {
    pub fn new(
        tokenizer: Box<dyn Tile<String, Vec<String>>>,
        classifier: Box<dyn Tile<Vec<String>, SentimentResult>>,
    ) -> Self {
        Self {
            tokenizer,
            classifier,
        }
    }

    pub async fn execute(
        &self,
        input: String,
        context: &TileContext,
    ) -> TileResult<SentimentResult> {
        let tokens = self.tokenizer.execute(input, context).await;
        let result = self.classifier.execute(tokens.output, context).await;
        result
    }
}
```

### 6.4 Optimization Passes

The compiler optimizes generated code:

```yaml
# Input
pipeline optimized:
  flow: input -> tile1 -> identity -> tile2 -> identity -> output

# After optimization (removes identity tiles)
pipeline optimized:
  flow: input -> tile1 -> tile2 -> output

# Optimization rules:
# 1. Remove identity tiles: A -> id -> B = A -> B
# 2. Flatten nested composition: (A -> B) -> C = A -> B -> C
# 3. Parallelize independent branches: (A || B) = concurrent(A, B)
# 4. Inline small tiles: tiny_tile = inline(tile_body)
```

---

## 7. Examples

### 7.1 Simple Pipeline

Basic sentiment analysis:

```yaml
# Define tiles
tile tokenizer:
  input: string
  output: string[]
  process: split_into_tokens

tile classifier:
  input: string[]
  output: SentimentResult
  process: classify_sentiment

# Compose pipeline
pipeline sentiment_analysis:
  flow: text -> tokenizer -> classifier -> result

  # Add constraints
  constraints:
    - text.length > 0
    - result.confidence >= 0.8
```

**Generated Diagram:**
```
text ──>[tokenizer]──>[classifier]──> result
```

### 7.2 Parallel Processing

Multi-perspective analysis:

```yaml
pipeline full_analysis:
  # Parallel branches
  flow: input -> [sentiment || entities || topics] -> merge

  # Define branches
  sentiment:
    - tokenizer
    - sentiment_classifier
    - sentiment_scorer

  entities:
    - tokenizer
    - named_entity_recognizer
    - entity_validator

  topics:
    - tokenizer
    - topic_extractor
    - topic_ranker

  # Merge results
  merge:
    strategy: combine
    weights: {sentiment: 1.0, entities: 0.8, topics: 0.6}
```

**Generated Diagram:**
```
                    ┌─> sentiment ─┐
input ──> tokenizer ─┼─> entities ──┼──> combine
                    └─> topics ────┘
```

### 7.3 Conditional Routing

Smart request routing:

```yaml
pipeline smart_router:
  # Route based on input type
  flow: input -> classify ->?
    if type == "text": text_pipeline
    if type == "image": image_pipeline
    if type == "audio": audio_pipeline
    default: fallback_pipeline

  # Define pipelines
  text_pipeline:
    - tokenize
    - analyze_text

  image_pipeline:
    - preprocess_image
    - classify_image

  audio_pipeline:
    - transcribe
    - analyze_audio

  fallback_pipeline:
    - generic_llm
```

**Generated Diagram:**
```
classify ──┬─> text ──> text_pipeline
           ├─> image ─> image_pipeline
           ├─> audio ─> audio_pipeline
           └─> * ────> fallback_pipeline
```

### 7.4 Feedback Loop

Iterative refinement:

```yaml
pipeline iterative_improvement:
  # Generate and refine
  flow: input -> generate -> review ->*
    if not good_enough: generate
    else: output

  # Loop configuration
  loop:
    max_iterations: 3
    improvement_threshold: 0.1

  # Exit conditions
  exit_when:
    - quality >= 0.95
    - improvement < improvement_threshold
    - iteration >= max_iterations

  # Tiles
  generate:
    - llm_generate
    - format_output

  review:
    - quality_check
    - error_detection
```

**Generated Diagram:**
```
        ┌────────────────┐
        │                │
        ▼                │
input ──> generate ───> review ──> output
        ▲                │
        └──── * ─────────┘
           if not good
```

### 7.5 Complex Real-World System

Fraud detection system:

```yaml
pipeline fraud_detection:
  # Parallel analysis
  parallel:
    # Branch 1: Confidence check
    confidence_check:
      - initial_score
      - if score > 0.5: proceed
      else: reject

    # Branch 2: Amount check
    amount_check:
      - check_amount
      - if amount < 10000: skip_verification
      else: enhanced_verification

    # Branch 3: Pattern analysis
    pattern_analysis:
      - historical_pattern_check
      - velocity_check
      - location_check

  # Combined decision
  merge:
    strategy: weighted_vote
    weights:
      confidence: 0.5
      amount: 0.3
      pattern: 0.2

    # Joint constraints (prevents safe tile paradox)
    constraints:
      - if confidence < 0.8 and amount > 1000:
        require_manual_review = true
      - if pattern_risk > 0.7:
        require_manual_review = true

  # Final decision
  decision:
    - if all_passed: approve
    - if manual_review_required: human_review
    - else: decline

  # Logging
  log_all: true
  audit_trail: required
```

**Generated Diagram:**
```
input ──┬─> confidence_check ──┐
        ├─> amount_check ─────┤
        └─> pattern_analysis ─┤
                             ▼
                        weighted_vote
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
            approve    human_review   decline
```

---

## 8. Grammar Reference

### 8.1 Formal Grammar (EBNF)

```
<program> ::= <tile_def>+ | <pipeline_def>+

<tile_def> ::= "tile" <identifier> ":" <tile_body>
<tile_body> ::=
    ("version" <string>)?
    ("category" <tile_category>)?
    ("input" <type_spec>)
    ("output" <type_spec>)
    ("constraints" <constraint_list>)?
    ("base_confidence" <number>)?
    ("process" <process_def>)?

<pipeline_def> ::= "pipeline" <identifier> ":" <pipeline_body>
<pipeline_body> ::=
    ("flow" <flow_expr>)
    ("strategy" <strategy>)?
    ("constraints" <constraint_list>)?
    ("merge" <merge_spec>)?

<flow_expr> ::= <term> ( ("->" | "||" | "->?" | "->*") <term> )*

<term> ::= <identifier> | <flow_expr> | <flow_expr> "||" <flow_expr>

<type_spec> ::=
    <primitive_type> |
    <enum_type> |
    <object_type> |
    <array_type> |
    <generic_type>

<primitive_type> ::= "string" | "number" | "boolean" | "any"

<enum_type> ::= "enum" "[" <string_list> "]"

<object_type> ::= "object" "{" <property_list> "}"

<property_list> ::= <property> ("," <property>)*

<property> ::= <identifier> ":" <type_spec> ("?")?

<array_type> ::= <type_spec> "[]"

<generic_type> ::= <identifier> "<" <type_spec> ("," <type_spec>)* ">"

<constraint_list> ::= "[" <constraint> ("," <constraint>)* "]"

<constraint> ::= <expression>

<expression> ::=
    <logical_or> ("||" <logical_or>)*

<logical_or> ::=
    <logical_and> ("&&" <logical_and>)*

<logical_and> ::=
    <comparison> (("==" | "!=" | "<" | "<=" | ">" | ">=") <comparison>)?

<comparison> ::=
    <additive> (("+" | "-") <additive>)*

<additive> ::=
    <multiplicative> (("*" | "/") <multiplicative>)*

<multiplicative> ::=
    <unary> (("!" | "-") <unary>)*

<unary> ::=
    <primary> | ("!" | "-") <unary>

<primary> ::=
    <identifier> |
    <literal> |
    "(" <expression> ")" |
    <function_call>

<function_call> ::= <identifier> "(" <arg_list> ")"

<arg_list> ::= <expression> ("," <expression>)*

<identifier> ::= <letter> ( <letter> | <digit> | "_" )*

<literal> ::= <string> | <number> | <boolean>

<string> ::= '"' <characters> '"'

<number> ::= <digit>+ ( "." <digit>+ )?

<boolean> ::= "true" | "false"

<tile_category> ::= "ephemeral" | "role" | "core"

<strategy> ::= "series" | "parallel" | "conditional"

<merge_spec> ::=
    "strategy" ":" <merge_strategy>
    ("weights" ":" <weight_map>)?

<merge_strategy> ::= "combine" | "race" | "majority_vote"

<weight_map> ::= "{" <weight_entry> ("," <weight_entry>)* "}"

<weight_entry> ::= <identifier> ":" <number>
```

### 8.2 Operator Precedence

From highest to lowest:

1. Function calls: `()`
2. Unary operators: `!`, `-`
3. Multiplicative: `*`, `/`
4. Additive: `+`, `-`
5. Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
6. Logical AND: `&&`
7. Logical OR: `||`
8. Flow operators: `->`, `||`, `->?`, `->*`

### 8.3 Reserved Keywords

```
tile, pipeline, flow, input, output, constraints
process, version, category, base_confidence
strategy, merge, weights, loop, parallel, series, conditional
if, else, when, then, default
true, false, null, any
enum, object, string, number, boolean
```

---

## 9. Implementation Roadmap

### Phase 1: Core Language (Months 1-2)
- [ ] Parser implementation
- [ ] Type checker
- [ ] Basic code generation (TypeScript)
- [ ] Error reporting system

### Phase 2: Advanced Features (Months 3-4)
- [ ] Visual syntax generation
- [ ] Constraint propagation
- [ ] Parallel code generation
- [ ] Interactive diagrams

### Phase 3: Ecosystem (Months 5-6)
- [ ] IDE plugins (VS Code, IntelliJ)
- [ ] Language server protocol
- [ ] Package manager for tiles
- [ ] Documentation generator

### Phase 4: Optimization (Months 7-8)
- [ ] Compiler optimization passes
- [ ] Runtime performance monitoring
- [ ] Hot reloading
- [ ] A/B testing framework

---

## 10. Comparison with Alternatives

### vs. TypeScript

**TCL:**
```yaml
pipeline: A -> B -> C
```

**TypeScript:**
```typescript
const pipeline = compose(
  tileA,
  compose(tileB, tileC)
)
```

**Advantage:** TCL is declarative and visual.

### vs. YAML Config

**TCL:**
```yaml
pipeline: A -> B -> C
```

**YAML:**
```yaml
pipeline:
  steps:
    - name: A
    - name: B
    - name: C
```

**Advantage:** TCL has type safety and composition operators.

### vs. Scratch/Blockly

**TCL:**
```yaml
pipeline: A -> B -> C
```

**Scratch:**
```
[A block] -> [B block] -> [C block]
```

**Advantage:** TCL is text-based (version control friendly) but generates visual diagrams.

---

## 11. Developer Experience

### 11.1 Get Started in 5 Minutes

```bash
# Install CLI
npm install -g @polln/tcl

# Create first tile
tcl init my-tile
cd my-tile

# Edit tile.yaml
cat > tile.yaml << EOF
tile hello:
  input: string
  output: string
  process: "Hello, {input}!"
EOF

# Compile to TypeScript
tcl compile tile.yaml --target typescript

# Run
tcl run tile.yaml --input "World"
# Output: Hello, World!
```

### 11.2 IDE Integration

**VS Code Extension Features:**
- Syntax highlighting
- Live diagram preview
- Type checking on-the-fly
- Error highlighting
- Auto-completion
- Quick-fix suggestions

**Keyboard Shortcuts:**
- `Ctrl+Space`: Auto-complete
- `F12`: Go to definition
- `Ctrl+Click`: Open diagram
- `Ctrl+Shift+D`: Toggle diagram view

---

## 12. Future Directions

### 12.1 AI-Assisted Composition

Let AI help write tiles:

```yaml
# Ask AI to create tile
tcl ask "Create a sentiment classifier"
# AI generates tile definition
# AI writes tests
# AI optimizes performance
```

### 12.2 Automatic Tile Discovery

Find tiles from natural language:

```yaml
# Describe what you want
tcl find "text to sentiment"
# Finds: sentiment_classifier, text_analyzer, emotion_detector
# Shows: compatibility, confidence, constraints
```

### 12.3 Distributed Execution

Run tiles across multiple machines:

```yaml
pipeline distributed:
  flow: input -> local -> remote -> merge

  # Execution hints
  execute:
    local: {on: "localhost"}
    remote: {on: "cluster", workers: 10}
```

---

## Conclusion

**Tile Composition Language (TCL)** makes tile composition feel like writing configuration, not programming. It provides:

1. **Declarative syntax** - Describe what, not how
2. **Type safety** - Catch errors at compile time
3. **Visual diagrams** - See what you're building
4. **Helpful errors** - Clear, actionable messages
5. **Code generation** - Target TypeScript, Python, Rust
6. **Optimization** - Automatic optimization passes

**The breakthrough:** You focus on WHAT you want to build. The compiler handles HOW to wire it together safely and efficiently.

This is how SMP tiles go from research to production.

---

**Status:** COMPLETE - Ready for Implementation
**Next Steps:** Build parser, type checker, code generator
**Priority:** HIGH - Core infrastructure for SMP white paper

---

**Document Author:** Schema Developer Agent
**Date:** 2026-03-09
**Version:** 1.0.0
**License:** MIT (part of POLLN project)
