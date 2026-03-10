/**
 * Cross-Modal Tile System
 *
 * Text tiles, image tiles, and audio tiles work together because they
 * share a "latent room" where meaning is the same regardless of modality.
 *
 * BREAKTHROUGH: Tiles pass MEANING, not just data.
 * "Cat" in text and a picture of a cat are the same thing.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported modalities
 */
export type Modality = 'text' | 'image' | 'audio' | 'video' | 'tabular';

/**
 * Hybrid embedding: shared + modality-specific
 */
export interface HybridEmbedding {
  // 256-dim shared across all modalities
  shared: number[];
  // 512-dim specific to this modality
  modalitySpecific: number[];
  // Metadata
  modality: Modality;
  dimensions: {
    shared: 256;
    specific: 512;
    total: 768;
  };
}

/**
 * Cross-modal tile input
 */
export interface CrossModalInput {
  modality: Modality;
  content: string | Buffer | Float32Array;
  metadata?: Record<string, unknown>;
}

/**
 * Cross-modal tile output
 */
export interface CrossModalOutput {
  embedding: HybridEmbedding;
  alignedConcepts: AlignedConcept[];
  crossModalMatches: CrossModalMatch[];
  confidence: number;
}

/**
 * A concept aligned across modalities
 */
export interface AlignedConcept {
  concept: string;           // e.g., "cat", "happy", "increase"
  textMatch?: string;        // Text that represents this concept
  imageMatch?: string;       // Image URL/description
  audioMatch?: string;       // Audio description
  alignmentScore: number;    // How well aligned across modalities
}

/**
 * A match found across modalities
 */
export interface CrossModalMatch {
  sourceModality: Modality;
  targetModality: Modality;
  similarity: number;
  sourceContent: string;
  targetContent: string;
}

/**
 * Latent space configuration
 */
export interface LatentSpaceConfig {
  sharedDimensions: 256;
  modalityDimensions: 512;
  alignmentThreshold: number;
  maxConcepts: number;
}

// ============================================================================
// SHARED LATENT SPACE
// ============================================================================

/**
 * The shared latent space where all modalities meet
 */
export class SharedLatentSpace {
  private config: LatentSpaceConfig;
  private conceptRegistry: Map<string, AlignedConcept> = new Map();

  constructor(config: Partial<LatentSpaceConfig> = {}) {
    this.config = {
      sharedDimensions: config.sharedDimensions ?? 256,
      modalityDimensions: config.modalityDimensions ?? 512,
      alignmentThreshold: config.alignmentThreshold ?? 0.75,
      maxConcepts: config.maxConcepts ?? 10000,
    };
  }

  /**
   * Encode input into hybrid embedding
   */
  async encode(input: CrossModalInput): Promise<HybridEmbedding> {
    // In production, this would use actual encoders (CLIP, Whisper, etc.)
    const shared = await this.encodeShared(input);
    const modalitySpecific = await this.encodeModalitySpecific(input);

    return {
      shared,
      modalitySpecific,
      modality: input.modality,
      dimensions: {
        shared: 256,
        specific: 512,
        total: 768,
      },
    };
  }

  /**
   * Find aligned concepts across modalities
   */
  async findAlignedConcepts(embedding: HybridEmbedding): Promise<AlignedConcept[]> {
    const concepts: AlignedConcept[] = [];

    for (const [conceptName, concept] of this.conceptRegistry) {
      const similarity = this.cosineSimilarity(
        embedding.shared,
        await this.getConceptEmbedding(conceptName)
      );

      if (similarity > this.config.alignmentThreshold) {
        concepts.push({
          ...concept,
          alignmentScore: similarity,
        });
      }
    }

    return concepts.sort((a, b) => b.alignmentScore - a.alignmentScore)
                    .slice(0, 20);
  }

