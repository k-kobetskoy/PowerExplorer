import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
@Component({
  standalone: true,
  imports: [MatIconModule],
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],  
})
export class SettingsComponent implements OnInit {

constructor() { }

ngOnInit() {
}

openSettings() {
  // Will implement settings functionality later
  console.log('Settings clicked');
}
} 