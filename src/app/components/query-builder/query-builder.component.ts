import { Component, OnInit, ViewChild, ViewEncapsulation, NO_ERRORS_SCHEMA } from '@angular/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { QueryTreeButtonBlockComponent } from './query-tree-button-block/query-tree-button-block.component';
import { TUI_ICON_RESOLVER, TuiIcon } from '@taiga-ui/core';
import { iconResolver } from '../../app.module';
import { CodeEditorComponent } from './code-editor/code-editor.component';
import { TreePanelComponent } from './tree-panel/tree-panel.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import {TuiSwitch} from '@taiga-ui/kit';
import { ResultTableComponent } from './result-table/result-table.component';
export const QUERY_BUILDER_COMPONENT_URL: string = '/querybuilder';

@Component({
  selector: 'app-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    AngularSplitModule,
    QueryTreeButtonBlockComponent,
    TuiIcon,
    CodeEditorComponent,
    TreePanelComponent,
    ControlPanelComponent,
    TuiSwitch
  ],
  schemas: [NO_ERRORS_SCHEMA],
  providers: [
    {
      provide: TUI_ICON_RESOLVER,
      useFactory: iconResolver
    }
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
}