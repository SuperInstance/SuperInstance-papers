/**
 * POLLN Cache Utilities
 *
 * Abstract cache manipulation utilities for tensor-like data structures.
 * Inspired by KVCOMM's DynamicCache extensions, adapted for agent system.
 *
 * These utilities operate on generic tensor-like structures and provide:
 * - Slicing caches along sequence dimension
 * - Concatenating multiple caches
 * - Replacing segments within caches
 * - Selecting positions by index
 * - Splitting caches by placeholder spans
 *
 * Key insight: Caches in agent systems represent accumulated computational
 * state (KV pairs, attention patterns, embeddings, etc.) that need efficient
 * manipulation during:
 * - Agent communication (A2A packages)
 * - World model updates
 * - Dream episode generation
 * - Federated learning aggregation
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Generic tensor-like structure
 * Can be arrays, TypedArrays, or nested structures
 */
export type TensorLike =
  | number[]
  | number[][]
  | number[][][]
  | Float32Array
  | Float64Array
  | Int32Array
  | Map<string, TensorLike>
  | Record<string, TensorLike>;

/**
 * Cache representation with sequence dimension
 */
export interface Cache<T extends TensorLike = TensorLike> {
  data: T;
  sequenceLength: number;
  metadata?: CacheMetadata;
}

/**
 * Cache metadata for tracking and validation
 */
export interface CacheMetadata {
  id?: string;
  timestamp?: number;
  sourceAgentId?: string;
  version?: number;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    method: string;
  };
}

/**
 * Slice specification for cache operations
 */
export interface SliceSpec {
  start: number;
  end?: number;
  step?: number;
}

/**
 * Span for splitting operations
 */
export interface Span {
  start: number;
  end: number;
  label?: string;
}

/**
 * Result of cache split operation
 */
export interface SplitResult<T extends TensorLike = TensorLike> {
  segments: Cache<T>[];
  spans: Span[];
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
  validateLength?: boolean;
  cloneData?: boolean;
  preserveMetadata?: boolean;
  onError?: 'throw' | 'return-null' | 'return-empty';
}

// ============================================================================
// Cache Slicer
// ============================================================================

/**
 * CacheSlicer - Slice caches along sequence dimension
 *
 * Extracts subsequences from cached data while maintaining structure.
 * Supports Python-like slicing with start, end, and step parameters.
 */
export class CacheSlicer {
  private defaultOptions: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.defaultOptions = {
      validateLength: true,
      cloneData: true,
      preserveMetadata: true,
      onError: 'throw',
      ...options,
    };
  }

  /**
   * Slice a cache along sequence dimension
   */
  slice<T extends TensorLike>(
    cache: Cache<T>,
    spec: SliceSpec,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateLength && this.validateSlice(cache, spec)) {
        throw new Error(
          `Slice specification [${spec.start}:${spec.end}:${spec.step}] ` +
          `exceeds cache length ${cache.sequenceLength}`
        );
      }

      const slicedData = this.sliceData(cache.data, spec, 0);

      // Compute actual length from sliced data
      const newLength = this.getSequenceLength(slicedData);

      const result: Cache<T> = {
        data: slicedData as T,
        sequenceLength: newLength,
      };

      if (opts.preserveMetadata && cache.metadata) {
        result.metadata = { ...cache.metadata };
      }

      return result;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Get sequence length from data
   */
  private getSequenceLength(data: TensorLike): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (ArrayBuffer.isView(data)) {
      return data.length;
    }
    if (data instanceof Map) {
      return data.size;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    return 1;
  }

  /**
   * Slice multiple caches with same specification
   */
  sliceBatch<T extends TensorLike>(
    caches: Cache<T>[],
    spec: SliceSpec,
    options?: Partial<CacheOptions>
  ): (Cache<T> | null)[] {
    return caches.map(cache => this.slice(cache, spec, options));
  }

  /**
   * Slice with relative positions (negative indices)
   */
  sliceRelative<T extends TensorLike>(
    cache: Cache<T>,
    startFromEnd: number,
    endFromEnd?: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const start = startFromEnd >= 0
      ? startFromEnd
      : cache.sequenceLength + startFromEnd;

    const end = endFromEnd === undefined
      ? undefined
      : endFromEnd >= 0
      ? endFromEnd
      : cache.sequenceLength + endFromEnd;

    return this.slice(cache, { start, end }, options);
  }

  /**
   * Get first N elements
   */
  head<T extends TensorLike>(
    cache: Cache<T>,
    n: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    return this.slice(cache, { start: 0, end: n }, options);
  }

  /**
   * Get last N elements
   */
  tail<T extends TensorLike>(
    cache: Cache<T>,
    n: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    return this.sliceRelative(cache, -n, undefined, options);
  }

  /**
   * Validate slice specification
   */
  private validateSlice<T>(cache: Cache<T>, spec: SliceSpec): boolean {
    const { start, end = cache.sequenceLength } = spec;
    return start < 0 || start > cache.sequenceLength ||
           start > end;
  }

  /**
   * Recursively slice data structure
   */
  private sliceData(data: TensorLike, spec: SliceSpec, depth: number): TensorLike {
    const { start, end, step = 1 } = spec;

    // Handle arrays
    if (Array.isArray(data)) {
      // Check if this is a sequence dimension (outermost) or nested dimension
      // For nested arrays, we only slice the outermost (sequence) dimension
      if (depth === 0 && Array.isArray(data[0])) {
        // This is the sequence dimension - slice the outer array
        const sliced = data.slice(start, end);
        if (step === 1) return sliced;
        return sliced.filter((_, i) => i % step === 0);
      } else if (depth > 0) {
        // Nested dimension - just return as is (don't slice nested elements)
        return data;
      } else {
        // Leaf array at depth 0 - slice it
        const sliced = data.slice(start, end);
        if (step === 1) return sliced;
        return sliced.filter((_, i) => i % step === 0);
      }
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      const sliced = (data as Float32Array).slice(start, end);
      if (step === 1) return sliced;
      return sliced.filter((_, i) => i % step === 0);
    }

    // Handle Map
    if (data instanceof Map) {
      const result = new Map();
      for (const [key, value] of data) {
        result.set(key, this.sliceData(value, spec, depth + 1));
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, TensorLike> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.sliceData(value as TensorLike, spec, depth + 1);
      }
      return result;
    }

    return data;
  }

  /**
   * Compute length of sliced cache
   */
  private computeSliceLength(originalLength: number, spec: SliceSpec): number {
    const { start = 0, end = originalLength, step = 1 } = spec;
    const rawLength = Math.max(0, end - start);
    return Math.ceil(rawLength / step);
  }
}

