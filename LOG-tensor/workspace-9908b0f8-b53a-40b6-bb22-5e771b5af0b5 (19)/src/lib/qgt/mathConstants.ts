/**
 * Math constants for numerical precision
 */

export const PI = Math.PI;
export const SQRT2 = Math.SQRT2;
export const E = Math.E;

// Re-export Math functions for convenience
export const sqrt = Math.sqrt;
export const abs = Math.abs;
export const sin = Math.sin;
export const cos = Math.cos;
export const tan = Math.tan;
export const asin = Math.asin;
export const acos = Math.acos;
export const atan = Math.atan;
export const atan2 = Math.atan2;
export const exp = Math.exp;
export const log = Math.log;
export const pow = Math.pow;
export const floor = Math.floor;
export const ceil = Math.ceil;
export const round = Math.round;

/**
 * Small epsilon for numerical stability
 */
export const EPS = 1e-10;

/**
 * Check if a number is approximately zero
 */
export function isApproxZero(x: number, tolerance: number = EPS): boolean {
  return abs(x) < tolerance;
}

/**
 * Clamp a value to a range
 */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Factorial (memoized)
 */
const factorialCache: number[] = [1, 1];
export function factorial(n: number): number {
  if (n < 0) return 0;
  if (n < factorialCache.length) return factorialCache[n];
  
  let result = factorialCache[factorialCache.length - 1];
  for (let i = factorialCache.length; i <= n; i++) {
    result *= i;
    factorialCache.push(result);
  }
  return result;
}

/**
 * Double factorial: n!! = n * (n-2) * (n-4) * ...
 */
export function doubleFactorial(n: number): number {
  if (n <= 0) return 1;
  if (n === 1) return 1;
  return n * doubleFactorial(n - 2);
}

/**
 * Binomial coefficient: C(n, k)
 */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  return factorial(n) / (factorial(k) * factorial(n - k));
}
