import { Component, OnInit, ViewChild, ViewEncapsulation, NO_ERRORS_SCHEMA } from '@angular/core';
import { NavigationService } from 'src/app/services/navigation.service';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { QueryTreeButtonBlockComponent } from './query-tree-button-block/query-tree-button-block.component';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TUI_ICON_RESOLVER, TuiIcon } from '@taiga-ui/core';
import { iconResolver } from '../../app.module';

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
    TuiIcon
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
  
  @ViewChild('resultTable') resultTable: any;

  constructor(private navigationService: NavigationService) { }

  ngOnInit() {
    this.navigationService.handleUrlParamOnComponentInit(QUERY_BUILDER_COMPONENT_URL)
  }

  toggleTab() {
    // Toggle between XML (0) and Result (1) tabs
    this.selectedTabIndex = this.selectedTabIndex === 0 ? 1 : 0;
  }

  parseXml(xml: string) {
    // this.xmlParseService.parse(xml);    
  }

  validateXml(xml: string) {
    // let validationResult =this.xmlParseService.validate(xml);
    // console.log(validationResult);
  }
}