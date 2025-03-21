import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { switchMap, catchError, of, Subscription, tap } from 'rxjs';
import { XmlExecutorService } from '../services/xml-executor.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';

interface ResultData {
  header: { [key: string]: { displayName: string, logicalName: string, type: string } };
  'raw-values': any[];
  'formated-values': any[];
}

@Component({
  selector: 'app-result-table',
  templateUrl: './result-table.component.html',
  styleUrls: ['./result-table.component.css']
})
export class ResultTableComponent implements OnInit, OnDestroy {

  // Using same key defined in interceptor or a standard key for HTTP requests
  readonly LOADING_KEY = 'http-requests';

  selectedRow: any;
  selectedOverflowCell: any;
  
  showFormattedValues = true; // Toggle for formatted/raw values
  
  displayedColumns: string[] = [];
  dataSource: any[] = [];
  
  // Store the complete result data
  resultData: ResultData | null = null;
  
  // Store the latest XML without executing it
  private latestXml: string = '';
  private xmlSubscription: Subscription;

  constructor(private xmlExecutor: XmlExecutorService, private nodeTreeService: NodeTreeService) { }
  @Output() resultTableGetResult = new EventEmitter<void>();

  ngOnInit() {
    // Subscribe to XML changes but don't execute requests automatically
    this.xmlSubscription = this.nodeTreeService.xmlRequest$.subscribe(xml => {
      this.latestXml = xml;
    });
  }
  
  ngOnDestroy() {
    if (this.xmlSubscription) {
      this.xmlSubscription.unsubscribe();
    }
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

    // Use the stored XML to execute the request only when explicitly called
    this.executeQuery(this.latestXml, entityNode);
  }
  
  private executeQuery(xml: string, entityNode: QueryNode) {
    console.log('ResultTableComponent: Starting executeQuery');
    
    if (!xml) {
      console.error('No XML available');
      this.displayedColumns = ['No query available'];
      this.dataSource = [];
      return;
    }
    
    this.xmlExecutor.executeXmlRequest(xml, entityNode)
      .pipe(
        tap(response => {
          if (response && response.header) {
            console.log('ResultTableComponent: Header keys:', Object.keys(response.header));
            console.log('ResultTableComponent: Raw values length:', response['raw-values']?.length);
            console.log('ResultTableComponent: Formatted values length:', response['formated-values']?.length);
          }
        }),
        catchError(error => {
          console.error('Error in query execution:', error);
          return of({ header: {}, 'raw-values': [], 'formated-values': [] } as ResultData);
        })
      )
      .subscribe({
        next: (data: ResultData) => {
          this.resultData = data;

          if (!data || !data['raw-values'] || data['raw-values'].length === 0) {
            console.log('ResultTableComponent: No results to display');
            this.displayedColumns = ['No results'];
            this.dataSource = [];
            return;
          }

          // Get columns from header
          this.displayedColumns = ['No.', ...Object.keys(data.header)];
          
          // Set the data source based on the toggle state
          this.refreshDataSource();
        },
        error: error => {
          console.error('Error getting results:', error);
          this.displayedColumns = ['Error'];
          this.dataSource = [{ 'Error': 'Failed to fetch results. See console for details.' }];
        }
      });
  }

  private getEntityNode(): QueryNode {
    return this.nodeTreeService.getNodeTree().value.root.next;
  }

  selectRow(row: any) {
    this.selectedRow = row;
  }

  selectCell(element: Object, cell: HTMLElement) {
    if (this.isTextHidden(cell)) {
      this.selectedOverflowCell = element;
    } else if (this.selectedOverflowCell != element) {
      this.selectedOverflowCell = null;
    }
  }

  isTextHidden(cell: HTMLElement): boolean {
    return cell.scrollWidth > cell.clientWidth;
  }

  getFieldType(columnName: string): string {
    if (!this.resultData || !this.resultData.header || columnName === 'No.') {
      return columnName === 'No.' ? 'number' : 'string';
    }

    const fieldInfo = this.resultData.header[columnName];
    if (!fieldInfo) return 'string';

    // Convert field types from the header to our internal types
    switch (fieldInfo.type.toLowerCase()) {
      case 'money':
      case 'decimal':
      case 'double':
      case 'integer':
        return 'number';
      case 'datetime':
        return 'datetime';
      case 'lookup':
        return 'lookup';
      case 'boolean':
        return 'boolean';
      case 'uniqueidentifier':
        return 'uniqueidentifier';
      case 'picklist':
      case 'state':
      case 'status':
        return 'picklist';
      default:
        return 'string';
    }
  }

