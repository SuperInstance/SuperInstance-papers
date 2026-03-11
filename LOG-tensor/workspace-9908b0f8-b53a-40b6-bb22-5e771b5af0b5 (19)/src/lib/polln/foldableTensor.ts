/**
 * POLLN-RTT Round 5: Foldable Tensors
 * 
 * F = (F_flat, C, P, K)
 * High-dimensional tensors encoded in 2D with folding instructions
 */

export interface CreasePattern {
  axis: number;
  position: number;
  type?: 'mountain' | 'valley';
}

export interface PermutationOp {
  permutation: number[];
  axis: number;
}

export interface AssemblyKey {
  hash: string;
  timestamp: string;
  operations: string[];
}

export interface FoldableTensorState {
  originalShape: number[];
  flatData: number[];
  creases: CreasePattern[];
  permutations: PermutationOp[];
  assemblyKeys: AssemblyKey[];
}

export class FoldableTensor {
  private shape: number[];
  private data: number[];
  private creases: CreasePattern[];
  private permutations: PermutationOp[];
  private assemblyKeys: AssemblyKey[];

  constructor(shape: number[], initialData?: number[]) {
    this.shape = shape;
    const totalSize = shape.reduce((a, b) => a * b, 1);
    this.data = initialData ?? Array(totalSize).fill(0);
    this.creases = [];
    this.permutations = [];
    this.assemblyKeys = [];
  }

  /**
   * Get total number of elements
   */
  get size(): number {
    return this.data.length;
  }

  /**
   * Flatten to 2D representation
   */
  flatten(): { flat: number[]; shape2d: [number, number] } {
    const lastDim = this.shape[this.shape.length - 1] ?? 1;
    const rows = Math.floor(this.data.length / lastDim);
    return {
      flat: [...this.data],
      shape2d: [rows, lastDim]
    };
  }

  /**
   * Add a crease pattern
   */
  addCrease(axis: number, position: number, type: 'mountain' | 'valley' = 'mountain'): void {
    this.creases.push({ axis, position, type });
  }

  /**
   * Apply permutation along an axis
   */
  applyPermutation(perm: number[], axis: number = 0): void {
    this.permutations.push({ permutation: [...perm], axis });
    // Note: Actual permutation logic would be more complex for n-d arrays
  }

  /**
   * Compute assembly key (blockchain-like hash)
   */
  computeAssemblyKey(): string {
    const state = {
      shape: this.shape,
      dataHash: this.simpleHash(this.data),
      creases: this.creases,
      permutations: this.permutations.length
    };
    
    const hash = this.simpleHash(JSON.stringify(state));
    const key: AssemblyKey = {
      hash,
      timestamp: new Date().toISOString(),
      operations: [
        ...this.creases.map(c => `fold(${c.axis},${c.position})`),
        ...this.permutations.map(p => `perm(${p.axis})`)
      ]
    };
    
    this.assemblyKeys.push(key);
    return hash;
  }

  /**
   * Simple hash function (for demonstration)
   */
  private simpleHash(input: string | number[]): string {
    let hash = 0;
    const str = typeof input === 'string' ? input : input.join(',');
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Encode tensor as 2D with instructions
   */
  encode2D(): { flat: number[]; shape2d: [number, number]; instructions: object } {
    const { flat, shape2d } = this.flatten();
    
    return {
      flat,
      shape2d,
      instructions: {
        originalShape: this.shape,
        creases: this.creases,
        permutations: this.permutations,
        assemblyKeys: this.assemblyKeys
      }
    };
  }

  /**
   * Set data
   */
  setData(data: number[]): void {
    this.data = [...data];
  }

  /**
   * Get state
   */
  getState(): FoldableTensorState {
    const { flat } = this.flatten();
    return {
      originalShape: this.shape,
      flatData: flat,
      creases: [...this.creases],
      permutations: [...this.permutations],
      assemblyKeys: [...this.assemblyKeys]
    };
  }

  /**
   * Compute folding group order: |G_F| = 2^(n-1) × n!
   */
  static computeFoldingGroupOrder(n: number): number {
    const factorial = (x: number): number => x <= 1 ? 1 : x * factorial(x - 1);
    return Math.pow(2, n - 1) * factorial(n);
  }

  /**
   * Generate random tensor data
   */
  static random(shape: number[]): FoldableTensor {
    const size = shape.reduce((a, b) => a * b, 1);
    const data = Array.from({ length: size }, () => Math.random());
    return new FoldableTensor(shape, data);
  }
}

export default FoldableTensor;
