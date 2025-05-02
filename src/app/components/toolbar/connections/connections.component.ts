import { Component, EventEmitter, OnInit, Output, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { EnvironmentModel } from 'src/app/models/environment-model';
import { MatRippleModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionsDesktopComponent } from './connections-desktop/connections-desktop.component';
import { ACTIVE_ENVIRONMENT_MODEL } from 'src/app/models/tokens';
import { BehaviorSubject } from 'rxjs';
@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatRippleModule,
    MatIconModule
  ],
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.css']
})
export class ConnectionsComponent implements OnInit {

  @Output() onEnvironmentConnection = new EventEmitter<EnvironmentModel>()
  activeEnvironment$: Observable<EnvironmentModel>

  constructor(private dialog: MatDialog, @Inject(ACTIVE_ENVIRONMENT_MODEL) private activeEnvironment: BehaviorSubject<EnvironmentModel>) { }

  ngOnInit() {   
    this.activeEnvironment$ = this.activeEnvironment.asObservable();
  }


  openDesktopEnvironmentDialog(){
    this.dialog.open(ConnectionsDesktopComponent, {
      height: '800px',
      width: '400px',
    })
  }  
}