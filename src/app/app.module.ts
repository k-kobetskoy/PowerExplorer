import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainToolbarComponent } from './components/toolbar/main-toolbar/main-toolbar.component';
import { MenuComponent } from './components/toolbar/menu/menu.component';
import { UserInfoComponent } from './components/toolbar/user-info/user-info.component';
import { CodeEditorFooterComponent } from './components/query-builder/code-editor-footer/code-editor-footer.component';
import { NodeStyleDirective } from './directives/node-style.directive';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ValidationService } from './components/query-builder/services/validation.service';
import { ErrorDialogComponent } from './components/error-dialog/error-dialog.component';
import { MsalRedirectComponent } from '@azure/msal-angular';
import { MsalConfigDynamicModule } from './msal-config-dynamic.module';
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
import { ACTIVE_ENVIRONMENT_BROWSER_URL, ACTIVE_ENVIRONMENT_URL, USER_IS_LOGGED_IN } from './models/tokens';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnvService } from './services/env.service';
import { AuthConfigService } from './services/auth-config.service';


@NgModule({
  declarations: [
    AppComponent,
    MenuComponent,
    UserInfoComponent,  
    CodeEditorFooterComponent,
    NodeStyleDirective,
    
    ErrorDialogComponent,

  ],
  bootstrap: [AppComponent, MsalRedirectComponent], 
  imports: [
    BrowserModule, 
    MainToolbarComponent,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatRippleModule,
    AngularSplitModule,
    MatTabsModule,
    MatIconModule,
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
    MsalConfigDynamicModule.forRoot('assets/configuration.json')
  ], 
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    { provide: ACTIVE_ENVIRONMENT_BROWSER_URL, useValue: new BehaviorSubject<string>('') },
    { provide: ACTIVE_ENVIRONMENT_URL, useValue: new BehaviorSubject<string>('') },
    { provide: USER_IS_LOGGED_IN, useValue: new BehaviorSubject<boolean>(false) },
    provideHttpClient(withInterceptorsFromDi()),
    EnvService,
    AuthConfigService,    
    ValidationService
  ]
})
export class AppModule { }