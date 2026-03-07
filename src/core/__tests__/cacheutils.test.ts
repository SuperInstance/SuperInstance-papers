/**
 * POLLN Cache Utilities Tests
 *
 * Tests for cache manipulation utilities inspired by KVCOMM's DynamicCache extensions.
 */

import {
  CacheSlicer,
  CacheConcatenator,
  CacheReplacer,
  CacheIndexSelector,
  CacheSplitter,
  cacheSlicer,
  cacheConcatenator,
  cacheReplacer,
  cacheIndexSelector,
  cacheSplitter,
  cloneCacheData,
  validateCache,
  getCacheStats,
  type Cache,
  type TensorLike,
  type SliceSpec,
  type Span,
  type SplitResult,
} from '../cacheutils';

describe('CacheSlicer', () => {
  let slicer: CacheSlicer;

  beforeEach(() => {
    slicer = new CacheSlicer();
  });

  describe('Basic Slicing', () => {
    it('should slice simple array cache', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = slicer.slice(cache, { start: 1, end: 4 });

      expect(result).not.toBeNull();
      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([2, 3, 4]);
    });

    it('should slice with step parameter', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8],
        sequenceLength: 8,
      };

      const result = slicer.slice(cache, { start: 0, end: 8, step: 2 });

      expect(result?.sequenceLength).toBe(4);
      expect(result?.data).toEqual([1, 3, 5, 7]);
    });

    it('should slice nested array cache', () => {
      const cache: Cache<number[][]> = {
        data: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        sequenceLength: 3,
      };

      const result = slicer.slice(cache, { start: 0, end: 2 });

      expect(result?.sequenceLength).toBe(2);
      expect(result?.data).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ]);
    });

    it('should slice TypedArray cache', () => {
      const cache: Cache<Float32Array> = {
        data: new Float32Array([1, 2, 3, 4, 5]),
        sequenceLength: 5,
      };

      const result = slicer.slice(cache, { start: 1, end: 4 });

      expect(result?.sequenceLength).toBe(3);
      expect(Array.from(result?.data as Float32Array)).toEqual([2, 3, 4]);
    });

    it('should handle empty slice', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      const result = slicer.slice(cache, { start: 0, end: 0 });

      expect(result?.sequenceLength).toBe(0);
      expect(result?.data).toEqual([]);
    });
  });

  describe('Relative Slicing', () => {
    it('should slice with negative indices', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = slicer.sliceRelative(cache, -3, -1);

      expect(result?.sequenceLength).toBe(2);
      expect(result?.data).toEqual([3, 4]);
    });

    it('should get head of cache', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = slicer.head(cache, 3);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([1, 2, 3]);
    });

    it('should get tail of cache', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = slicer.tail(cache, 3);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([3, 4, 5]);
    });
  });

  describe('Batch Slicing', () => {
    it('should slice multiple caches with same specification', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2, 3], sequenceLength: 3 },
        { data: [4, 5, 6], sequenceLength: 3 },
        { data: [7, 8, 9], sequenceLength: 3 },
      ];

      const results = slicer.sliceBatch(caches, { start: 1, end: 3 });

      expect(results.length).toBe(3);
      expect(results[0]?.data).toEqual([2, 3]);
      expect(results[1]?.data).toEqual([5, 6]);
      expect(results[2]?.data).toEqual([8, 9]);
    });

    it('should handle batch with valid slices', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2, 3], sequenceLength: 3 },
        { data: [4, 5], sequenceLength: 2 },
      ];

      // Slice [0:5] on both - implementation returns what exists (doesn't validate end > length)
      const results = slicer.sliceBatch(caches, { start: 0, end: 5 }, {
        onError: 'return-null',
      });

      expect(results[0]).not.toBeNull();
      expect(results[0]?.data).toEqual([1, 2, 3]);
      // Second cache returns its full content, not null (slice is lenient)
      expect(results[1]).not.toBeNull();
      expect(results[1]?.data).toEqual([4, 5]);
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve metadata when configured', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
        metadata: {
          id: 'test-cache',
          timestamp: Date.now(),
          sourceAgentId: 'agent-1',
          version: 2,
        },
      };

      const result = slicer.slice(cache, { start: 1, end: 4 });

      expect(result?.metadata).toEqual(cache.metadata);
    });

    it('should not preserve metadata when configured', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
        metadata: {
          id: 'test-cache',
          timestamp: Date.now(),
        },
      };

      const result = slicer.slice(cache, { start: 1, end: 4 }, {
        preserveMetadata: false,
      });

      expect(result?.metadata).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid slice when configured', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      expect(() =>
        slicer.slice(cache, { start: -1, end: 5 }, { onError: 'throw' })
      ).toThrow();
    });

    it('should return null on invalid slice when configured', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      const result = slicer.slice(cache, { start: -1, end: 5 }, {
        onError: 'return-null',
      });

      expect(result).toBeNull();
    });

    it('should return empty cache on invalid slice when configured', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      const result = slicer.slice(cache, { start: -1, end: 5 }, {
        onError: 'return-empty',
      });

      expect(result).toEqual({ data: [], sequenceLength: 0 });
    });
  });
});

