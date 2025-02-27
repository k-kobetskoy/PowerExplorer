import { NodeTreeService } from '../services/node-tree.service';
import { LinterProviderService } from '../services/xml-parsing-services/linter-provider.service';
import { ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
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

import { FormControl } from '@angular/forms';
import { XmlParseService } from '../services/xml-parsing-services/xml-parse.service';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeEditorComponent implements OnInit {
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
  ) { }

  ngOnInit() {
    this.queryRendererService.renderXmlRequest();
    this.xmlRequest$ = this.nodeTreeProcessor.xmlRequest$;
  }

  ngAfterViewInit(): void {
    this.initializeCodeMirror();    
  }

  initializeCodeMirror() {

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
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: xml }
      });
    });
  }

  // Method to handle the Parse XML button click
  parseXml() {
    if (this.editorView) {
      this.xmlParseService.parseXmlManually(this.editorView);
    }
  }

  validateXml() {
    console.log('XML validation requested');
  }
}