// ============================================================================
// Cache Concatenator
// ============================================================================

/**
 * CacheConcatenator - Concatenate multiple caches
 *
 * Joins caches along sequence dimension while preserving structure.
 * Validates compatibility before concatenation.
 */
export class CacheConcatenator {
  private defaultOptions: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.defaultOptions = {
      validateLength: true,
      cloneData: true,
      preserveMetadata: true,
      onError: 'throw',
      ...options,
    };
  }

  /**
   * Concatenate multiple caches
   */
  concat<T extends TensorLike>(
    caches: Cache<T>[],
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    if (caches.length === 0) {
      if (opts.onError === 'throw') {
        throw new Error('Cannot concat empty cache array');
      }
      return null;
    }

    try {
      // Validate structure compatibility
      if (opts.validateLength && !this.validateCompatibility(caches)) {
        throw new Error('Caches have incompatible structures');
      }

      const concatenatedData = this.concatData(
        caches.map(c => c.data)
      );

      const totalLength = caches.reduce(
        (sum, c) => sum + c.sequenceLength,
        0
      );

      const result: Cache<T> = {
        data: concatenatedData as T,
        sequenceLength: totalLength,
      };

      if (opts.preserveMetadata) {
        result.metadata = this.mergeMetadata(
          caches.map(c => c.metadata).filter((m): m is CacheMetadata => !!m)
        );
      }

      return result;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Concatenate with separators
   */
  concatWithSeparator<T extends TensorLike>(
    caches: Cache<T>[],
    separator: T,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    if (caches.length === 0) {
      return this.concat(caches, options);
    }

    const sepCache: Cache<T> = {
      data: separator,
      sequenceLength: 1,
    };

    const result: Cache<T>[] = [];
    for (let i = 0; i < caches.length; i++) {
      result.push(caches[i]);
      if (i < caches.length - 1) {
        result.push(sepCache);
      }
    }

    return this.concat(result, options);
  }

  /**
   * Concatenate with overlapping regions
   */
  concatWithOverlap<T extends TensorLike>(
    caches: Cache<T>[],
    overlapSize: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    if (caches.length <= 1) {
      return this.concat(caches, options);
    }

    const slicer = new CacheSlicer(options);
    const adjusted: Cache<T>[] = [];

    for (let i = 0; i < caches.length; i++) {
      if (i === 0) {
        adjusted.push(caches[i]);
      } else {
        // Skip overlapSize elements from beginning
        const sliced = slicer.slice(caches[i], {
          start: overlapSize,
          end: undefined,
        }, options);
        if (sliced) adjusted.push(sliced);
      }
    }

    return this.concat(adjusted, options);
  }

  /**
   * Validate that caches have compatible structures
   */
  private validateCompatibility<T>(caches: Cache<T>[]): boolean {
    if (caches.length <= 1) return true;

    const getSignature = (data: TensorLike): string => {
      if (Array.isArray(data)) {
        if (data.length === 0) return '[]';
        if (typeof data[0] === 'number') return 'number[]';
        return `${getSignature(data[0])}[]`;
      }
      if (ArrayBuffer.isView(data)) {
        return data.constructor.name;
      }
      if (data instanceof Map) {
        if (data.size === 0) return 'Map{}';
        const firstKey = data.keys().next().value;
        return `Map<${typeof firstKey}, ...>`;
      }
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        if (keys.length === 0) return '{}';
        return `{${keys[0]}: ...}`;
      }
      return typeof data;
    };

    const firstSig = getSignature(caches[0].data);
    return caches.every(c => getSignature(c.data) === firstSig);
  }

  /**
   * Recursively concatenate data structures
   * For cache operations, concatenates along the sequence dimension (outermost array)
   */
  private concatData(datas: TensorLike[]): TensorLike {
    if (datas.length === 0) return [];
    if (datas.length === 1) return datas[0];

    const first = datas[0];

    // Handle arrays
    if (Array.isArray(first)) {
      // For cache operations, we concatenate the outermost array (sequence dimension)
      // not element-wise
      const result: TensorLike[] = [];
      for (const d of datas) {
        if (Array.isArray(d)) {
          // Push each element of the array
          for (const item of d) {
            result.push(item);
          }
        }
      }
      return result;
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(first)) {
      const totalLength = datas.reduce((sum, d) =>
        sum + (ArrayBuffer.isView(d) ? d.length : 0), 0
      );

      // Determine TypedArray type
      const TypedArrayConstructor = first.constructor;
      const result = new (TypedArrayConstructor as any)(totalLength);

      let offset = 0;
      for (const d of datas) {
        if (ArrayBuffer.isView(d)) {
          result.set(d, offset);
          offset += d.length;
        }
      }
      return result;
    }

    // Handle Map
    if (first instanceof Map) {
      const result = new Map();
      for (const d of datas) {
        if (d instanceof Map) {
          for (const [key, value] of d) {
            const existing = result.get(key);
            if (existing) {
              result.set(key, this.concatData([existing, value]));
            } else {
              result.set(key, value);
            }
          }
        }
      }
      return result;
    }

    // Handle Record
    if (typeof first === 'object' && first !== null) {
      const result: Record<string, TensorLike> = {};
      for (const d of datas) {
        if (typeof d === 'object' && d !== null) {
          for (const [key, value] of Object.entries(d)) {
            if (result[key]) {
              result[key] = this.concatData([result[key], value as TensorLike]);
            } else {
              result[key] = value as TensorLike;
            }
          }
        }
      }
      return result;
    }

    return first;
  }

  /**
   * Merge metadata from multiple caches
   */
  private mergeMetadata(metadatas: CacheMetadata[]): CacheMetadata {
    if (metadatas.length === 0) return {};

    const result: CacheMetadata = {
      timestamp: Math.max(...metadatas.map(m => m.timestamp || 0)),
      sourceAgentId: metadatas.map(m => m.sourceAgentId).join(','),
      version: Math.max(...metadatas.map(m => m.version || 0)),
    };

    if (metadatas.some(m => m.compressionInfo)) {
      result.compressionInfo = {
        originalSize: metadatas.reduce(
          (sum, m) => sum + (m.compressionInfo?.originalSize || 0),
          0
        ),
        compressedSize: metadatas.reduce(
          (sum, m) => sum + (m.compressionInfo?.compressedSize || 0),
          0
        ),
        method: 'mixed',
      };
    }

    return result;
  }
}