describe('CacheConcatenator', () => {
  let concatenator: CacheConcatenator;

  beforeEach(() => {
    concatenator = new CacheConcatenator();
  });

  describe('Basic Concatenation', () => {
    it('should concatenate simple array caches', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2], sequenceLength: 2 },
        { data: [3, 4], sequenceLength: 2 },
        { data: [5, 6], sequenceLength: 2 },
      ];

      const result = concatenator.concat(caches);

      expect(result).not.toBeNull();
      expect(result?.sequenceLength).toBe(6);
      expect(result?.data).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should concatenate nested array caches', () => {
      const caches: Cache<number[][]>[] = [
        { data: [[1, 2], [3, 4]], sequenceLength: 2 },
        { data: [[5, 6], [7, 8]], sequenceLength: 2 },
      ];

      const result = concatenator.concat(caches);

      expect(result?.sequenceLength).toBe(4);
      expect(result?.data).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ]);
    });

    it('should concatenate TypedArray caches', () => {
      const caches: Cache<Float32Array>[] = [
        { data: new Float32Array([1, 2]), sequenceLength: 2 },
        { data: new Float32Array([3, 4]), sequenceLength: 2 },
      ];

      const result = concatenator.concat(caches);

      expect(result?.sequenceLength).toBe(4);
      expect(Array.from(result?.data as Float32Array)).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty cache array', () => {
      const result = concatenator.concat([], { onError: 'return-null' });

      expect(result).toBeNull();
    });

    it('should handle single cache', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2, 3], sequenceLength: 3 },
      ];

      const result = concatenator.concat(caches);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([1, 2, 3]);
    });
  });

  describe('Separator Concatenation', () => {
    it('should concatenate with separator', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2], sequenceLength: 2 },
        { data: [3, 4], sequenceLength: 2 },
      ];

      // Separator must match the cache structure (single element array)
      const result = concatenator.concatWithSeparator(caches, [0]);

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([1, 2, 0, 3, 4]);
    });

    it('should concatenate multiple caches with separators', () => {
      const caches: Cache<number[]>[] = [
        { data: [1], sequenceLength: 1 },
        { data: [2], sequenceLength: 1 },
        { data: [3], sequenceLength: 1 },
      ];

      const result = concatenator.concatWithSeparator(caches, [-1]);

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([1, -1, 2, -1, 3]);
    });
  });

  describe('Overlap Concatenation', () => {
    it('should concatenate with overlap', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2, 3, 4], sequenceLength: 4 },
        { data: [3, 4, 5, 6], sequenceLength: 4 },
      ];

      const result = concatenator.concatWithOverlap(caches, 2);

      expect(result?.sequenceLength).toBe(6);
      expect(result?.data).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle multiple caches with overlap', () => {
      const caches: Cache<number[]>[] = [
        { data: [1, 2, 3], sequenceLength: 3 },
        { data: [2, 3, 4], sequenceLength: 3 },
        { data: [3, 4, 5], sequenceLength: 3 },
      ];

      const result = concatenator.concatWithOverlap(caches, 2);

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Metadata Merging', () => {
    it('should merge metadata from multiple caches', () => {
      const caches: Cache<number[]>[] = [
        {
          data: [1, 2],
          sequenceLength: 2,
          metadata: {
            id: 'cache-1',
            timestamp: 1000,
            sourceAgentId: 'agent-1',
            version: 1,
          },
        },
        {
          data: [3, 4],
          sequenceLength: 2,
          metadata: {
            id: 'cache-2',
            timestamp: 2000,
            sourceAgentId: 'agent-2',
            version: 2,
          },
        },
      ];

      const result = concatenator.concat(caches);

      expect(result?.metadata).toBeDefined();
      expect(result?.metadata?.timestamp).toBe(2000);
      expect(result?.metadata?.sourceAgentId).toBe('agent-1,agent-2');
      expect(result?.metadata?.version).toBe(2);
    });
  });
});

