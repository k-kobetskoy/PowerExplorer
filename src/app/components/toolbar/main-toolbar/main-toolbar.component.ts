import { Component, OnInit, ViewChild } from '@angular/core';
import { ConnectionsComponent } from '../connections/connections.component';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ConnectionsComponent,
    SettingsComponent
  ],  
  selector: 'app-main-toolbar',
  templateUrl: './main-toolbar.component.html',
  styleUrls: ['./main-toolbar.component.css']
})
export class MainToolbarComponent implements OnInit {

  @ViewChild(ConnectionsComponent) connectionsComponent: ConnectionsComponent | undefined

  constructor() { }

  ngOnInit() {
  }
}
