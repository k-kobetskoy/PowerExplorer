import { Component, OnInit } from '@angular/core';
import { Icons } from 'src/app/components/svg-icons/icons';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsIcon = Icons.SETTINGS;

  constructor() { }

  ngOnInit() {
  }

  openSettings() {
    // Will implement settings functionality later
    console.log('Settings clicked');
  }
} 