describe('CacheReplacer', () => {
  let replacer: CacheReplacer;

  beforeEach(() => {
    replacer = new CacheReplacer();
  });

  describe('Single Position Replacement', () => {
    it('should replace element at position', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replace(cache, 2, 99);

      expect(result).not.toBeNull();
      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([1, 2, 99, 4, 5]);
    });

    it('should replace with array (insertion)', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replace(cache, 2, [9, 10]);

      expect(result?.sequenceLength).toBe(6);
      expect(result?.data).toEqual([1, 2, 9, 10, 4, 5]);
    });

    it('should replace in TypedArray', () => {
      const cache: Cache<Float32Array> = {
        data: new Float32Array([1, 2, 3, 4, 5]),
        sequenceLength: 5,
      };

      const result = replacer.replace(cache, 2, 99);

      expect(result?.sequenceLength).toBe(5);
      expect(Array.from(result?.data as Float32Array)).toEqual([
        1, 2, 99, 4, 5,
      ]);
    });
  });

  describe('Range Replacement', () => {
    it('should replace range with single value', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceRange(cache, 1, 4, 99);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([1, 99, 5]);
    });

    it('should replace range with multiple values', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceRange(cache, 1, 3, [9, 10, 11]);

      expect(result?.sequenceLength).toBe(6);
      expect(result?.data).toEqual([1, 9, 10, 11, 4, 5]);
    });

    it('should replace at beginning', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceRange(cache, 0, 2, [9, 10]);

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([9, 10, 3, 4, 5]);
    });

    it('should replace at end', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceRange(cache, 3, 5, [9, 10]);

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data).toEqual([1, 2, 3, 9, 10]);
    });
  });

  describe('Multiple Replacements', () => {
    it('should replace multiple positions', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceMultiple(
        cache,
        [
          { position: 0, data: 10 },
          { position: 2, data: 30 },
          { position: 4, data: 50 },
        ],
        { validateLength: false }
      );

      expect(result?.data).toEqual([10, 2, 30, 4, 50]);
    });
  });

  describe('Conditional Replacement', () => {
    it('should replace where predicate is true', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceWhere(
        cache,
        (value) => value % 2 === 0,
        0
      );

      expect(result?.data).toEqual([1, 0, 3, 0, 5]);
    });

    it('should replace with function', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = replacer.replaceWhere(
        cache,
        (value) => value > 2,
        (value) => value * 2
      );

      expect(result?.data).toEqual([1, 2, 6, 8, 10]);
    });
  });

  describe('Metadata Updates', () => {
    it('should update version on replacement', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
        metadata: { version: 2 },
      };

      const result = replacer.replace(cache, 1, 99);

      expect(result?.metadata?.version).toBe(3);
    });

    it('should update timestamp on replacement', () => {
      const before = Date.now();
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
        metadata: { timestamp: before - 1000 },
      };

      const result = replacer.replace(cache, 1, 99);

      expect(result?.metadata?.timestamp).toBeGreaterThanOrEqual(before);
    });
  });
});

