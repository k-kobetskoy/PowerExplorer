declare module 'electron-store' {
  interface StoreOptions {
    name?: string;
    cwd?: string;
    defaults?: Record<string, any>;
  }

  class Store {
    constructor(options?: StoreOptions);
    get<T>(key: string, defaultValue?: T): T;
    set(key: string, value: any): void;
    delete(key: string): void;
    clear(): void;
    has(key: string): boolean;
    store: Record<string, any>;
    path: string;
  }

  export default Store;
} 