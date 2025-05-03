import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { Extension } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { lintGutter } from '@codemirror/lint';
import { history } from '@codemirror/commands';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import { linter } from '@codemirror/lint';
import { json } from '@codemirror/lang-json';
import { BehaviorSubject, Subscription } from 'rxjs';

@Component({
  selector: 'app-raw-result-panel',
  templateUrl: './raw-result-panel.component.html',
  styleUrls: ['./raw-result-panel.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class RawResultPanelComponent implements OnInit, OnDestroy {
  @ViewChild('myeditor') myEditor: ElementRef;
  editorView: EditorView;
  
  // Use a standard input property with BehaviorSubject
  @Input() dataSource: BehaviorSubject<any>;
  private subscription: Subscription;
  
  constructor() {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.initializeCodeMirror();
    
    // Subscribe to dataSource changes
    if (this.dataSource) {
      this.subscription = this.dataSource.subscribe(data => {
        if (this.editorView && data) {
          this.updateEditor(JSON.stringify(data, null, 2));
        }
      });
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  initializeCodeMirror() {
    let editorExtensions: Extension = [
      basicSetup,
      json(),
      oneDark];

    // Get initial value from BehaviorSubject if available
    const initialData = this.dataSource?.getValue();
    
    let initialState = EditorState.create({
      doc: initialData ? JSON.stringify(initialData, null, 2) : '', 
      extensions: editorExtensions
    });

    this.editorView = new EditorView({
      state: initialState,
      parent: this.myEditor.nativeElement,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        oneDark,
      ]
    });
  }

  // Helper method to update editor content
  private updateEditor(jsonData: string) {
    if (!this.editorView) return;
    
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: jsonData }
    });
  }
}
