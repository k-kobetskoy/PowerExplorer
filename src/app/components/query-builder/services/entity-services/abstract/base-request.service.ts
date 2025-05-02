import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';
import { ACTIVE_ENVIRONMENT_MODEL } from 'src/app/models/tokens';
import { CacheStorageService } from 'src/app/services/data-sorage/cache-storage.service';
import { EnvironmentModel } from 'src/app/models/environment-model';

@Injectable({ providedIn: 'root' })
export abstract class BaseRequestService {

    protected activeEnvironmentUrl$: Observable<string>;

    protected httpClient: HttpClient = inject(HttpClient);
    protected cacheService: CacheStorageService = inject(CacheStorageService);
    protected activeEnvironmentUrlSubject$: BehaviorSubject<EnvironmentModel> = inject(ACTIVE_ENVIRONMENT_MODEL);

    constructor() {        
        // Initialize activeEnvironmentUrl$ from the activeEnvironmentUrlSubject$
        this.activeEnvironmentUrl$ = this.activeEnvironmentUrlSubject$.pipe(
            filter(env => !!env),
            map(env => env.url)
        );
    }

    protected prepareEnvUrl(envUrl: string): string {
        return envUrl?.replace(/[^a-zA-Z0-9]/g, '_');
    }
}
