import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {

  title = 'Angular 16 - MSAL Angular v3 Sample';
  isIframe: boolean
  constructor(private authService: AuthService) {
    this.isIframe = authService.isIframe
  }

  ngOnInit(): void {
    this.authService.init()
  }
}