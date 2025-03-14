import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { ACTIVE_ENVIRONMENT_URL } from 'src/app/models/tokens';
import { CacheStorageService } from 'src/app/services/data-sorage/cache-storage.service';
import { EnvironmentEntityService } from '../environment-entity.service';

@Injectable({ providedIn: 'root' })
export abstract class BaseRequestService {

    protected activeEnvironmentUrl$: Observable<string>;

    protected httpClient: HttpClient = inject(HttpClient);
    protected cacheService: CacheStorageService = inject(CacheStorageService);
    protected environmentService: EnvironmentEntityService = inject(EnvironmentEntityService);
    protected activeEnvironmentUrlSubject$: BehaviorSubject<string> = inject(ACTIVE_ENVIRONMENT_URL);

    constructor() {
        this.activeEnvironmentUrl$ = this.activeEnvironmentUrlSubject$?.value
            ? this.activeEnvironmentUrlSubject$.asObservable()
            : this.environmentService.getActiveEnvironment().pipe(
                distinctUntilChanged((prev, curr) => prev.apiUrl === curr.apiUrl),
                map(env => env?.apiUrl),
                shareReplay({ bufferSize: 1, refCount: true })
            );
    }

    protected prepareEnvUrl(envUrl: string): string {
        return envUrl?.replace(/[^a-zA-Z0-9]/g, '_');
    }
}
