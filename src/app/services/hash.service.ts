import { Injectable } from '@angular/core';

/**
 * Service for generating hash values from strings
 * Used for caching and other operations that need consistent key generation
 */
@Injectable({
  providedIn: 'root'
})
export class HashService {

  /**
   * Generate a hash string from input
   * Uses a 32-bit hash algorithm similar to djb2
   * @param str Input string to hash
   * @returns A base36 string representation of the hash
   */
  generateHash(str: string): string {
    // Simple string hashing function
    let hash = 0;
    if (!str || str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36); // Convert to base36 for shorter strings
  }

  /**
   * Generate a key for caching with optional prefix
   * @param values Array of values to include in the hash
   * @param prefix Optional prefix for the key
   * @returns A string key combining the prefix and hashed values
   */
  generateCacheKey(values: string[], prefix?: string): string {
    // Concatenate all values with a separator
    const combinedValue = values.join('::');
    
    // Generate hash
    const hash = this.generateHash(combinedValue);
    
    // Return key with or without prefix
    return prefix ? `${prefix}_${hash}` : hash;
  }
} 