import { Component, OnInit, ViewChild, ViewEncapsulation, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from './code-editor/code-editor.component';
import { QueryTreeButtonBlockComponent, XmlRequestEvent } from './query-tree-button-block/query-tree-button-block.component';
import { TreePanelComponent } from './tree-panel/tree-panel.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import { ResultTableComponent } from './result-table/result-table.component';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from 'src/app/services/navigation.service';
import { MatButtonModule } from '@angular/material/button';
export const QUERY_BUILDER_COMPONENT_URL: string = '/querybuilder';

@Component({
  selector: 'app-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  imports: [
    CommonModule,
    AngularSplitModule,
    FormsModule,
    ResultTableComponent,
    CodeEditorComponent,
    QueryTreeButtonBlockComponent,
    TreePanelComponent,
    ControlPanelComponent,
    MatIconModule,
    CodeEditorComponent,
    MatButtonModule
  ],
})
export class QueryBuilder implements OnInit {
  selectedTabIndex = 0;

  @ViewChild('resultTable') resultTable: ResultTableComponent;
  @ViewChild('codeEditor') codeEditor: CodeEditorComponent;

  constructor(
    private navigationService: NavigationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.navigationService.handleUrlParamOnComponentInit(QUERY_BUILDER_COMPONENT_URL);
  }

  switchToTab(tabIndex: number) {
    if (this.selectedTabIndex === tabIndex) return;

    this.selectedTabIndex = tabIndex;
    this.cdr.markForCheck();
    
    // If switching to result tab, only trigger query execution if we already have results
    if (tabIndex === 1 && this.resultTable) {
      console.log('Switching to results tab - showing cached results only');
      // Don't automatically trigger a new query
    }
  }

  toggleTab() {
    this.switchToTab(this.selectedTabIndex === 0 ? 1 : 0);
  }

  handleExecuteXmlRequest(event: XmlRequestEvent) {
    console.log('QueryBuilder: handleExecuteXmlRequest called with XML data');
    
    // Switch to the results tab
    if (this.selectedTabIndex !== 1) {
      this.selectedTabIndex = 1;
      this.cdr.markForCheck();
    }
    
    // Now make sure the result table executes the query
    // Need to use setTimeout to ensure ViewChild is initialized
    setTimeout(() => {
      if (this.resultTable) {
        console.log('Triggering getResult on resultTable with provided XML data');
        this.resultTable.executeWithData(event.xml, event.entityNode);
      } else {
        console.error('ResultTable component not found');
      }
    }, 0);
  }
}
