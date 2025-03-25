/* tslint:disable:no-unused-variable */
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { CodeEditorComponent } from './code-editor.component';
import { CodeEditorFooterComponent } from '../code-editor-footer/code-editor-footer.component';
import { NodeTreeService } from '../services/node-tree.service';
import { LinterProviderService } from '../services/xml-parsing-services/linter-provider.service';
import { QueryRenderService } from '../services/query-render.service';
import { XmlParseService } from '../services/xml-parsing-services/xml-parse.service';

describe('CodeEditorComponent', () => {
  let component: CodeEditorComponent;
  let fixture: ComponentFixture<CodeEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ 
        CodeEditorComponent,
        CodeEditorFooterComponent 
      ],
      providers: [
        { provide: NodeTreeService, useValue: {} },
        { provide: LinterProviderService, useValue: { getLinter: () => {} } },
        { provide: QueryRenderService, useValue: { renderXmlRequest: () => {} } },
        { provide: XmlParseService, useValue: {} }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