describe('CacheIndexSelector', () => {
  let selector: CacheIndexSelector;

  beforeEach(() => {
    selector = new CacheIndexSelector();
  });

  describe('Single Index Selection', () => {
    it('should select by positive index', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.select(cache, 2);

      expect(result).toBe(3);
    });

    it('should select by negative index', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.select(cache, -2);

      expect(result).toBe(4);
    });

    it('should select from nested array', () => {
      const cache: Cache<number[][]> = {
        data: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        sequenceLength: 3,
      };

      const result = selector.select(cache, 1);

      // Selects index 1 from each nested array (recursive selection for KV-cache layers)
      expect(result).toEqual([2, 4, 6]);
    });

    it('should return null for out of bounds', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      const result = selector.select(cache, 10, { onError: 'return-null' });

      expect(result).toBeNull();
    });
  });

  describe('Multiple Index Selection', () => {
    it('should select multiple indices', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectMany(cache, [0, 2, 4]);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([1, 3, 5]);
    });

    it('should handle unsorted indices', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectMany(cache, [4, 1, 3]);

      expect(result?.data).toEqual([5, 2, 4]);
    });

    it('should handle duplicate indices', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectMany(cache, [1, 1, 2, 2]);

      expect(result?.data).toEqual([2, 2, 3, 3]);
    });
  });

  describe('Mask Selection', () => {
    it('should select by boolean mask', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectMask(cache, [true, false, true, false, true]);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([1, 3, 5]);
    });

    it('should reject mismatched mask length', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectMask(
        cache,
        [true, false, true],
        { onError: 'return-null' }
      );

      expect(result).toBeNull();
    });
  });

  describe('Range Selection', () => {
    it('should select range', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectRange(cache, 1, 4);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([2, 3, 4]);
    });
  });

  describe('Strided Selection', () => {
    it('should select every nth element', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8],
        sequenceLength: 8,
      };

      const result = selector.selectStrided(cache, 2);

      expect(result?.sequenceLength).toBe(4);
      expect(result?.data).toEqual([1, 3, 5, 7]);
    });

    it('should select with offset', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8],
        sequenceLength: 8,
      };

      const result = selector.selectStrided(cache, 3, 1);

      // Starting at index 1, every 3rd element: indices [1, 4, 7] = [2, 5, 8]
      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([2, 5, 8]);
    });
  });

  describe('Random Sampling', () => {
    it('should select random sample', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sequenceLength: 10,
      };

      const result = selector.selectSample(cache, 5, 42); // seeded

      expect(result?.sequenceLength).toBe(5);
      expect(result?.data.length).toBe(5);
    });

    it('should produce different samples with different seeds', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sequenceLength: 10,
      };

      const result1 = selector.selectSample(cache, 5, 1);
      const result2 = selector.selectSample(cache, 5, 2);

      expect(result1?.data).not.toEqual(result2?.data);
    });
  });

  describe('Top-K Selection', () => {
    it('should select top-k by score', () => {
      const cache: Cache<number[]> = {
        data: [3, 1, 4, 1, 5, 9, 2, 6],
        sequenceLength: 8,
      };

      const result = selector.selectTopK(cache, 3, (value) => value);

      expect(result?.sequenceLength).toBe(3);
      expect(result?.data).toEqual([5, 9, 6]); // top 3 values
    });

    it('should select top-k by custom score function', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = selector.selectTopK(
        cache,
        2,
        (value, index) => value + index
      );

      expect(result?.sequenceLength).toBe(2);
      // scores: [1, 3, 5, 7, 9] -> top 2 indices are 4 (score 9) and 3 (score 7)
      // Implementation returns values in original order (sorted by index)
      expect(result?.data).toEqual([4, 5]);
    });
  });
});