// ============================================================================
// Cache Replacer
// ============================================================================

/**
 * CacheReplacer - Replace segments within caches
 *
 * Replaces subsequences in cache with new data while maintaining structure.
 * Useful for updating agent states, correcting predictions, or inserting data.
 */
export class CacheReplacer {
  private defaultOptions: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.defaultOptions = {
      validateLength: true,
      cloneData: true,
      preserveMetadata: true,
      onError: 'throw',
      ...options,
    };
  }

  /**
   * Replace a segment of cache with new data
   */
  replace<T extends TensorLike>(
    cache: Cache<T>,
    position: number,
    replacement: T,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateLength && position < 0 || position > cache.sequenceLength) {
        throw new Error(
          `Position ${position} out of bounds for cache length ${cache.sequenceLength}`
        );
      }

      const replacedData = this.replaceData(cache.data, position, replacement);
      const replacementLength = this.getSequenceLength(replacement);

      const result: Cache<T> = {
        data: replacedData as T,
        sequenceLength: cache.sequenceLength - 1 + replacementLength,
      };

      if (opts.preserveMetadata) {
        result.metadata = {
          ...cache.metadata,
          timestamp: Date.now(),
          version: (cache.metadata?.version || 0) + 1,
        };
      }

      return result;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Replace a range of positions
   */
  replaceRange<T extends TensorLike>(
    cache: Cache<T>,
    start: number,
    end: number,
    replacement: T,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateLength && (start < 0 || end > cache.sequenceLength || start > end)) {
        throw new Error(
          `Invalid range [${start}, ${end}) for cache length ${cache.sequenceLength}`
        );
      }

      const replacedData = this.replaceRangeData(cache.data, start, end, replacement);
      const replacementLength = this.getSequenceLength(replacement);
      const removedLength = end - start;

      const result: Cache<T> = {
        data: replacedData as T,
        sequenceLength: cache.sequenceLength - removedLength + replacementLength,
      };

      if (opts.preserveMetadata) {
        result.metadata = {
          ...cache.metadata,
          timestamp: Date.now(),
          version: (cache.metadata?.version || 0) + 1,
        };
      }

      return result;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Replace multiple positions at once
   */
  replaceMultiple<T extends TensorLike>(
    cache: Cache<T>,
    replacements: Array<{ position: number; data: T }>,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    // Sort by position descending to avoid index shifting issues
    const sorted = [...replacements].sort((a, b) => b.position - a.position);

    let result: Cache<T> | null = cache;
    for (const { position, data } of sorted) {
      result = this.replace(result, position, data, options);
      if (result === null) return null;
    }

    return result;
  }

  /**
   * Replace by condition (predicate function)
   */
  replaceWhere<T extends TensorLike>(
    cache: Cache<T>,
    predicate: (value: number, index: number) => boolean,
    replacement: number | ((value: number, index: number) => number),
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    try {
      const replacedData = this.replaceWhereData(
        cache.data,
        predicate,
        replacement,
        0
      );

      const result: Cache<T> = {
        data: replacedData as T,
        sequenceLength: cache.sequenceLength,
      };

      if (options?.preserveMetadata !== false) {
        result.metadata = {
          ...cache.metadata,
          timestamp: Date.now(),
          version: (cache.metadata?.version || 0) + 1,
        };
      }

      return result;
    } catch (error) {
      if (options?.onError === 'throw') throw error;
      if (options?.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Recursively replace data at position
   */
  private replaceData(data: TensorLike, position: number, replacement: TensorLike): TensorLike {
    // Handle arrays
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        // Nested array - recurse
        return data.map((item, i) => {
          if (i === position && Array.isArray(replacement)) {
            return replacement;
          }
          return item;
        });
      }
      // Leaf array - replace element
      const result = [...data];
      if (Array.isArray(replacement)) {
        result.splice(position, 1, ...replacement);
      } else {
        result[position] = replacement as number;
      }
      return result;
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      const result = new (data.constructor as any)(data);
      if (ArrayBuffer.isView(replacement)) {
        result.set(replacement, position);
      } else if (Array.isArray(replacement)) {
        for (let i = 0; i < replacement.length; i++) {
          if (position + i < result.length) {
            result[position + i] = replacement[i];
          }
        }
      } else {
        result[position] = replacement as number;
      }
      return result;
    }

    // Handle Map
    if (data instanceof Map) {
      const result = new Map(data);
      for (const [key, value] of result) {
        if (typeof value === 'object' && value !== null) {
          result.set(key, this.replaceData(value as TensorLike, position, replacement));
        }
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, TensorLike> = { ...data };
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = this.replaceData(value as TensorLike, position, replacement);
        }
      }
      return result;
    }

    return data;
  }

  /**
   * Replace a range of data
   */
  private replaceRangeData(
    data: TensorLike,
    start: number,
    end: number,
    replacement: TensorLike
  ): TensorLike {
    // Handle arrays
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        // Nested array - recurse
        return data.map((item, i) => {
          if (i >= start && i < end && Array.isArray(replacement)) {
            return replacement;
          }
          return item;
        });
      }
      // Leaf array - replace range
      const result = [...data];
      result.splice(start, end - start, ...(Array.isArray(replacement) ? replacement : [replacement]));
      return result;
    }

    // Handle TypedArrays - need to create new one with different size
    if (ArrayBuffer.isView(data)) {
      const replacementLength = ArrayBuffer.isView(replacement) ? replacement.length :
                                Array.isArray(replacement) ? replacement.length : 1;
      const newLength = data.length - (end - start) + replacementLength;
      const result = new (data.constructor as any)(newLength);

      // Copy before range
      result.set(data.subarray(0, start), 0);

      // Copy replacement
      if (ArrayBuffer.isView(replacement)) {
        result.set(replacement, start);
      } else if (Array.isArray(replacement)) {
        for (let i = 0; i < replacement.length; i++) {
          result[start + i] = replacement[i];
        }
      } else {
        result[start] = replacement as number;
      }

      // Copy after range
      result.set(data.subarray(end), start + replacementLength);

      return result;
    }

    // For complex structures, fall back to element-wise replacement
    return this.replaceData(data, start, replacement);
  }

  /**
   * Replace by predicate
   */
  private replaceWhereData(
    data: TensorLike,
    predicate: (value: number, index: number) => boolean,
    replacement: number | ((value: number, index: number) => number),
    index: number
  ): TensorLike {
    // Handle arrays
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        // Nested array - recurse
        return data.map((item, i) =>
          this.replaceWhereData(item, predicate, replacement, index)
        );
      }
      // Leaf array - apply predicate
      return data.map((value, i) => {
        if (predicate(value, index + i)) {
          return typeof replacement === 'function'
            ? replacement(value, index + i)
            : replacement;
        }
        return value;
      });
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      const result = new (data.constructor as any)(data);
      for (let i = 0; i < result.length; i++) {
        if (predicate(result[i], index + i)) {
          result[i] = typeof replacement === 'function'
            ? replacement(result[i], index + i)
            : replacement;
        }
      }
      return result;
    }

    // Handle Map
    if (data instanceof Map) {
      const result = new Map();
      for (const [key, value] of data) {
        if (typeof value === 'object' && value !== null) {
          result.set(key, this.replaceWhereData(
            value as TensorLike,
            predicate,
            replacement,
            index
          ));
        } else {
          result.set(key, value);
        }
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, TensorLike> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = this.replaceWhereData(
            value as TensorLike,
            predicate,
            replacement,
            index
          );
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return data;
  }

  /**
   * Get sequence length from data
   */
  private getSequenceLength(data: TensorLike): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (ArrayBuffer.isView(data)) {
      return data.length;
    }
    if (data instanceof Map) {
      return data.size;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    return 1;
  }
}

