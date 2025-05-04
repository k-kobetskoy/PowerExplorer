import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainToolbarComponent } from './components/toolbar/main-toolbar/main-toolbar.component';
import { MenuComponent } from './components/toolbar/menu/menu.component';
import { NodeStyleDirective } from './directives/node-style.directive';
import { ExternalLinkDirective } from './directives/external-link.directive';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ValidationService } from './components/query-builder/services/validation.service';
import { ErrorDialogComponent } from './components/error-dialog/error-dialog.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatRippleModule } from '@angular/material/core';
import { AngularSplitModule } from 'angular-split';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BehaviorSubject } from 'rxjs';
import { ACTIVE_ACCOUNT_MODEL, ACTIVE_ENVIRONMENT_MODEL } from './models/tokens';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ElectronHttpInterceptor } from './services/electron-http-interceptor.service';
import { RouterModule } from '@angular/router';
import { QueryBuilder } from './components/query-builder/query-builder.component';
import { EnvironmentModel } from './models/environment-model';
import { AccountInfo } from '@azure/msal-browser';

// Determine if running in Electron
const isElectron = window && window['electron'] !== undefined;

@NgModule({
  declarations: [
    AppComponent,
    MenuComponent,
    NodeStyleDirective,
    ExternalLinkDirective,
    ErrorDialogComponent,
    AuthCallbackComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatRippleModule,
    MatIconModule,
    AngularSplitModule,
    MatTabsModule,
    MatTooltipModule,
    FormsModule,
    CdkTreeModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatTableModule,
    MainToolbarComponent
  ],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    { provide: ACTIVE_ENVIRONMENT_MODEL, useValue: new BehaviorSubject<EnvironmentModel>(null) },
    { provide: ACTIVE_ACCOUNT_MODEL, useValue: new BehaviorSubject<AccountInfo>(null) },
    // Add Electron HTTP interceptor for Electron environment
    ...(isElectron ? [
      { provide: HTTP_INTERCEPTORS, useClass: ElectronHttpInterceptor, multi: true }
    ] : []),
    provideHttpClient(withInterceptorsFromDi()),    
    ValidationService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule { }