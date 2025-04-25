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

@Injectable({ providedIn: 'root' })
export class DesktopNavigationService implements OnDestroy {

  private subscription: Subscription = new Subscription();

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _authService: AuthService,
    private _environmentEntityService: EnvironmentEntityService,
    private _eventBus: EventBusService) {
    
    this.addActiveEnvironmentToInterceptorConfig();
  }

  navigateToEnv(selectedEnv: string, friendlyName: string = 'My Environment') {
    console.log('DesktopNavigationService: Navigating to env:', selectedEnv, 'User logged in:', this._authService.userIsLoggedIn);

    const environmentUrl = `https://${selectedEnv.replace('.api', '')}`;
    const urlName = selectedEnv.split('.')[0];
    const apiUrl = `https://${selectedEnv}`;

    const environmentModel: EnvironmentModel = {
      url: environmentUrl,
      friendlyName: friendlyName,
      apiUrl: apiUrl,
      urlName: urlName
    };

    // Always set environment in cache/storage regardless of login state
    this._environmentEntityService.setActiveEnvironment(environmentModel);
    
    // Update URL
    let envParam = environmentModel.url.slice(8);
    let urlTree = this._router.parseUrl(this._router.url);
    urlTree.queryParams[UrlRouteParams.environment] = envParam;
    this._router.navigateByUrl(urlTree);

    // Login if needed
    if (!this._authService.userIsLoggedIn) {
      console.log('User not logged in, showing login popup');
      // Listen for login success to refresh authentication for the new environment
      const loginSub = this._eventBus.on(AppEvents.LOGIN_SUCCESS, () => {
        console.log('Login successful, configuring environment interceptors');
        this._authService.addProtectedResourceToInterceptorConfig(environmentModel.apiUrl);
        this._eventBus.emit(new EventData(AppEvents.ENVIRONMENT_CHANGED, null));
      });
      
      this.subscription.add(loginSub);
      this._authService.loginPopup();
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

    console.log('currentEnvironmentUrl', currentEnvironmentUrl, 'activatedEnvironment', activatedEnvironment.url, 'userIsLoggedIn', userIsLoggedIn)

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

    console.log('activatedEnvironment', activatedEnvironment, 'userIsLoggedIn', userIsLoggedIn, 'componentPath', componentPath)

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


