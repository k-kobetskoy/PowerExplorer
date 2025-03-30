import { Inject, Injectable } from '@angular/core';
import { MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG, MsalBroadcastService, MsalGuardConfiguration, MsalInterceptorConfiguration, MsalService } from '@azure/msal-angular';
import { EventMessage, InteractionStatus, PopupRequest, AuthenticationResult, EventType } from '@azure/msal-browser';
import { BehaviorSubject, Subject, filter, takeUntil } from 'rxjs';
import { EventBusService } from './event-bus/event-bus.service';
import { EventData } from './event-bus/event-data';
import { AppEvents } from './event-bus/app-events';
import { USER_IS_LOGGED_IN } from '../models/tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {

  isIframe = false;
  private _acquireTokenFailure: boolean = false

  public get userIsLoggedIn() {
    return this._userIsLoggedIn.value;
  }

  public get userIsLoggedIn$() {
    return this._userIsLoggedIn.asObservable();
  }

  constructor(@Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    @Inject(MSAL_INTERCEPTOR_CONFIG) private msalInterceptorConfig: MsalInterceptorConfiguration,
    @Inject(USER_IS_LOGGED_IN) private _userIsLoggedIn: BehaviorSubject<boolean>,
    private msalService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private eventBus: EventBusService) {

    this.setLoginDisplay()
  }

  private readonly _destroying$ = new Subject<void>();


  init() {

    this.isIframe = window !== window.parent && !window.opener; // Remove this line to use Angular Universal

    this.msalService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
    this.msalBroadcastService.msalSubject$
      .pipe(filter((msg: EventMessage) =>
        msg.eventType === EventType.LOGIN_SUCCESS || msg.eventType === EventType.ACCOUNT_REMOVED || msg.eventType === EventType.ACQUIRE_TOKEN_FAILURE))
      .subscribe((result: EventMessage) => {
        if (result.eventType === EventType.ACCOUNT_REMOVED) {
          this.eventBus.emitAndSaveLast(new EventData(AppEvents.USER_REMOVED, null))
        }
        if (result.eventType === EventType.LOGIN_SUCCESS) {
          console.warn('msalBroadcastService : EventType.LOGIN_SUCCESS')
          this.eventBus.emit(new EventData(AppEvents.LOGIN_SUCCESS, null))
        }
        if (result.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
          console.warn('msalBroadcastService : EventType.ACQUIRE_TOKEN_FAILURE')
          this._acquireTokenFailure = true
        }
      })

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount()
        this.setLoginDisplay()
      })
  }

  setLoginDisplay() {
    let activeAccount = this.msalService.instance.getActiveAccount()
    //todo: check all accounts and set active if active is absent???
    
    this._userIsLoggedIn.next(!!activeAccount)
  }  

  checkAndSetActiveAccount() {
    let activeAccount = this.msalService.instance.getActiveAccount();

    if (!activeAccount && this.msalService.instance.getAllAccounts().length > 0) {
      let accounts = this.msalService.instance.getAllAccounts();
      this.msalService.instance.setActiveAccount(accounts[0]);
    }
  }

  loginPopup() {
    if (this.msalGuardConfig.authRequest) {
      this.msalService.loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
        .subscribe((response: AuthenticationResult) => {
          this.msalService.instance.setActiveAccount(response.account);
        });
    } else {
      this.msalService.loginPopup()
        .subscribe((response: AuthenticationResult) => {
          this.msalService.instance.setActiveAccount(response.account)
        });
    }
  }

  logoutPopup() {
    this.msalService.logoutPopup({
      mainWindowRedirectUri: "/"
    })
  }

  addProtectedResourceToInterceptorConfig(url: string) {
    if (!this.msalInterceptorConfig.protectedResourceMap.has(`${url}/api/data/v9.2/`)) {
      this.msalInterceptorConfig.protectedResourceMap.set(`${url}/api/data/v9.2/`, [`${url}/user_impersonation`])
    }
  }

  // setProtectedResourceMap() {
  //   this.msalInterceptorConfig.protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);
  // }

  checkProtectedResource() {
    console.log('protectedResourceMap', this.msalInterceptorConfig.protectedResourceMap)
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}