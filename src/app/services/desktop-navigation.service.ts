import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { EnvironmentModel } from '../models/environment-model';
import { UrlRouteParams } from '../config/url-route-params';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';
import { EnvironmentEntityService } from '../components/query-builder/services/entity-services/environment-entity.service';
import { EventBusService } from './event-bus/event-bus.service';
import { AppEvents } from './event-bus/app-events';
import { EventData } from './event-bus/event-data';
import { ElectronAuthService } from './electron-auth.service';
import { ElectronService } from './electron.service';

@Injectable({ providedIn: 'root' })
export class DesktopNavigationService implements OnDestroy {

  private subscription: Subscription = new Subscription();
  private isElectronApp: boolean = false;

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _authService: AuthService,
    private _environmentEntityService: EnvironmentEntityService,
    private _eventBus: EventBusService,
    private _electronAuthService: ElectronAuthService,
    private _electronService: ElectronService
  ) {
    console.log('[DESKTOP-NAV] Service initialized');
    this.isElectronApp = this._electronService.isElectronApp;
    this.addActiveEnvironmentToInterceptorConfig();
  }

  navigateToEnv(selectedEnv: string, friendlyName: string = 'My Environment') {
    console.log('[DESKTOP-NAV] Navigating to env:', selectedEnv, 'User logged in:', this._authService.userIsLoggedIn);

    const environmentUrl = `https://${selectedEnv.replace('.api', '')}`;
    const urlName = selectedEnv.split('.')[0];
    const apiUrl = `https://${selectedEnv}`;

    const environmentModel: EnvironmentModel = {
      url: environmentUrl,
      friendlyName: friendlyName,
      apiUrl: apiUrl,
      urlName: urlName
    };

    console.log('[DESKTOP-NAV] Environment model:', environmentModel);

    // Always set environment in cache/storage regardless of login state
    this._environmentEntityService.setActiveEnvironment(environmentModel);
    
    // Update URL
    let envParam = environmentModel.url.slice(8);
    let urlTree = this._router.parseUrl(this._router.url);
    urlTree.queryParams[UrlRouteParams.environment] = envParam;
    console.log('[DESKTOP-NAV] Updating URL with environment param:', envParam);
    this._router.navigateByUrl(urlTree);

    // Update the interceptor regardless of login state
    this._authService.addProtectedResourceToInterceptorConfig(environmentModel.apiUrl);
    
    // For Electron, set the environment URL first
    if (this.isElectronApp) {
      // Try to set the environment URL, but continue with auth even if it fails
      this._electronAuthService.setEnvironmentUrl(environmentModel.url)
        .subscribe(success => {
          console.log('[DESKTOP-NAV] Environment URL set for auth:', success);
          // Check login with forced state check
          this.checkAndHandleLogin(environmentModel);
        });
    } else {
      // Check login with forced state check
      this.checkAndHandleLogin(environmentModel);
    }
  }

  /**
   * Check login state and handle authentication if needed
   */
  private checkAndHandleLogin(environmentModel: EnvironmentModel) {
    // Double-check login state
    const isLoggedIn = this._authService.userIsLoggedIn;
    console.log('[DESKTOP-NAV] Checking login state, currently:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('[DESKTOP-NAV] User not logged in, showing login popup');
      
      // Listen for login success to refresh authentication for the new environment
      const loginSub = this._eventBus.on(AppEvents.LOGIN_SUCCESS, () => {
        console.log('[DESKTOP-NAV] Login successful, configuring environment interceptors');
        this._authService.addProtectedResourceToInterceptorConfig(environmentModel.apiUrl);
        this._eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null));
      });
      
      this.subscription.add(loginSub);
      console.log('[DESKTOP-NAV] Calling authService.loginPopup()');
      
      // In Electron mode, pass the environment URL and scopes configuration
      if (this.isElectronApp) {
        const apiUrl = environmentModel.url;
        
        // Create configuration with environment-specific scopes
        const userConfig = {
          scopes: [`${apiUrl}/user_impersonation`]
        };
        
        console.log('[DESKTOP-NAV] Calling login with environment URL:', environmentModel.url);
        console.log('[DESKTOP-NAV] Using environment-specific scopes:', userConfig.scopes);
        
        // Use the URL property, not apiUrl, to ensure consistent format
        this._authService.loginPopup(environmentModel.url, userConfig);
      } else {
        this._authService.loginPopup();
      }
    } else {
      console.log('[DESKTOP-NAV] User already logged in, emitting environment changed event');
      this._eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null));
    }
  }

  handleUrlParamOnComponentInit(componentPath: string) {
    const currentEnvironmentUrl = this.getCurrentEnvironmentUrl()
    const userIsLoggedIn = this._authService.userIsLoggedIn

    const envSub = this._environmentEntityService.getActiveEnvironment().subscribe(activatedEnvironment => {
      if (currentEnvironmentUrl) {
        this.handleExistingRouteParam(currentEnvironmentUrl, userIsLoggedIn, activatedEnvironment)
      } else {
        this.handleEmptyRouteParam(componentPath, userIsLoggedIn, activatedEnvironment)
      }
    });
    
    this.subscription.add(envSub);
  }

  private handleExistingRouteParam(currentEnvironmentUrl: string, userIsLoggedIn: boolean, activatedEnvironment: EnvironmentModel) {
    console.log('[DESKTOP-NAV] currentEnvironmentUrl', currentEnvironmentUrl, 'activatedEnvironment', activatedEnvironment.url, 'userIsLoggedIn', userIsLoggedIn)

    if (userIsLoggedIn) {
      if (currentEnvironmentUrl === activatedEnvironment.url) {
        return
      } else {
        this.findEnvironmentInUsersEnvironmentsAndConnect(activatedEnvironment.url)
      }
    } else {
      this.findEnvironmentInUsersEnvironmentsAndConnect(activatedEnvironment.url)
    }
  }

  private handleEmptyRouteParam(componentPath: string, userIsLoggedIn: boolean, activatedEnvironment: EnvironmentModel) {
    console.log('[DESKTOP-NAV] activatedEnvironment', activatedEnvironment, 'userIsLoggedIn', userIsLoggedIn, 'componentPath', componentPath)

    if (userIsLoggedIn) {
      if (activatedEnvironment) {
        const queryParams: Params = { [UrlRouteParams.environment]: activatedEnvironment.url.slice(8) }
        this._router.navigate(
          [componentPath],
          { queryParams }
        )
      } else {
        return
      }
    }
    return
  }

  private findEnvironmentInUsersEnvironmentsAndConnect(urlParam: string) {
    const envSub = this._environmentEntityService.getEnvironments()
      .subscribe(environments => {
        if (environments) {
          let matchingEnvironment = environments.find(item => item.url === urlParam)
          this._environmentEntityService.setActiveEnvironment(matchingEnvironment)
        } else {
          this._router.navigateByUrl('**')
        }
      });
      
    this.subscription.add(envSub);
  }

  getCurrentEnvironmentUrl(): string {
    const param = this._route.snapshot.paramMap.get(UrlRouteParams.environment)
    return param ? `https://${param}` : null
  }

  addActiveEnvironmentToInterceptorConfig() {
    const envSub = this._environmentEntityService.getActiveEnvironment().subscribe(env => {
      if (env) {
        this._authService.addProtectedResourceToInterceptorConfig(env.apiUrl)
        this._authService.checkProtectedResource()
      }
    });
    
    this.subscription.add(envSub);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}