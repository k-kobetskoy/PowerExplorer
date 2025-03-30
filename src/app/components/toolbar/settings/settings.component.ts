import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogConfig } from '@angular/material/dialog';
import { AboutDialogComponent } from './about-dialog/about-dialog.component';

@Component({
  standalone: true,
  imports: [MatIconModule, MatMenuModule, MatDialogModule],
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],  
})
export class SettingsComponent implements OnInit {

constructor(private dialog: MatDialog) { }

ngOnInit() {
}

// openSettings() {
//   // Menu now handled by mat-menu directive
//   console.log('Settings clicked');
// }

onAboutClick() {
  console.log('About clicked');
  
  const dialogConfig = new MatDialogConfig();
  dialogConfig.width = '980px';
  dialogConfig.height = '610px';
  dialogConfig.disableClose = false;
  
  this.dialog.open(AboutDialogComponent, dialogConfig);
}
} 