  getCellClass(columnName: string): string {
    if (columnName === 'No.') return 'number-cell';

    const type = this.getFieldType(columnName);

    switch (type.toLowerCase()) {
      case 'string':
      case 'memo':
        return 'text-cell';
      case 'number':
        return 'number-cell';
      case 'boolean':
        return 'boolean-cell';
      case 'datetime':
        return 'date-cell';
      case 'lookup':
        return 'lookup-cell';
      case 'uniqueidentifier':
        return 'uniqueidentifier-cell';
      case 'picklist':
        return 'picklist-cell';
      default:
        return 'text-cell'; // Default styling
    }
  }

  getColumnDisplayName(columnName: string): string {
    if (columnName === 'No.') return 'No.';
    
    if (!this.resultData || !this.resultData.header) {
      return columnName;
    }
    
    const fieldInfo = this.resultData.header[columnName];
    if (!fieldInfo) {
      return columnName;
    }
    
    // If we're showing formatted values, return the displayName, otherwise return the logical name
    if (this.showFormattedValues) {
      return fieldInfo.displayName || columnName;
    } else {
      // For technical values view, show the logical name
      return fieldInfo.logicalName || columnName;
    }
  }

  formatCellValue(value: any): string {
    // Handle null or undefined values
    if (value === null || value === undefined) {
      return 'null';
    }
    return value;
  }

  private formatDisplayName(fieldName: string): string {
    // Remove prefixes like cr1fc_
    let displayName = fieldName.replace(/^[a-z0-9]+_/i, '');
    
    // Convert camelCase to Title Case with spaces
    return displayName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  toggleValueFormat() {
    // Store the currently selected row before toggling
    const currentSelectedRow = this.selectedRow ? { ...this.selectedRow } : null;
    
    this.showFormattedValues = !this.showFormattedValues;
    
    // Refresh the data source with the new format
    this.refreshDataSource();
    
    // Restore the selected row if possible
    if (currentSelectedRow && this.dataSource.length > 0) {
      const rowIndex = currentSelectedRow['No.'] - 1;
      if (rowIndex >= 0 && rowIndex < this.dataSource.length) {
        this.selectedRow = this.dataSource[rowIndex];
      }
    }
  }

  private refreshDataSource() {
    if (!this.resultData) {
      return;
    }
    
    // Choose the data source based on the toggle state
    let sourceData;
    const variants = {
      raw: ['raw-values', 'rawvalues', 'raw_values', 'rawValues'],
      formatted: ['formated-values', 'formatted-values', 'formatedvalues', 'formattedvalues', 'formated_values', 'formatted_values']
    };
    
    if (this.showFormattedValues) {
      // Try all possible variants of formatted values property name
      for (const variant of variants.formatted) {
        if (variant in this.resultData && this.resultData[variant]) {
          sourceData = this.resultData[variant];
          break;
        }
      }
    } else {
      // Try all possible variants of raw values property name
      for (const variant of variants.raw) {
        if (variant in this.resultData && this.resultData[variant]) {
          sourceData = this.resultData[variant];
          break;
        }
      }
    }
    
    if (!sourceData || sourceData.length === 0) {
      this.dataSource = [];
      return;
    }
    
    // Add row numbers
    this.dataSource = sourceData.map((item, index) => {
      const newItem = { 'No.': index + 1, ...item };
      return newItem;
    });
  }

  // Check if a field has different formatted and raw values
  hasFormattedValue(row: any, columnName: string): boolean {
    if (!this.resultData || columnName === 'No.') return false;
    
    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0) return false;
    
    // Get raw and formatted values using helper methods
    const rawValue = this.getRawValue(row, columnName);
    const formattedValue = this.getFormattedValue(row, columnName);
    
    return rawValue !== formattedValue && formattedValue !== null;
  }
  
  // Get the raw value for a field
  getRawValue(row: any, columnName: string): any {
    if (!this.resultData || columnName === 'No.') return null;
    
    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0) return null;
    
    // Try all possible raw value properties
    const variants = ['raw-values', 'rawvalues', 'raw_values', 'rawValues'];
    
    for (const variant of variants) {
      if (this.resultData[variant] && 
          rowIndex < this.resultData[variant].length) {
        return this.resultData[variant][rowIndex][columnName];
      }
    }
    
    return null;
  }
  
  // Get the formatted value for a field
  getFormattedValue(row: any, columnName: string): any {
    if (!this.resultData || columnName === 'No.') return null;
    
    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0) return null;
    
    // Try all possible formatted value properties
    const variants = ['formated-values', 'formatted-values', 'formatedvalues', 
                      'formattedvalues', 'formated_values', 'formatted_values'];
    
    for (const variant of variants) {
      if (this.resultData[variant] && 
          rowIndex < this.resultData[variant].length) {
        return this.resultData[variant][rowIndex][columnName];
      }
    }
    
    return null;
  }
}