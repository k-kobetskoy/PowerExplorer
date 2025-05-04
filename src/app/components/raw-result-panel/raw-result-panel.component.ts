import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup, minimalSetup } from 'codemirror';
import { lintGutter } from '@codemirror/lint';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { BehaviorSubject, Subscription } from 'rxjs';
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets } from "@codemirror/autocomplete";
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter } from "@codemirror/language";
import { powerExplorerTheme } from '../query-builder/code-editor/code-editor.theme';

// Import theme from code-editor if available, otherwise use oneDark
// import { powerExplorerTheme, foldGutterStyle, customFoldGutter } from '../query-builder/code-editor/code-editor.theme';

@Component({
  selector: 'app-raw-result-panel',
  templateUrl: './raw-result-panel.component.html',
  styleUrls: ['./raw-result-panel.component.css'],
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
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
    // Custom setup based on code-editor component
    const customSetup = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      foldGutter(),
      keymap.of([
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab
      ])
    ];

    let editorExtensions: Extension = [
      customSetup,
      json(),
      powerExplorerTheme,  // Use oneDark theme for JSON (or import powerExplorerTheme)
      lintGutter({ hoverTime: 100 })
    ];

    // Get initial value from BehaviorSubject if available
    const initialData = this.dataSource?.getValue();
    
    let initialState = EditorState.create({
      doc: initialData ? JSON.stringify(initialData, null, 2) : '', 
      extensions: editorExtensions
    });

    this.editorView = new EditorView({
      state: initialState,
      parent: this.myEditor.nativeElement
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
