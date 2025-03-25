import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, NO_ERRORS_SCHEMA, Optional } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule, AsyncPipe } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConnectionsDialogComponent } from './components/toolbar/connections/connections-dialog/connections-dialog.component';
import { MainToolbarComponent } from './components/toolbar/main-toolbar/main-toolbar.component';
import { QueryBuilder } from './components/query-builder/query-builder.component';
import { ConnectionsComponent } from './components/toolbar/connections/connections.component';
import { MenuComponent } from './components/toolbar/menu/menu.component';
import { UserInfoComponent } from './components/toolbar/user-info/user-info.component';
import { TreePanelComponent } from './components/query-builder/tree-panel/tree-panel.component';
import { ControlPanelComponent } from './components/query-builder/control-panel/control-panel.component';
import { CodeEditorComponent } from './components/query-builder/code-editor/code-editor.component';
import { CodeEditorFooterComponent } from './components/query-builder/code-editor-footer/code-editor-footer.component';
import { NodeStyleDirective } from './directives/node-style.directive';
import { QuickActionsComponent } from './components/query-builder/control-panel/query-forms/quick-actions/quick-actions.component';
import { LoadingIndicatorComponent } from './components/loading-indicator/loading-indicator.component';
import { EntityFormComponent } from './components/query-builder/control-panel/query-forms/entity-form/entity-form.component';
import { RootFormComponent } from './components/query-builder/control-panel/query-forms/root-form/root-form.component';
import { AttributeFormComponent } from './components/query-builder/control-panel/query-forms/attribute-form/attribute-form.component';
import { FilterFormComponent } from './components/query-builder/control-panel/query-forms/filter-form/filter-form.component';
import { FilterConditionFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/filter-condition-form.component';
import { NumberFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/number-form/number-form.component';
import { BooleanFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/boolean-form/boolean-form.component';
import { DateTimeFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/date-time-form/date-time-form.component';
import { IdFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/id-form/id-form.component';
import { PicklistFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/picklist-form/picklist-form.component';
import { StringFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/string-form/string-form.component';
import { LinkEntityFormComponent } from './components/query-builder/control-panel/query-forms/link-entity-form/link-entity-form.component';
import { OrderFormComponent } from './components/query-builder/control-panel/query-forms/order-form/order-form.component';
import { ValueFormComponent } from './components/query-builder/control-panel/query-forms/value-form/value-form.component';
import { QueryTreeButtonBlockComponent } from './components/query-builder/query-tree-button-block/query-tree-button-block.component';
import { ValidationService } from './components/query-builder/services/validation.service';
import { ErrorDialogComponent } from './components/error-dialog/error-dialog.component';
import { SvgIconsModule } from './components/svg-icons/svg-icons.module';
import { SettingsComponent } from './components/toolbar/settings/settings.component';

import { MsalRedirectComponent } from '@azure/msal-angular';
import { MsalConfigDynamicModule } from './msal-config-dynamic.module';
import { AngularSplitModule } from 'angular-split';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ACTIVE_ENVIRONMENT_URL, USER_IS_LOGGED_IN } from './models/tokens';
import { ResultTableComponent } from './components/query-builder/result-table/result-table.component';
import { LoadingInterceptor } from './components/loading-indicator/loading.interceptor';
import { MultiValueFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/multi-value-form/multi-value-form.component';
import { StatusFormComponent } from './components/query-builder/control-panel/query-forms/filter-condition-form/status-form/status-form.component';

// Taiga UI imports - using NO_ERRORS_SCHEMA to handle unknown elements
import { NgDompurifySanitizer } from '@tinkoff/ng-dompurify';
import { PolymorpheusModule } from '@tinkoff/ng-polymorpheus';
import { TuiIcon, TUI_ICON_RESOLVER, TuiIconPipe } from '@taiga-ui/core';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiInputInline } from '@taiga-ui/kit';

// We use factory function instead of class for TuiDialogService
export function emptyDialogServiceFactory() {
  // Return a minimal implementation that does nothing
  return {
    open: () => ({ subscribe: () => {} }),
    // Add other methods as needed
  };
}

export function iconResolver(): TuiStringHandler<string> {
  return (name: string): string => {       
    if (name.startsWith('@tui.')) {
      const iconName = name.replace('@tui.', '');
      return `/assets/icons/${iconName}.svg`;
    }
    
    if (name.startsWith('tuiIcon')) {
      const iconName = name.replace('tuiIcon', '').toLowerCase();
      return `/assets/icons/${iconName}.svg`;
    }
        return `/assets/icons/${name}.svg`;
  };
}

@NgModule({
  declarations: [
    AppComponent,
    MainToolbarComponent,
    ConnectionsComponent,
    MenuComponent,
    UserInfoComponent,
    ConnectionsDialogComponent,
    ControlPanelComponent,
    TreePanelComponent,
    CodeEditorComponent,
    CodeEditorFooterComponent,
    NodeStyleDirective,
    QuickActionsComponent,
    LoadingIndicatorComponent,
    EntityFormComponent,
    RootFormComponent,
    AttributeFormComponent,
    FilterFormComponent,
    FilterConditionFormComponent,
    NumberFormComponent,
    BooleanFormComponent,
    DateTimeFormComponent,
    IdFormComponent,
    PicklistFormComponent,
    StringFormComponent,
    LinkEntityFormComponent,
    OrderFormComponent,
    ValueFormComponent,
    ResultTableComponent,
    MultiValueFormComponent,
    StatusFormComponent,
    SettingsComponent,
  ],
  bootstrap: [AppComponent, MsalRedirectComponent], 
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AsyncPipe,
    AppRoutingModule,
    AngularSplitModule,
    FormsModule,
    ReactiveFormsModule,
    MsalConfigDynamicModule.forRoot('assets/configuration.json'),
    SvgIconsModule,
    PolymorpheusModule,
    TuiIcon,
    TuiIconPipe,
    QueryTreeButtonBlockComponent, // Import the standalone component
    ErrorDialogComponent // Import standalone ErrorDialogComponent
  ], 
  schemas: [NO_ERRORS_SCHEMA], // Using NO_ERRORS_SCHEMA to handle unknown elements
  providers: [
    { provide: ACTIVE_ENVIRONMENT_URL, useValue: new BehaviorSubject<string>('') },
    { provide: USER_IS_LOGGED_IN, useValue: new BehaviorSubject<boolean>(false) },
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    ValidationService,
    // Use a factory function for TuiDialogService
    { provide: 'TuiDialogService', useFactory: emptyDialogServiceFactory },
    // Direct icon resolver with predefined SVG content
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
  ]
})
export class AppModule { }