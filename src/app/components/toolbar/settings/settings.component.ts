import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogConfig } from '@angular/material/dialog';
import { AboutDialogComponent } from './about-dialog/about-dialog.component';
import { DesktopAuthService } from '../../../services/desktop-auth.service';
import { take, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ACTIVE_ACCOUNT_MODEL } from 'src/app/models/tokens';
import { AccountInfo } from '@azure/msal-browser';
import { BehaviorSubject, Subject } from 'rxjs';

@Component({
  standalone: true,
  imports: [MatIconModule, MatMenuModule, MatDialogModule, CommonModule],
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit, OnDestroy {
  initials: string = '';
  backgroundColor: string = '#000';

  constructor(
    @Inject(ACTIVE_ACCOUNT_MODEL) public activeAccount: BehaviorSubject<AccountInfo>,
    private dialog: MatDialog,
    private electronAuthService: DesktopAuthService
  ) { }

  destroyed$ = new Subject<void>();

  ngOnInit() {
    this.activeAccount.pipe(takeUntil(this.destroyed$)).subscribe(account => {
      this.initials = this.getInitials(account?.name || '');
      this.backgroundColor = this.generateColor(account?.name || '');
    });
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }

 generateColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Less saturated (40%) and a bit lighter (60%)
  const color = `hsl(${hash % 360}, 30%, 50%)`;
  return color;
}




  onAboutClick() {
    console.log('About clicked');

    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '980px';
    dialogConfig.height = '610px';
    dialogConfig.disableClose = false;

    this.dialog.open(AboutDialogComponent, dialogConfig);
  }

  onLogoutClick() {
    console.log('Logout clicked');
    this.electronAuthService.logout().pipe(take(1)).subscribe(result => {
      console.log('Logout result:', result);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
} 