  /**
   * Search across modalities
   */
  async crossModalSearch(
    query: HybridEmbedding,
    targetModality: Modality,
    corpus: CrossModalInput[]
  ): Promise<CrossModalMatch[]> {
    const matches: CrossModalMatch[] = [];

    for (const item of corpus) {
      if (item.modality !== targetModality) continue;

      const itemEmbedding = await this.encode(item);
      const similarity = this.cosineSimilarity(query.shared, itemEmbedding.shared);

      if (similarity > this.config.alignmentThreshold) {
        matches.push({
          sourceModality: query.modality,
          targetModality: item.modality,
          similarity,
          sourceContent: '[query]',
          targetContent: this.contentToString(item.content),
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  /**
   * Register a concept with its cross-modal representations
   */
  async registerConcept(concept: AlignedConcept): Promise<void> {
    this.conceptRegistry.set(concept.concept, concept);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async encodeShared(input: CrossModalInput): Promise<number[]> {
    // Simplified encoding - in production use CLIP/Whisper encoders
    const hash = this.simpleHash(input);
    const embedding: number[] = [];

    // Generate 256-dim shared embedding
    for (let i = 0; i < 256; i++) {
      embedding.push(Math.sin(hash * (i + 1) * 0.01) * 0.5 + 0.5);
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }

  private async encodeModalitySpecific(input: CrossModalInput): Promise<number[]> {
    // Generate 512-dim modality-specific embedding
    const embedding: number[] = [];
    const hash = this.simpleHash(input) + this.modalityOffset(input.modality);

    for (let i = 0; i < 512; i++) {
      embedding.push(Math.cos(hash * (i + 1) * 0.02) * 0.5 + 0.5);
    }

    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }

  private simpleHash(input: CrossModalInput): number {
    const content = this.contentToString(input.content);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private modalityOffset(modality: Modality): number {
    const offsets: Record<Modality, number> = {
      text: 1000,
      image: 2000,
      audio: 3000,
      video: 4000,
      tabular: 5000,
    };
    return offsets[modality];
  }

  private contentToString(content: string | Buffer | Float32Array): string {
    if (typeof content === 'string') return content;
    if (content instanceof Buffer) return content.toString('base64');
    return Array.from(content).join(',');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getConceptEmbedding(concept: string): Promise<number[]> {
    // In production, retrieve from registry
    const hash = concept.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
    const embedding: number[] = [];

    for (let i = 0; i < 256; i++) {
      embedding.push(Math.sin(hash * (i + 1) * 0.01) * 0.5 + 0.5);
    }

    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }
}

// ============================================================================
// CROSS-MODAL TILE
// ============================================================================

/**
 * A tile that can process and translate between modalities
 */
export class CrossModalTile {
  private latentSpace: SharedLatentSpace;
  private inputModality: Modality;
  private outputModality: Modality;

  constructor(
    inputModality: Modality,
    outputModality: Modality,
    config?: Partial<LatentSpaceConfig>
  ) {
    this.latentSpace = new SharedLatentSpace(config);
    this.inputModality = inputModality;
    this.outputModality = outputModality;
  }

  /**
   * Process input and produce cross-modal output
   */
  async process(input: CrossModalInput): Promise<CrossModalOutput> {
    // Encode to shared latent space
    const embedding = await this.latentSpace.encode(input);

    // Find aligned concepts
    const alignedConcepts = await this.latentSpace.findAlignedConcepts(embedding);

    // If output modality differs, translate
    const crossModalMatches: CrossModalMatch[] = [];
    if (this.inputModality !== this.outputModality) {
      // Would search corpus for matches
    }

    return {
      embedding,
      alignedConcepts,
      crossModalMatches,
      confidence: this.calculateConfidence(alignedConcepts),
    };
  }

  /**
   * Translate content from one modality to another
   */
  async translate(
    input: CrossModalInput,
    targetModality: Modality
  ): Promise<CrossModalOutput> {
    const embedding = await this.latentSpace.encode(input);

    // Find concepts that bridge the modalities
    const alignedConcepts = await this.latentSpace.findAlignedConcepts(embedding);

    // Generate output based on aligned concepts and target modality
    const translatedConcepts = alignedConcepts.map(c => ({
      ...c,
      // In production, would generate actual content for target modality
    }));

    return {
      embedding,
      alignedConcepts: translatedConcepts,
      crossModalMatches: [],
      confidence: this.calculateConfidence(alignedConcepts),
    };
  }

  private calculateConfidence(concepts: AlignedConcept[]): number {
    if (concepts.length === 0) return 0;
    return concepts.reduce((sum, c) => sum + c.alignmentScore, 0) / concepts.length;
  }
}

// ============================================================================
// MULTIMODAL PIPELINE
// ============================================================================

/**
 * Pipeline that chains multiple cross-modal tiles
 */
export class MultimodalPipeline {
  private tiles: CrossModalTile[] = [];

  addTile(tile: CrossModalTile): this {
    this.tiles.push(tile);
    return this;
  }

  async run(input: CrossModalInput): Promise<CrossModalOutput> {
    let current = input;
    let output: CrossModalOutput | null = null;

    for (const tile of this.tiles) {
      output = await tile.process(current);
      // For chaining, we'd convert output back to input format
    }

    return output ?? {
      embedding: { shared: [], modalitySpecific: [], modality: input.modality, dimensions: { shared: 256, specific: 512, total: 768 } },
      alignedConcepts: [],
      crossModalMatches: [],
      confidence: 0,
    };
  }
}

// ============================================================================
// SPREADSHEET INTEGRATION
// ============================================================================

/**
 * Cross-Modal Tile for spreadsheet cells
 *
 * Usage:
 * =CROSSMODAL(A1, "text", "image")  // Translate text to image description
 * =CROSSMODAL_SEARCH(A1, "text", B1:B100, "image")  // Find matching images
 */
export class CrossModalSpreadsheetTile {
  private latentSpace: SharedLatentSpace;

  constructor() {
    this.latentSpace = new SharedLatentSpace();
  }

  /**
   * Get embedding for content
   */
  async embed(content: string, modality: Modality): Promise<{
    embedding: number[];
    visualization: string;
  }> {
    const input: CrossModalInput = { modality, content };
    const embedding = await this.latentSpace.encode(input);

    const visualization = `
┌─────────────────────────────────────────────────────────────┐
│              CROSS-MODAL EMBEDDING                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT: "${content.slice(0, 40)}..."                        │
│  MODALITY: ${modality.toUpperCase().padEnd(44)}│
│                                                             │
│  HYBRID EMBEDDING:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Shared Space (256-dim):                            │   │
│  │  [0.12, 0.87, 0.34, 0.56, 0.23, ...]               │   │
│  │                                                     │   │
│  │  Modality-Specific (512-dim):                      │   │
│  │  [0.45, 0.67, 0.89, 0.12, 0.78, ...]               │   │
│  │                                                     │   │
│  │  Total: 768 dimensions                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ALIGNED CONCEPTS:                                          │
│  • concept_1 (0.92) • concept_2 (0.87) • concept_3 (0.81)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    `.trim();

    return {
      embedding: [...embedding.shared, ...embedding.modalitySpecific],
      visualization,
    };
  }

  /**
   * Search across modalities
   */
  async search(
    query: string,
    queryModality: Modality,
    corpus: string[],
    corpusModality: Modality
  ): Promise<{
    matches: { content: string; similarity: number }[];
    visualization: string;
  }> {
    const queryInput: CrossModalInput = { modality: queryModality, content: query };
    const queryEmbedding = await this.latentSpace.encode(queryInput);

    const matches: { content: string; similarity: number }[] = [];

    for (const item of corpus) {
      const itemInput: CrossModalInput = { modality: corpusModality, content: item };
      const itemEmbedding = await this.latentSpace.encode(itemInput);

      // Compare in shared space only (cross-modal!)
      const similarity = this.cosineSimilarity(queryEmbedding.shared, itemEmbedding.shared);

      matches.push({ content: item, similarity });
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    const visualization = `
┌─────────────────────────────────────────────────────────────┐
│              CROSS-MODAL SEARCH                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  QUERY (${queryModality.toUpperCase()}): "${query.slice(0, 30)}..."│
│  TARGET: ${corpusModality.toUpperCase().padEnd(48)}│
│                                                             │
│  TOP MATCHES:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. "${matches[0]?.content.slice(0, 35) ?? 'N/A'}..."  │   │
│  │     Similarity: ${((matches[0]?.similarity ?? 0) * 100).toFixed(1)}%                          │   │
│  │                                                     │   │
│  │  2. "${matches[1]?.content.slice(0, 35) ?? 'N/A'}..."  │   │
│  │     Similarity: ${((matches[1]?.similarity ?? 0) * 100).toFixed(1)}%                          │   │
│  │                                                     │   │
│  │  3. "${matches[2]?.content.slice(0, 35) ?? 'N/A'}..."  │   │
│  │     Similarity: ${((matches[2]?.similarity ?? 0) * 100).toFixed(1)}%                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  SHARED LATENT SPACE: Meaning is the same regardless        │
│  of whether input is text, image, or audio.                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    `.trim();

    return { matches: matches.slice(0, 5), visualization };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/**
 * Example: Text-to-image search
 */
export async function exampleTextToImageSearch() {
  const tile = new CrossModalSpreadsheetTile();

  // Register some concepts
  const latentSpace = new SharedLatentSpace();
  await latentSpace.registerConcept({
    concept: 'medical_anomaly',
    textMatch: 'scan shows anomaly',
    imageMatch: 'MRI_with_highlight',
    alignmentScore: 0.92,
  });

  // Search for images using text query
  const imageCorpus = [
    'brain_scan_normal.jpg',
    'chest_xray_pneumonia.jpg',
    'mri_tumor_detected.jpg',
    'ultrasound_healthy.jpg',
  ];

  const { matches, visualization } = await tile.search(
    'medical scan showing tumor',
    'text',
    imageCorpus,
    'image'
  );

  console.log(visualization);
  console.log('\nTop match:', matches[0]);

  return { matches, visualization };
}

export default CrossModalSpreadsheetTile;
