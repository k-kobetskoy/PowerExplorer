import { InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EnvironmentModel } from './environment-model';
import { AccountInfo } from '@azure/msal-browser';

export const ACTIVE_ENVIRONMENT_MODEL = new InjectionToken<BehaviorSubject<EnvironmentModel>>('ACTIVE_ENVIRONMENT_MODEL');
export const ACTIVE_ACCOUNT_MODEL = new InjectionToken<BehaviorSubject<AccountInfo>>('ACTIVE_ACCOUNT_MODEL');