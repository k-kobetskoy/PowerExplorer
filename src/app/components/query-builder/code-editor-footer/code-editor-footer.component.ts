import { Component, EventEmitter, OnInit, Output, ViewEncapsulation, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-editor-footer',
  templateUrl: './code-editor-footer.component.html',
  styleUrls: ['./code-editor-footer.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class CodeEditorFooterComponent implements OnInit {

  @Output() onParse: EventEmitter<void> = new EventEmitter<void>();
  @Output() onValidate: EventEmitter<void> = new EventEmitter<void>();
  constructor() { }

  ngOnInit() {
  }
}