describe('CacheSplitter', () => {
  let splitter: CacheSplitter;

  beforeEach(() => {
    splitter = new CacheSplitter();
  });

  describe('Placeholder Splitting', () => {
    it('should split by placeholder value', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 0, 0, 3, 4, 0, 5, 6],
        sequenceLength: 9,
      };

      const result = splitter.splitByPlaceholder(cache, 0);

      // Three non-placeholder segments: [1,2], [3,4], [5,6]
      expect(result).not.toBeNull();
      expect(result?.spans).toHaveLength(3);
      expect(result?.segments).toHaveLength(3);
      expect(result?.segments[0]?.data).toEqual([1, 2]);
      expect(result?.segments[1]?.data).toEqual([3, 4]);
      expect(result?.segments[2]?.data).toEqual([5, 6]);
    });

    it('should handle cache without placeholders', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
      };

      const result = splitter.splitByPlaceholder(cache, 0);

      // No placeholders means one segment for the entire cache
      expect(result?.spans).toHaveLength(1);
      expect(result?.spans[0]?.start).toBe(0);
      expect(result?.spans[0]?.end).toBe(5);
      expect(result?.segments).toHaveLength(1);
      expect(result?.segments[0]?.data).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle all placeholders', () => {
      const cache: Cache<number[]> = {
        data: [0, 0, 0, 0],
        sequenceLength: 4,
      };

      const result = splitter.splitByPlaceholder(cache, 0);

      // All placeholders means no non-placeholder spans
      expect(result?.spans).toHaveLength(0);
      expect(result?.segments).toHaveLength(0);
    });
  });

  describe('Size-Based Splitting', () => {
    it('should split by max size', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sequenceLength: 10,
      };

      const result = splitter.splitBySize(cache, 3);

      expect(result?.segments).toHaveLength(4);
      expect(result?.segments[0]?.sequenceLength).toBe(3);
      expect(result?.segments[1]?.sequenceLength).toBe(3);
      expect(result?.segments[2]?.sequenceLength).toBe(3);
      expect(result?.segments[3]?.sequenceLength).toBe(1);
    });

    it('should split into equal parts', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        sequenceLength: 10,
      };

      const result = splitter.splitN(cache, 3);

      expect(result?.segments).toHaveLength(3);
    });
  });

  describe('Delimiter Splitting', () => {
    it('should split by delimiter values', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, -1, 3, 4, -1, 5, 6],
        sequenceLength: 8,
      };

      const result = splitter.splitByDelimiter(cache, -1);

      expect(result?.segments).toHaveLength(3);
      expect(result?.segments[0]?.data).toEqual([1, 2]);
      expect(result?.segments[1]?.data).toEqual([3, 4]);
      expect(result?.segments[2]?.data).toEqual([5, 6]);
    });

    it('should handle consecutive delimiters', () => {
      const cache: Cache<number[]> = {
        data: [1, -1, -1, 2, -1, 3],
        sequenceLength: 6,
      };

      const result = splitter.splitByDelimiter(cache, -1);

      expect(result?.segments).toHaveLength(3);
      expect(result?.segments[0]?.data).toEqual([1]);
      expect(result?.segments[1]?.data).toEqual([2]);
      expect(result?.segments[2]?.data).toEqual([3]);
    });
  });

  describe('Predicate Splitting', () => {
    it('should split by predicate', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 10, 20, 3, 4, 30, 5],
        sequenceLength: 8,
      };

      const result = splitter.splitWhere(cache, (v) => v >= 10, 'high');

      expect(result?.spans).toHaveLength(2);
      expect(result?.segments).toHaveLength(2);
      expect(result?.segments[0]?.data).toEqual([10, 20]);
      expect(result?.segments[1]?.data).toEqual([30]);
    });
  });

  describe('Index-Based Splitting', () => {
    it('should split at specific indices', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5, 6, 7, 8],
        sequenceLength: 8,
      };

      const result = splitter.splitAt(cache, [2, 5, 7]);

      // splitAt creates segments: [0:2], [2:5], [5:7], [7:8]
      expect(result?.segments).toHaveLength(4);
      expect(result?.segments[0]?.data).toEqual([1, 2]);
      expect(result?.segments[1]?.data).toEqual([3, 4, 5]);
      expect(result?.segments[2]?.data).toEqual([6, 7]);
      expect(result?.segments[3]?.data).toEqual([8]);
    });
  });

  describe('Span Labels', () => {
    it('should preserve span labels', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 0, 0, 3, 4],
        sequenceLength: 6,
      };

      const result = splitter.splitByPlaceholder(cache, 0);

      // splitByPlaceholder returns non-placeholder spans with 'segment' label
      // Data [1, 2, 0, 0, 3, 4] has segments [1, 2] and [3, 4]
      expect(result?.spans).toHaveLength(2);
      expect(result?.spans[0]?.label).toBe('segment');
      expect(result?.spans[1]?.label).toBe('segment');
      expect(result?.segments[0]?.data).toEqual([1, 2]);
      expect(result?.segments[1]?.data).toEqual([3, 4]);
    });

    it('should use custom labels with splitWhere', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 10, 3, 4, 20, 5],
        sequenceLength: 7,
      };

      const result = splitter.splitWhere(cache, (v) => v >= 10, 'special');

      // splitWhere returns spans that match the predicate with the custom label
      expect(result?.spans).toHaveLength(2);
      expect(result?.spans[0]?.label).toBe('special');
      expect(result?.spans[1]?.label).toBe('special');
      expect(result?.segments[0]?.data).toEqual([10]);
      expect(result?.segments[1]?.data).toEqual([20]);
    });
  });
});

