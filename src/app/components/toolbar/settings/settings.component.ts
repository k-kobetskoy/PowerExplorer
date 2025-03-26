import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Icons } from '../../svg-icons/icons';

@Component({
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