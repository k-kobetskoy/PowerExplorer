import { Injectable } from '@angular/core';
import { IDataStorageService } from './abstract/i-data-storage-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root', })
export class CacheStorageService implements IDataStorageService {

  constructor() { 
  }

  getItem<T>(key: string): BehaviorSubject<T> {
    
    let item$ = this[key];
    if (!item$) {
      item$ = new BehaviorSubject<T>(null);
      this[key] = item$;
    } else {
    }
    return item$;
  }

  setItem<T>(item: T, key: string): void {

    let subject$: BehaviorSubject<T> = this[key];

    if (!subject$) {
      this[key] = new BehaviorSubject<T>(item);
      return;
    }

    subject$.next(item);
  }

  removeItem(key: string): void {
    delete this[key];
  }

  clear(): void {
    for (const key of Object.keys(this)) {
      if (key !== 'constructor') {
        delete this[key];
      }
    }
  }
  
  /**
   * Get all keys in the cache except for internal properties
   * @returns Array of cache keys
   */
  getAllKeys(): string[] {
    return Object.keys(this).filter(key => 
      key !== 'constructor' && 
      typeof this[key] !== 'function'
    );
  }
  
  /**
   * List all cache entries for debugging
   * @returns Information about all cache entries
   */
  listAllEntries(): {key: string, hasValue: boolean, value: any}[] {
    const keys = this.getAllKeys();
    
    return keys.map(key => {
      const entry = this[key];
      return {
        key,
        hasValue: !!entry && entry.value !== null && entry.value !== undefined,
        value: entry?.value
      };
    });
  }
}
