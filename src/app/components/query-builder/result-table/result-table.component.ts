import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { BehaviorSubject, switchMap, tap, catchError, of } from 'rxjs';
import { FieldTypeInfo, TypedResultItem, XmlExecutorService } from '../services/xml-executor.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';

@Component({
  selector: 'app-result-table',
  templateUrl: './result-table.component.html',
  styleUrls: ['./result-table.component.css']
})
export class ResultTableComponent implements OnInit {
  
  selectedRow: any;
  selectedOverflowCell: any;

  displayedColumns: string[];
  dataSource: Object[];
  fieldTypes: Map<string, string> = new Map<string, string>();
  
  constructor(private xmlExecutor: XmlExecutorService, private nodeTreeProcessor: NodeTreeService) { }
  @Output() resultTableGetResult = new EventEmitter<void>();

  ngOnInit() {
  }

  getResult() {
    this.resultTableGetResult.emit();
    const entityNode = this.getEntityNode();

    if (!entityNode) {
      console.error('Entity node not found');
      this.displayedColumns = ['No information available'];
      this.dataSource = [];
      return;
    }

    this.nodeTreeProcessor.xmlRequest$.pipe(
      switchMap(xml => {
        return this.xmlExecutor.executeXmlRequest(xml, entityNode);
      }),
      catchError(error => {
        console.error('Error in query execution:', error);
        return of([]);
      })
    ).subscribe({
      next: data => {
        this.fieldTypes.clear();
        
        if (!data || data.length === 0) {
          this.displayedColumns = ['No results'];
          this.dataSource = [];
          return;
        }
        
        const firstRow = data[0] as any;
        let hasTypeInfo = false;
        
        Object.keys(firstRow).forEach(key => {
          const value = firstRow[key];
          if (value && typeof value === 'object' && 'type' in value) {
            const fieldType = (value as FieldTypeInfo).type;
            this.fieldTypes.set(key, fieldType);
            hasTypeInfo = true;
          }
        });
        
        let normalizedData: any[] = [];
        if (hasTypeInfo) {
          normalizedData = data.map(item => {
            const normalized: { [key: string]: any } = {};
            Object.keys(item).forEach(key => {
              const value = (item as any)[key];
              if (value && typeof value === 'object' && 'value' in value) {
                normalized[key] = (value as FieldTypeInfo).value;
              } else {
                normalized[key] = value;
              }
            });
            return normalized;
          });
        } else {
          normalizedData = data;
        }
        
        const dataKeys = Object.keys(normalizedData[0] || {});
        this.displayedColumns = dataKeys.length ? ['No.', ...dataKeys] : ['No results'];
        this.dataSource = normalizedData.length 
          ? normalizedData.map((item, index) => ({ 'No.': index + 1, ...item }))
          : [];
      },
      error: error => {
        console.error('Error getting results:', error);
        this.displayedColumns = ['Error'];
        this.dataSource = [{ 'Error': 'Failed to fetch results. See console for details.' }];
      }
    });
  }

  private getEntityNode(): QueryNode {
    return this.nodeTreeProcessor.getNodeTree().value.root.next;
  }

  selectRow(row: any) {
    this.selectedRow = row;
  }

  selectCell(element: Object, cell: HTMLElement) {
    if (this.isTextHidden(cell)) {
      this.selectedOverflowCell = element;
    } else if(this.selectedOverflowCell != element){
      this.selectedOverflowCell = null;
    }
  }

  isTextHidden(cell: HTMLElement): boolean {
    return cell.scrollWidth > cell.clientWidth;
  }
  
  getFieldType(columnName: string): string {
    if (columnName === 'No.') return 'number';
    
    const type = this.fieldTypes.get(columnName);
    return type || 'string'; // Default to string type if no type info is available
  }
  
  getCellClass(columnName: string): string {
    if (columnName === 'No.') return 'number-cell';
    
    const type = this.getFieldType(columnName);
    
    switch (type.toLowerCase()) {
      case 'string':
      case 'memo':
        return 'text-cell';
      case 'integer':
      case 'decimal':
      case 'double':
      case 'money':
        return 'number-cell';
      case 'boolean':
        return 'boolean-cell';
      case 'datetime':
        return 'date-cell';
      case 'lookup':
        return 'lookup-cell';
      case 'picklist':
      case 'state':
      case 'status':
        return 'picklist-cell';
      default:
        return 'text-cell'; // Default styling
    }
  }
}