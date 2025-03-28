import { Component, OnInit, ViewChild, ViewEncapsulation, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from './code-editor/code-editor.component';
import { QueryTreeButtonBlockComponent } from './query-tree-button-block/query-tree-button-block.component';
import { TreePanelComponent } from './tree-panel/tree-panel.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import { ResultTableComponent } from './result-table/result-table.component';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from 'src/app/services/navigation.service';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  ]
})
export class QueryBuilder implements OnInit {

  selectedTabIndex = 0;

  @ViewChild('resultTable') resultTable: ResultTableComponent;
  @ViewChild('codeEditor') codeEditor: CodeEditorComponent;

  constructor(private navigationService: NavigationService) { }

  ngOnInit() {
    this.navigationService.handleUrlParamOnComponentInit(QUERY_BUILDER_COMPONENT_URL)
  }

  toggleTab() {
    this.selectedTabIndex = this.selectedTabIndex === 0 ? 1 : 0;
  }

  handleExecuteXmlRequest() {
    // Switch to the results tab if not already there
    if (this.selectedTabIndex !== 1) {
      this.selectedTabIndex = 1;
    }

    // Safely access resultTable
    setTimeout(() => {
      if (this.resultTable) {
        this.resultTable.getResult();
      } else {
        console.error('Result table not initialized yet');
      }
    }, 0);
  }
}
