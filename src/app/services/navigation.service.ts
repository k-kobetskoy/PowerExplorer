import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { EnvironmentModel } from '../models/environment-model';
import { UrlRouteParams } from '../config/url-route-params';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';
import { EnvironmentEntityService } from '../components/query-builder/services/entity-services/environment-entity.service';

@Injectable({ providedIn: 'root' })
export class NavigationService implements OnDestroy {

  private subscription: Subscription = new Subscription();

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _authService: AuthService,
    private _environmentEntityService: EnvironmentEntityService) {
    
    this.addActiveEnvironmentToInterceptorConfig();
    console.warn('Navigation service initialized');
  }

  navigateToEnv(selectedEnv: EnvironmentModel) {
    this._environmentEntityService.setActiveEnvironment(selectedEnv);

    let envParam = selectedEnv.url.slice(8);

    let urlTree = this._router.parseUrl(this._router.url);
    urlTree.queryParams[UrlRouteParams.environment] = envParam;

    this._router.navigateByUrl(urlTree);
  }

  handleUrlParamOnComponentInit(componentPath: string) {
    const currentEnvironmentUrl = this.getCurrentEnvironmentUrl();
    const userIsLoggedIn = this._authService.userIsLoggedIn;

    const envSub = this._environmentEntityService.getActiveEnvironment().subscribe(activatedEnvironment => {
      if (currentEnvironmentUrl) {
        this.handleExistingRouteParam(currentEnvironmentUrl, userIsLoggedIn, activatedEnvironment);
      } else {
        this.handleEmptyRouteParam(componentPath, userIsLoggedIn, activatedEnvironment);
      }
    });
    
    this.subscription.add(envSub);
  }

  private handleExistingRouteParam(currentEnvironmentUrl: string, userIsLoggedIn: boolean, activatedEnvironment: EnvironmentModel) {
    if (userIsLoggedIn) {
      if (currentEnvironmentUrl === activatedEnvironment.url) {
        return;
      } else {
        this.findEnvironmentInUsersEnvironmentsAndConnect(activatedEnvironment.url);
      }
    } else {
      this.findEnvironmentInUsersEnvironmentsAndConnect(activatedEnvironment.url);
    }
  }

  private handleEmptyRouteParam(componentPath: string, userIsLoggedIn: boolean, activatedEnvironment: EnvironmentModel) {
    if (userIsLoggedIn) {
      if (activatedEnvironment) {
        const queryParams: Params = { [UrlRouteParams.environment]: activatedEnvironment.url.slice(8) };
        this._router.navigate(
          [componentPath],
          { queryParams }
        );
      } else {
        return;
      }
    }
    return;
  }

  private findEnvironmentInUsersEnvironmentsAndConnect(urlParam: string) {
    const envSub = this._environmentEntityService.getEnvironments()
      .subscribe(environments => {
        if (environments) {
          let matchingEnvironment = environments.find(item => item.url === urlParam);
          this._environmentEntityService.setActiveEnvironment(matchingEnvironment);
        } else {
          this._router.navigateByUrl('**');
        }
      });
    
    this.subscription.add(envSub);
  }

  getCurrentEnvironmentUrl(): string {
    const param = this._route.snapshot.paramMap.get(UrlRouteParams.environment);

    return param ? `https://${param}` : null;
  }

  addActiveEnvironmentToInterceptorConfig() {
    const envSub = this._environmentEntityService.getActiveEnvironment().subscribe(env => {
      if (env) {
        this._authService.addProtectedResourceToInterceptorConfig(env.apiUrl);
        this._authService.checkProtectedResource();
      }
    });
    
    this.subscription.add(envSub);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}


