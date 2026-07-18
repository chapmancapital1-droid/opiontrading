// @ts-nocheck
/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * 
 * CRITICAL for the scientific method: reproducibility.
 * Every experiment must be repeatable given the same seed.
 * This allows us to isolate the effect of parameter changes
 * from random noise in market simulation.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
    // Warm up the generator (discard first few values for better distribution)
    for (let i = 0; i < 10; i++) this.next();
  }

  /** Returns a float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns a random integer in [min, max] inclusive */
  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Returns true with the given probability */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Sample from a normal distribution using Box-Muller transform */
  normal(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    // Avoid log(0)
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }

  /** Shuffle an array in place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Pick a random element from an array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /** Create a child RNG with derived seed (for parallel simulations) */
  fork(index: number): SeededRNG {
    return new SeededRNG(this.state ^ (index * 2654435761));
  }
}