describe('Utility Functions', () => {
  describe('cloneCacheData', () => {
    it('should clone simple array', () => {
      const original = [1, 2, 3, 4, 5];
      const cloned = cloneCacheData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone nested array', () => {
      const original = [
        [1, 2],
        [3, 4],
      ];
      const cloned = cloneCacheData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[0]).not.toBe(original[0]);
    });

    it('should clone TypedArray', () => {
      const original = new Float32Array([1, 2, 3, 4, 5]);
      const cloned = cloneCacheData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone Map', () => {
      const original = new Map([
        ['a', [1, 2]],
        ['b', [3, 4]],
      ]);
      const cloned = cloneCacheData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone Record', () => {
      const original = { a: [1, 2], b: [3, 4] };
      const cloned = cloneCacheData(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('validateCache', () => {
    it('should validate valid cache', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      expect(validateCache(cache)).toBe(true);
    });

    it('should reject cache without data', () => {
      const cache = { data: null, sequenceLength: 3 } as unknown as Cache<number[]>;

      expect(validateCache(cache)).toBe(false);
    });

    it('should reject cache with negative sequence length', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: -1,
      };

      expect(validateCache(cache)).toBe(false);
    });

    it('should reject cache with non-number sequence length', () => {
      const cache = {
        data: [1, 2, 3],
        sequenceLength: '3' as unknown as number,
      };

      expect(validateCache(cache)).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should get stats for array cache', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3, 4, 5],
        sequenceLength: 5,
        metadata: { id: 'test' },
      };

      const stats = getCacheStats(cache);

      expect(stats.sequenceLength).toBe(5);
      expect(stats.dataSize).toBe(5);
      expect(stats.dataType).toBe('array');
      expect(stats.hasMetadata).toBe(true);
    });

    it('should get stats for TypedArray cache', () => {
      const cache: Cache<Float32Array> = {
        data: new Float32Array([1, 2, 3, 4, 5]),
        sequenceLength: 5,
      };

      const stats = getCacheStats(cache);

      expect(stats.sequenceLength).toBe(5);
      expect(stats.dataSize).toBe(5);
      expect(stats.dataType).toBe('typedarray');
    });

    it('should get stats for Map cache', () => {
      const cache: Cache<Map<string, number[]>> = {
        data: new Map([['a', [1, 2, 3]]]),
        sequenceLength: 3,
      };

      const stats = getCacheStats(cache);

      expect(stats.dataType).toBe('map');
    });

    it('should detect absence of metadata', () => {
      const cache: Cache<number[]> = {
        data: [1, 2, 3],
        sequenceLength: 3,
      };

      const stats = getCacheStats(cache);

      expect(stats.hasMetadata).toBe(false);
    });
  });
});

describe('Default Instances', () => {
  it('should provide default cacheSlicer instance', () => {
    expect(cacheSlicer).toBeInstanceOf(CacheSlicer);
  });

  it('should provide default cacheConcatenator instance', () => {
    expect(cacheConcatenator).toBeInstanceOf(CacheConcatenator);
  });

  it('should provide default cacheReplacer instance', () => {
    expect(cacheReplacer).toBeInstanceOf(CacheReplacer);
  });

  it('should provide default cacheIndexSelector instance', () => {
    expect(cacheIndexSelector).toBeInstanceOf(CacheIndexSelector);
  });

  it('should provide default cacheSplitter instance', () => {
    expect(cacheSplitter).toBeInstanceOf(CacheSplitter);
  });

  it('should work with default instances', () => {
    const cache: Cache<number[]> = {
      data: [1, 2, 3, 4, 5],
      sequenceLength: 5,
    };

    const sliced = cacheSlicer.slice(cache, { start: 1, end: 4 });
    expect(sliced?.data).toEqual([2, 3, 4]);

    const selected = cacheIndexSelector.select(cache, 2);
    expect(selected).toBe(3);
  });
});