// ============================================================================
// Cache Index Selector
// ============================================================================

/**
 * CacheIndexSelector - Select positions by index
 *
 * Extracts specific positions from cache using various selection strategies:
 * - Single index
 * - List of indices
 * - Boolean mask
 * - Ranges
 */
export class CacheIndexSelector {
  private defaultOptions: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.defaultOptions = {
      validateLength: true,
      cloneData: true,
      preserveMetadata: true,
      onError: 'throw',
      ...options,
    };
  }

  /**
   * Select by single index
   */
  select<T extends TensorLike>(
    cache: Cache<T>,
    index: number,
    options?: Partial<CacheOptions>
  ): T | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const normalizedIndex = this.normalizeIndex(index, cache.sequenceLength);

      if (opts.validateLength &&
          (normalizedIndex < 0 || normalizedIndex >= cache.sequenceLength)) {
        throw new Error(
          `Index ${index} (normalized: ${normalizedIndex}) ` +
          `out of bounds for cache length ${cache.sequenceLength}`
        );
      }

      return this.selectData(cache.data, normalizedIndex) as T;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      return null;
    }
  }

  /**
   * Select by multiple indices
   */
  selectMany<T extends TensorLike>(
    cache: Cache<T>,
    indices: number[],
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const normalizedIndices = indices.map(i =>
        this.normalizeIndex(i, cache.sequenceLength)
      );

      if (opts.validateLength) {
        for (const idx of normalizedIndices) {
          if (idx < 0 || idx >= cache.sequenceLength) {
            throw new Error(
              `Index ${idx} out of bounds for cache length ${cache.sequenceLength}`
            );
          }
        }
      }

      const selectedData = this.selectManyData(cache.data, normalizedIndices);

      const result: Cache<T> = {
        data: selectedData as T,
        sequenceLength: normalizedIndices.length,
      };

      if (opts.preserveMetadata && cache.metadata) {
        result.metadata = { ...cache.metadata };
      }

      return result;
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Select by boolean mask
   */
  selectMask<T extends TensorLike>(
    cache: Cache<T>,
    mask: boolean[],
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.validateLength && mask.length !== cache.sequenceLength) {
        throw new Error(
          `Mask length ${mask.length} does not match cache length ${cache.sequenceLength}`
        );
      }

      const indices: number[] = [];
      for (let i = 0; i < mask.length; i++) {
        if (mask[i]) indices.push(i);
      }

      return this.selectMany(cache, indices, options);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { data: [] as T, sequenceLength: 0 };
    }
  }

  /**
   * Select by range
   */
  selectRange<T extends TensorLike>(
    cache: Cache<T>,
    start: number,
    end: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const indices: number[] = [];
    for (let i = start; i < end; i++) {
      indices.push(i);
    }
    return this.selectMany(cache, indices, options);
  }

  /**
   * Select every nth element
   */
  selectStrided<T extends TensorLike>(
    cache: Cache<T>,
    stride: number,
    offset: number = 0,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const indices: number[] = [];
    for (let i = offset; i < cache.sequenceLength; i += stride) {
      indices.push(i);
    }
    return this.selectMany(cache, indices, options);
  }

  /**
   * Select random sample
   */
  selectSample<T extends TensorLike>(
    cache: Cache<T>,
    sampleSize: number,
    seed?: number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const rng = this.seededRandom(seed);

    const indices: number[] = [];
    const available = Array.from({ length: cache.sequenceLength }, (_, i) => i);

    for (let i = 0; i < Math.min(sampleSize, cache.sequenceLength); i++) {
      const idx = Math.floor(rng() * available.length);
      indices.push(available[idx]);
      available.splice(idx, 1);
    }

    indices.sort((a, b) => a - b);
    return this.selectMany(cache, indices, options);
  }

  /**
   * Select top-k by some scoring function
   */
  selectTopK<T extends TensorLike>(
    cache: Cache<T>,
    k: number,
    scoreFn: (value: number, index: number) => number,
    options?: Partial<CacheOptions>
  ): Cache<T> | null {
    const scores: Array<{ index: number; score: number }> = [];

    // Flatten the data to get values for scoring
    const flat = this.flattenToLeafArray(cache.data);

    for (let i = 0; i < Math.min(flat.length, cache.sequenceLength); i++) {
      const value = flat[i];
      const score = scoreFn(value, i);
      scores.push({ index: i, score });
    }

    scores.sort((a, b) => b.score - a.score);

    const indices = scores.slice(0, k).map(s => s.index);
    indices.sort((a, b) => a - b);

    return this.selectMany(cache, indices, options);
  }

  /**
   * Flatten data to leaf array for scoring
   */
  private flattenToLeafArray(data: TensorLike): number[] {
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      if (typeof data[0] === 'number') return data as number[];
      return data.flatMap(item => this.flattenToLeafArray(item));
    }
    if (ArrayBuffer.isView(data)) {
      return Array.from(data);
    }
    if (data instanceof Map) {
      const result: number[] = [];
      for (const value of data.values()) {
        if (typeof value === 'number') {
          result.push(value);
        } else if (typeof value === 'object' && value !== null) {
          result.push(...this.flattenToLeafArray(value as TensorLike));
        }
      }
      return result;
    }
    if (typeof data === 'object' && data !== null) {
      const result: number[] = [];
      for (const value of Object.values(data)) {
        if (typeof value === 'number') {
          result.push(value);
        } else if (typeof value === 'object' && value !== null) {
          result.push(...this.flattenToLeafArray(value as TensorLike));
        }
      }
      return result;
    }
    return [];
  }

  /**
   * Normalize negative index
   */
  private normalizeIndex(index: number, length: number): number {
    return index < 0 ? length + index : index;
  }

  /**
   * Recursively select data at index
   */
  private selectData(data: TensorLike, index: number): TensorLike {
    // Handle arrays
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        // Nested array - recurse
        return data.map(item => this.selectData(item, index));
      }
      // Leaf array - return element
      return data[index];
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      return data[index];
    }

    // Handle Map
    if (data instanceof Map) {
      const result = new Map();
      for (const [key, value] of data) {
        if (typeof value === 'object' && value !== null) {
          result.set(key, this.selectData(value as TensorLike, index));
        } else {
          result.set(key, value);
        }
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, TensorLike> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = this.selectData(value as TensorLike, index);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return data;
  }

  /**
   * Select multiple indices
   */
  private selectManyData(data: TensorLike, indices: number[], depth: number = 0): TensorLike {
    // Handle arrays
    if (Array.isArray(data)) {
      if (Array.isArray(data[0]) && depth === 0) {
        // Nested array at sequence dimension - select outer elements
        return indices.map(i => data[i]);
      }
      if (Array.isArray(data[0]) && depth > 0) {
        // Nested array at deeper dimension - recurse without selecting
        return data.map(item => this.selectManyData(item, indices, depth + 1));
      }
      // Leaf array - select elements
      return indices.map(i => data[i]);
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      const TypedArrayConstructor = data.constructor;
      const result = new (TypedArrayConstructor as any)(indices.length);
      for (let i = 0; i < indices.length; i++) {
        result[i] = data[indices[i]];
      }
      return result;
    }

    // Handle Map
    if (data instanceof Map) {
      const result = new Map();
      for (const [key, value] of data) {
        if (typeof value === 'object' && value !== null) {
          result.set(key, this.selectManyData(value as TensorLike, indices));
        } else {
          result.set(key, value);
        }
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, TensorLike> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = this.selectManyData(value as TensorLike, indices);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return data;
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }

    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
}

// ============================================================================
// Cache Splitter
// ============================================================================

/**
 * CacheSplitter - Split caches by placeholder spans
 *
 * Divides cache into segments based on various criteria:
 * - Placeholder values (e.g., zeros, nulls)
 * - Size constraints
 * - Custom split functions
 * - Delimiter patterns
 */
export class CacheSplitter {
  private defaultOptions: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.defaultOptions = {
      validateLength: true,
      cloneData: true,
      preserveMetadata: true,
      onError: 'throw',
      ...options,
    };
  }

  /**
   * Split cache by placeholder spans
   * Finds contiguous runs of placeholder values and splits at boundaries
   * Returns the non-placeholder segments
   */
  splitByPlaceholder<T extends TensorLike>(
    cache: Cache<T>,
    placeholder: number,
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const spans = this.findNonPlaceholderSpans(cache.data, placeholder);
      return this.splitBySpans(cache, spans, opts);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Split by maximum segment size
   */
  splitBySize<T extends TensorLike>(
    cache: Cache<T>,
    maxSize: number,
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const spans: Span[] = [];
      for (let start = 0; start < cache.sequenceLength; start += maxSize) {
        const end = Math.min(start + maxSize, cache.sequenceLength);
        spans.push({ start, end });
      }

      return this.splitBySpans(cache, spans, opts);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Split by delimiter values
   * Removes delimiters and splits at their positions
   */
  splitByDelimiter<T extends TensorLike>(
    cache: Cache<T>,
    delimiter: number,
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const delimiterPositions = this.findDelimiterPositions(cache.data, delimiter);
      const spans = this.createSpansFromPositions(
        delimiterPositions,
        cache.sequenceLength
      );

      return this.splitBySpans(cache, spans, opts);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Split by custom predicate
   */
  splitWhere<T extends TensorLike>(
    cache: Cache<T>,
    predicate: (value: number, index: number) => boolean,
    label?: string,
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const spans = this.findSpansByPredicate(cache.data, predicate, label);
      return this.splitBySpans(cache, spans, opts);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Split into N approximately equal parts
   */
  splitN<T extends TensorLike>(
    cache: Cache<T>,
    n: number,
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const chunkSize = Math.ceil(cache.sequenceLength / n);
      return this.splitBySize(cache, chunkSize, options);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Split at specific indices
   * Splits the cache at the given indices, creating segments between them
   */
  splitAt<T extends TensorLike>(
    cache: Cache<T>,
    indices: number[],
    options?: Partial<CacheOptions>
  ): SplitResult<T> | null {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const sortedIndices = [...indices].sort((a, b) => a - b);

      // Create spans between indices
      const spans: Span[] = [];
      let start = 0;

      for (const index of sortedIndices) {
        if (index > start) {
          spans.push({ start, end: index, label: 'segment' });
        }
        start = index;
      }

      // Add final span
      if (start < cache.sequenceLength) {
        spans.push({ start, end: cache.sequenceLength, label: 'segment' });
      }

      return this.splitBySpans(cache, spans, opts);
    } catch (error) {
      if (opts.onError === 'throw') throw error;
      if (opts.onError === 'return-null') return null;
      return { segments: [], spans: [] };
    }
  }

  /**
   * Find contiguous placeholder spans
   */
  private findPlaceholderSpans(data: TensorLike, placeholder: number): Span[] {
    const flat = this.flattenData(data);

    const spans: Span[] = [];
    let inSpan = false;
    let spanStart = 0;

    for (let i = 0; i < flat.length; i++) {
      const isPlaceholder = flat[i] === placeholder;

      if (isPlaceholder && !inSpan) {
        spanStart = i;
        inSpan = true;
      } else if (!isPlaceholder && inSpan) {
        spans.push({ start: spanStart, end: i, label: 'placeholder' });
        inSpan = false;
      }
    }

    if (inSpan) {
      spans.push({ start: spanStart, end: flat.length, label: 'placeholder' });
    }

    return spans;
  }

  /**
   * Find contiguous non-placeholder spans
   */
  private findNonPlaceholderSpans(data: TensorLike, placeholder: number): Span[] {
    const flat = this.flattenData(data);

    const spans: Span[] = [];
    let inSpan = false;
    let spanStart = 0;

    for (let i = 0; i < flat.length; i++) {
      const isPlaceholder = flat[i] === placeholder;

      if (!isPlaceholder && !inSpan) {
        spanStart = i;
        inSpan = true;
      } else if (isPlaceholder && inSpan) {
        spans.push({ start: spanStart, end: i, label: 'segment' });
        inSpan = false;
      }
    }

    if (inSpan) {
      spans.push({ start: spanStart, end: flat.length, label: 'segment' });
    }

    return spans;
  }

  /**
   * Find delimiter positions
   */
  private findDelimiterPositions(data: TensorLike, delimiter: number): number[] {
    const flat = this.flattenData(data);
    const positions: number[] = [];

    for (let i = 0; i < flat.length; i++) {
      if (flat[i] === delimiter) {
        positions.push(i);
      }
    }

    return positions;
  }

  /**
   * Create spans from split positions
   */
  private createSpansFromPositions(
    positions: number[],
    totalLength: number
  ): Span[] {
    const spans: Span[] = [];
    let lastEnd = 0;

    for (const pos of positions) {
      if (pos > lastEnd) {
        spans.push({ start: lastEnd, end: pos, label: 'segment' });
      }
      lastEnd = pos + 1;
    }

    if (lastEnd < totalLength) {
      spans.push({ start: lastEnd, end: totalLength, label: 'segment' });
    }

    return spans;
  }

  /**
   * Find spans by predicate
   */
  private findSpansByPredicate(
    data: TensorLike,
    predicate: (value: number, index: number) => boolean,
    label?: string
  ): Span[] {
    const flat = this.flattenData(data);

    const spans: Span[] = [];
    let inSpan = false;
    let spanStart = 0;

    for (let i = 0; i < flat.length; i++) {
      const matches = predicate(flat[i], i);

      if (matches && !inSpan) {
        spanStart = i;
        inSpan = true;
      } else if (!matches && inSpan) {
        spans.push({ start: spanStart, end: i, label });
        inSpan = false;
      }
    }

    if (inSpan) {
      spans.push({ start: spanStart, end: flat.length, label });
    }

    return spans;
  }

  /**
   * Split cache by spans
   */
  private splitBySpans<T extends TensorLike>(
    cache: Cache<T>,
    spans: Span[],
    options: CacheOptions
  ): SplitResult<T> {
    const slicer = new CacheSlicer(options);
    const segments: Cache<T>[] = [];

    for (const span of spans) {
      const segment = slicer.slice(cache, {
        start: span.start,
        end: span.end,
      }, options);

      if (segment) {
        segments.push(segment);
      }
    }

    return { segments, spans };
  }

  /**
   * Flatten nested data to array for analysis
   */
  private flattenData(data: TensorLike): number[] {
    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      if (typeof data[0] === 'number') return data as number[];
      return data.flatMap(item =>
        Array.isArray(item) ? this.flattenData(item) : []
      );
    }

    // Handle TypedArrays
    if (ArrayBuffer.isView(data)) {
      return Array.from(data);
    }

    // Handle Map
    if (data instanceof Map) {
      const result: number[] = [];
      for (const value of data.values()) {
        if (typeof value === 'number') {
          result.push(value);
        } else if (typeof value === 'object' && value !== null) {
          result.push(...this.flattenData(value as TensorLike));
        }
      }
      return result;
    }

    // Handle Record
    if (typeof data === 'object' && data !== null) {
      const result: number[] = [];
      for (const value of Object.values(data)) {
        if (typeof value === 'number') {
          result.push(value);
        } else if (typeof value === 'object' && value !== null) {
          result.push(...this.flattenData(value as TensorLike));
        }
      }
      return result;
    }

    return [];
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep clone cache data
 */
export function cloneCacheData<T extends TensorLike>(data: T): T {
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item =>
      Array.isArray(item) || typeof item === 'object' ?
        cloneCacheData(item) : item
    ) as T;
  }

  // Handle TypedArrays (need to copy buffer)
  if (ArrayBuffer.isView(data)) {
    const TypedArrayConstructor = data.constructor;
    return new (TypedArrayConstructor as any)(data) as T;
  }

  // Handle Map
  if (data instanceof Map) {
    const result = new Map();
    for (const [key, value] of data) {
      result.set(key, cloneCacheData(value));
    }
    return result as T;
  }

  // Handle Record
  if (typeof data === 'object' && data !== null) {
    const result: Record<string, TensorLike> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = cloneCacheData(value);
    }
    return result as T;
  }

  return data;
}

/**
 * Validate cache structure
 */
export function validateCache<T extends TensorLike>(cache: Cache<T>): boolean {
  if (!cache.data) return false;
  if (typeof cache.sequenceLength !== 'number') return false;
  if (cache.sequenceLength < 0) return false;

  // Additional validation could be added here
  return true;
}

/**
 * Get cache statistics
 */
export function getCacheStats<T extends TensorLike>(
  cache: Cache<T>
): {
  sequenceLength: number;
  dataSize: number;
  dataType: string;
  hasMetadata: boolean;
} {
  const flat = flattenCacheData(cache.data);

  return {
    sequenceLength: cache.sequenceLength,
    dataSize: flat.length,
    dataType: Array.isArray(cache.data) ? 'array' :
               ArrayBuffer.isView(cache.data) ? 'typedarray' :
               cache.data instanceof Map ? 'map' : 'object',
    hasMetadata: !!cache.metadata,
  };
}

/**
 * Flatten cache data for analysis
 */
function flattenCacheData(data: TensorLike): number[] {
  const splitter = new CacheSplitter();
  return splitter['flattenData'](data);
}

/**
 * Default cache utilities instance
 */
export const cacheSlicer = new CacheSlicer();
export const cacheConcatenator = new CacheConcatenator();
export const cacheReplacer = new CacheReplacer();
export const cacheIndexSelector = new CacheIndexSelector();
export const cacheSplitter = new CacheSplitter();
