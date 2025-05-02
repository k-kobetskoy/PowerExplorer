import { Component, EventEmitter, OnInit, Output, ViewEncapsulation, NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-editor-footer',
  templateUrl: './code-editor-footer.component.html',
  styleUrls: ['./code-editor-footer.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class CodeEditorFooterComponent implements OnInit {

  @Output() onParse: EventEmitter<void> = new EventEmitter<void>();
  @Output() onValidate: EventEmitter<void> = new EventEmitter<void>();
  constructor() { }

  ngOnInit() {
  }
}