describe('Integration Tests', () => {
  it('should handle complex multi-step operations', () => {
    const cache1: Cache<number[]> = {
      data: [1, 2, 3, 4, 5],
      sequenceLength: 5,
      metadata: { id: 'cache1', version: 1 },
    };

    const cache2: Cache<number[]> = {
      data: [6, 7, 8, 9, 10],
      sequenceLength: 5,
      metadata: { id: 'cache2', version: 1 },
    };

    // Concatenate
    const concatenated = cacheConcatenator.concat([cache1, cache2]);
    expect(concatenated?.sequenceLength).toBe(10);

    // Slice
    const sliced = cacheSlicer.slice(concatenated!, { start: 2, end: 8 });
    expect(sliced?.sequenceLength).toBe(6);
    expect(sliced?.data).toEqual([3, 4, 5, 6, 7, 8]);

    // Replace
    const replaced = cacheReplacer.replace(sliced!, 2, 99);
    expect(replaced?.data).toEqual([3, 4, 99, 6, 7, 8]);

    // Split
    const split = cacheSplitter.splitBySize(replaced!, 2);
    expect(split?.segments.length).toBe(3);
  });

  it('should work with world model cache scenarios', () => {
    // Simulate world model cache (latent states)
    const latentCache: Cache<number[][]> = {
      data: Array.from({ length: 10 }, () =>
        Array.from({ length: 64 }, () => Math.random())
      ),
      sequenceLength: 10,
      metadata: {
        id: 'world-model-cache',
        sourceAgentId: 'world-model',
        version: 1,
      },
    };

    // Get recent states
    const recentStates = cacheSlicer.tail(latentCache, 3);
    expect(recentStates?.sequenceLength).toBe(3);

    // Select specific timesteps
    const timesteps = cacheIndexSelector.selectMany(latentCache, [0, 5, 9]);
    expect(timesteps?.sequenceLength).toBe(3);

    // Split into training batches
    const batches = cacheSplitter.splitBySize(latentCache, 4);
    expect(batches?.segments.length).toBe(3);
  });

  it('should handle value network cache scenarios', () => {
    // Simulate value predictions cache
    const valueCache: Cache<number[]> = {
      data: [0.1, 0.5, 0.8, 0.3, 0.9, 0.2, 0.7, 0.4],
      sequenceLength: 8,
    };

    // Select high-value states
    const highValues = cacheIndexSelector.selectTopK(
      valueCache,
      4,
      (value) => value
    );
    expect(highValues?.sequenceLength).toBe(4);

    // Replace low values
    const boosted = cacheReplacer.replaceWhere(
      valueCache,
      (value) => value < 0.5,
      (value) => value * 1.5
    );
    expect(boosted?.data[0]).toBeCloseTo(0.15);
  });

  it('should maintain metadata through operations', () => {
    const original: Cache<number[]> = {
      data: [1, 2, 3, 4, 5],
      sequenceLength: 5,
      metadata: {
        id: 'original',
        timestamp: 1000,
        sourceAgentId: 'agent-1',
        version: 1,
      },
    };

    const sliced = cacheSlicer.slice(original, { start: 1, end: 4 });
    expect(sliced?.metadata).toEqual(original.metadata);

    const replaced = cacheReplacer.replace(sliced!, 1, 99);
    expect(replaced?.metadata?.version).toBe(2);
    expect(replaced?.metadata?.timestamp).toBeGreaterThan(1000);
  });
});

describe('Edge Cases and Performance', () => {
  it('should handle very large caches efficiently', () => {
    const largeCache: Cache<number[]> = {
      data: Array.from({ length: 100000 }, (_, i) => i),
      sequenceLength: 100000,
    };

    const start = Date.now();
    const result = cacheSlicer.slice(largeCache, {
      start: 1000,
      end: 2000,
    });
    const duration = Date.now() - start;

    expect(result?.sequenceLength).toBe(1000);
    expect(duration).toBeLessThan(100); // Should be reasonably fast
  });

  it('should handle deeply nested structures', () => {
    const nested: Cache<number[][][]> = {
      data: [
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ],
      sequenceLength: 2,
    };

    const result = cacheSlicer.slice(nested, { start: 0, end: 1 });
    expect(result?.data).toEqual([
      [
        [1, 2],
        [3, 4],
      ],
    ]);
  });

  it('should handle sparse data', () => {
    const sparse: Cache<number[]> = {
      data: [0, 0, 0, 5, 0, 0, 10, 0, 0],
      sequenceLength: 9,
    };

    const split = cacheSplitter.splitByPlaceholder(sparse, 0);
    expect(split?.segments).toHaveLength(2);
    expect(split?.segments[0]?.data).toEqual([5]);
    expect(split?.segments[1]?.data).toEqual([10]);
  });

  it('should handle mixed-type structures', () => {
    const mixed: Cache<Map<string, TensorLike>> = {
      data: new Map([
        ['array', [1, 2, 3]],
        ['typed', new Float32Array([4, 5, 6])],
        ['nested', [[7, 8], [9, 10]]],
      ]),
      sequenceLength: 3,
    };

    const cloned = cloneCacheData(mixed.data);
    expect(cloned).toEqual(mixed.data);
    expect(cloned).not.toBe(mixed.data);
  });
});
