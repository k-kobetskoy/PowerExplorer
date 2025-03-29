import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CacheStorageService } from 'src/app/services/data-sorage/cache-storage.service';
import { HashService } from 'src/app/services/hash.service';
import { QueryNode } from '../models/query-node';
import { XmlExecutionResult } from './xml-executor.service';

interface FetchXmlQueryOptions {
  maxPageSize?: number;
  includeAnnotations?: boolean;
  timeout?: number;
  includeFieldTypes?: boolean;
}

/**
 * Service for managing FetchXML query result caching
 * Provides methods for storing, retrieving, and managing cached query results
 */
@Injectable({
  providedIn: 'root'
})
export class XmlCacheService {
  // Cache configuration in milliseconds
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes by default
  private readonly MAX_CACHE_SIZE = 1; // Maximum number of queries to cache
  private cacheExpirations: Map<string, number> = new Map(); // Track cache expiration timestamps
  private cacheKeys: string[] = []; // Track cache keys for LRU functionality

  constructor(
    private cacheService: CacheStorageService,
    private hashService: HashService
  ) {}

  /**
   * Clear all cached FetchXML results
   */
  clearFetchXmlCache(): void {
    this.cacheKeys.forEach(key => {
      if (key.startsWith('fetch_')) {
        this.cacheService.removeItem(key);
      }
    });
    this.cacheKeys = [];
    this.cacheExpirations.clear();
  }
  
  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    
    // Check all cached items for expiration
    this.cacheExpirations.forEach((expiration, key) => {
      if (now > expiration) {
        this.cacheService.removeItem(key);
        this.cacheExpirations.delete(key);
        this.cacheKeys = this.cacheKeys.filter(k => k !== key);
      }
    });
  }
  
  /**
   * Manage the cache based on LRU when it exceeds max size
   * @param newKey The cache key to manage
   */
  manageCache(newKey: string): void {
    // Add new key to the end (most recently used)
    this.cacheKeys = this.cacheKeys.filter(k => k !== newKey);
    this.cacheKeys.push(newKey);
    
    // Set expiration time
    this.cacheExpirations.set(newKey, Date.now() + this.CACHE_DURATION);
    
    // Enforce cache size limit using LRU policy
    if (this.cacheKeys.length > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cacheKeys.shift();
      if (oldestKey) {
        this.cacheService.removeItem(oldestKey);
        this.cacheExpirations.delete(oldestKey);
      }
    }
  }

  /**
   * Generate a cache key for FetchXML queries
   * @param xml The FetchXML query
   * @param entityNode The entity node
   * @param options Query options
   * @param environmentUrl The environment URL
   * @returns A string key for caching
   */
  generateFetchXmlCacheKey(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions, environmentUrl: string): string {
    try {
      // Normalize the XML by removing whitespace and comments
      const normalizedXml = this.sanitizeForTransmission(xml);
      
      // Get the entity logical name
      const entityName = entityNode?.entitySetName$.value || '';
      
      // Create a string representation of options
      const optionsString = JSON.stringify(options || {});
      
      // Convert environment URL if provided
      const preparedEnvUrl = this.prepareEnvUrl(environmentUrl || '');
      
      // Use HashService to generate hash
      const values = [normalizedXml, entityName, optionsString, preparedEnvUrl];
      return this.hashService.generateCacheKey(values, 'fetch');
    } catch (error) {
      console.error('Error generating FetchXML cache key:', error);
      // Generate a fallback key with timestamp to avoid collisions
      return `fetch_error_${Date.now()}`;
    }
  }

  /**
   * Check if results for this FetchXML are already cached
   * @param xml The FetchXML query
   * @param entityNode The entity node
   * @param options Query options
   * @param environmentUrl The environment URL
   * @returns True if the results are already cached
   */
  isFetchXmlResultCached<T>(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}, environmentUrl: string): boolean {
    this.clearExpiredCache();
    const cacheKey = this.generateFetchXmlCacheKey(xml, entityNode, options, environmentUrl);
    const cachedResults$ = this.cacheService.getItem<T>(cacheKey);
    return cachedResults$.value !== null && cachedResults$.value !== undefined;
  }

  getCachedFetchXmlResult<T>(xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}, environmentUrl: string): Observable<T | null> {
    this.clearExpiredCache();
    const cacheKey = this.generateFetchXmlCacheKey(xml, entityNode, options, environmentUrl);
    const cachedResults$ = this.cacheService.getItem<T>(cacheKey);
    
    if (cachedResults$.value) {
      console.log('Using cached FetchXML results for key:', cacheKey);
      // Update cache management (move to most recently used)
      this.manageCache(cacheKey);
      return cachedResults$.asObservable();
    }
    
    return of(null);
  }


  /**
   * Cache FetchXML results
   * @param result The result to cache
   * @param xml The FetchXML query
   * @param entityNode The entity node
   * @param options Query options
   * @param environmentUrl The environment URL
   */
  cacheFetchXmlResult<T>(result: T, xml: string, entityNode: QueryNode, options: FetchXmlQueryOptions = {}, environmentUrl: string): void {
    console.log('=== XmlCacheService: cacheFetchXmlResult called ===');
    
    // Debug the result being cached
    try {
      const typedResult = result as any;
      console.log('XmlCacheService: Caching result:', {
        hasHeader: !!typedResult.header,
        headerKeys: Object.keys(typedResult.header || {}).length,
        rawValuesCount: typedResult.rawValues?.length || 0,
        formattedValuesCount: typedResult.formatedValues?.length || 0
      });
    } catch (error) {
      console.error('XmlCacheService: Error inspecting result to cache:', error);
    }
    
    const cacheKey = this.generateFetchXmlCacheKey(xml, entityNode, options, environmentUrl);
    console.log(`XmlCacheService: Generated cache key: ${cacheKey}`);
    
    // Store in cache
    this.cacheService.setItem(result, cacheKey);
    console.log(`XmlCacheService: Result stored in cache with key: ${cacheKey}`);
    
    // Update cache management
    this.manageCache(cacheKey);
    console.log('XmlCacheService: Cache management updated, current keys:', this.cacheKeys);
  }

  /**
   * Get the most recent FetchXML result
   * @returns The most recent result or null if none exists
   */
  getMostRecentFetchXmlResult<T = XmlExecutionResult>(): BehaviorSubject<T| null> {
    console.log('=== XmlCacheService: getMostRecentFetchXmlResult called ===');
    this.clearExpiredCache();
    
    console.log('XmlCacheService: Current cache keys:', this.cacheKeys);
    
    if (this.cacheKeys.length === 0) {
      console.log('XmlCacheService: No cache keys available, returning empty BehaviorSubject');
      return new BehaviorSubject<T | null>(null);
    }
    
    // Get the most recently used key (last in the array)
    const mostRecentKey = this.cacheKeys[this.cacheKeys.length - 1];
    console.log('XmlCacheService: Most recent key:', mostRecentKey);
    
    if (!mostRecentKey) {
      console.log('XmlCacheService: Most recent key is undefined, returning empty BehaviorSubject');
      return new BehaviorSubject<T | null>(null);
    }
    
    const cachedResult = this.cacheService.getItem<T>(mostRecentKey);
    
    if (!cachedResult) {
      console.log('XmlCacheService: CacheService returned null for key', mostRecentKey);
      return new BehaviorSubject<T | null>(null);
    }
    
    if (cachedResult.value === null || cachedResult.value === undefined) {
      console.log('XmlCacheService: CacheService returned BehaviorSubject with null value for key', mostRecentKey);
    } else {
      // Log the cached result structure
      try {
        const result = cachedResult.value as any;
        console.log('XmlCacheService: Found cached result:', {
          hasHeader: !!result.header,
          headerKeys: Object.keys(result.header || {}).length,
          rawValuesCount: result.rawValues?.length || 0,
          formattedValuesCount: result.formatedValues?.length || 0
        });
      } catch (error) {
        console.error('XmlCacheService: Error inspecting cached result:', error);
      }
    }
    
    return cachedResult || new BehaviorSubject<T | null>(null);
  }

  /**
   * Sanitize XML for transmission
   * @param xml The XML to sanitize
   * @returns Sanitized XML
   */
  private sanitizeForTransmission(xml: string): string {
    return xml
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Prepare environment URL for caching
   * @param url The URL to prepare
   * @returns Prepared URL
   */
  private prepareEnvUrl(url: string): string {
    // Replace non-alphanumeric characters with underscore
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
} 