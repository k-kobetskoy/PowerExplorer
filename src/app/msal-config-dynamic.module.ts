import { NgModule } from '@angular/core';

/**
 * This is a placeholder module for MSAL configuration.
 * MSAL browser is no longer used in this application.
 * Authentication is handled by Electron.
 */
@NgModule({
  providers: [],
  imports: []
})
export class MsalConfigDynamicModule {
  static forRoot(configFile: string) {
    return {
      ngModule: MsalConfigDynamicModule,
      providers: []
    };
  }
}