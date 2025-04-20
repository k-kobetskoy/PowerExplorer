import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogConfig } from '@angular/material/dialog';
import { AboutDialogComponent } from './about-dialog/about-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { EnvironmentEntityService } from '../../query-builder/services/entity-services/environment-entity.service';

@Component({
  standalone: true,
  imports: [MatIconModule, MatMenuModule, MatDialogModule],
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],  
})
export class SettingsComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private authService: AuthService,
    private environmentService: EnvironmentEntityService
  ) { }

  ngOnInit() {
  }

  onAboutClick() {
    console.log('About clicked');
    
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '980px';
    dialogConfig.height = '610px';
    dialogConfig.disableClose = false;
    
    this.dialog.open(AboutDialogComponent, dialogConfig);
  }

  onLogoutClick(): void {
    this.environmentService.logout();
    this.authService.logoutPopup();
  }
} 