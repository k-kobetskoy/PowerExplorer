// CodeEditorComponent - Fixing component declaration issue
import { NodeTreeService } from '../services/node-tree.service';
import { LinterProviderService } from '../services/xml-parsing-services/linter-provider.service';
import { AfterContentInit, ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryRenderService } from '../services/query-render.service';
import { basicSetup } from 'codemirror';
import { DOCUMENT } from '@angular/common';
import { xml, xmlLanguage } from "@codemirror/lang-xml";
import { EditorState, Extension } from '@codemirror/state';
import { keymap, EditorView } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { lintGutter } from "@codemirror/lint"
import {
  oneDark,
  oneDarkTheme,
} from '@codemirror/theme-one-dark';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { XmlParseService } from '../services/xml-parsing-services/xml-parse.service';
import { CodeEditorFooterComponent } from '../code-editor-footer/code-editor-footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CodeEditorFooterComponent
  ]
})
export class CodeEditorComponent implements OnInit, AfterContentInit {
  @ViewChild('myeditor') myEditor: ElementRef;
  editorFormControl = new FormControl('');

  xmlRequest$: Observable<string>;
  xmlSyntaxErrors: any;
  private editorView: EditorView;

  constructor(
    private nodeTreeProcessor: NodeTreeService,
    private linterProviderService: LinterProviderService,
    private queryRendererService: QueryRenderService,
    private xmlParseService: XmlParseService,
    @Inject(DOCUMENT) private document: Document
  ) { 
    console.log('CodeEditorComponent constructor called!!!');
  }

  ngOnInit() {
    console.log('CodeEditorComponent ngOnInit called');
    this.queryRendererService.renderXmlRequest();
    this.xmlRequest$ = this.nodeTreeProcessor.xmlRequest$;
  }

  ngAfterContentInit() {
    console.log('CodeEditorComponent ngAfterContentInit called');
  }

  ngAfterViewInit(): void {
    console.log('CodeEditorComponent ngAfterViewInit called');
    console.log('myEditor element:', this.myEditor?.nativeElement);
    this.initializeCodeMirror();    
  }

  initializeCodeMirror() {
    console.log('CodeEditorComponent initializeCodeMirror called');
    if (!this.myEditor) {
      console.error('myEditor is undefined');
      return;
    }

    const linter = this.linterProviderService.getLinter();

    let editorExtensions: Extension = [
      basicSetup,
      xml({ elements: [{ name: 'fetch', children: ['attribute', 'filter', 'link-entity', 'order', 'paging', 'value', 'link-entity'] }, xmlLanguage] }),
      oneDark,
      linter,
      lintGutter({ hoverTime: 100 })];

    let initialState = EditorState.create({
      doc: '',
      extensions: editorExtensions
    });

    this.editorView = new EditorView({
      state: initialState,
      parent: this.myEditor.nativeElement,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        oneDarkTheme,
      ]
    });

    this.xmlRequest$.subscribe(xml => {
      console.log('Received XML to display:', xml);
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: xml }
      });
    });
  }

  // Method to handle the Parse XML button click
  parseXml() {
    console.log('CodeEditorComponent parseXml called');
    if (this.editorView) {
      this.xmlParseService.parseXmlManually(this.editorView);
    }
  }

  validateXml() {
    console.log('XML validation requested');
  }
}
