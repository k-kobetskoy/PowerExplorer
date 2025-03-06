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
  rawData: any[] = []; // Store the raw data with all annotations
  
  showFormattedValues = true; // Toggle for formatted/raw values
  technicalColumns: string[] = []; // Store technical column names
  displayColumns: string[] = []; // Store display column names

  displayedColumns: string[];
  dataSource: Object[];
  fieldTypes: Map<string, string> = new Map<string, string>();
  private displayNames: Map<string, string> = new Map<string, string>();

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
        this.displayNames.clear();
        this.rawData = [...data]; // Store a copy of the raw data

        if (!data || data.length === 0) {
          this.displayedColumns = ['No results'];
          this.dataSource = [];
          return;
        }

        console.log('Raw data from executor:', data);
        
        // Process the structured data
        const normalizedData = data.map((item: any, index) => {
          const normalizedItem: { [key: string]: any } = { 'No.': index + 1 };
          
          // Process each field in the item
          Object.keys(item).forEach(key => {
            const fieldInfo = item[key];
            
            // Store field type information for styling
            if (fieldInfo && typeof fieldInfo === 'object' && 'type' in fieldInfo) {
              this.fieldTypes.set(key, fieldInfo.type);
              
              // Store display name if available
              if (fieldInfo.displayName) {
                this.displayNames.set(key, fieldInfo.displayName);
              }
              
              // Use formatted value if available and showFormattedValues is true, otherwise use raw value
              normalizedItem[key] = (this.showFormattedValues && fieldInfo.FormattedValue) 
                ? fieldInfo.FormattedValue 
                : fieldInfo.value;
            } else {
              // Fallback for simple values
              normalizedItem[key] = fieldInfo;
            }
          });
          
          return normalizedItem;
        });
        
        // Get all unique keys from the normalized data
        const allKeys = new Set<string>();
        normalizedData.forEach(item => {
          Object.keys(item).forEach(key => {
            if (key !== 'No.') {
              allKeys.add(key);
            }
          });
        });
        
        // Store both technical and display column names
        this.technicalColumns = ['No.', ...Array.from(allKeys)];
        
        // Create display columns with formatted names - keep the same columns, just display them differently
        this.displayColumns = [...this.technicalColumns]; // Same columns, different display
        
        // Set the displayed columns based on the toggle state
        this.displayedColumns = this.showFormattedValues ? this.displayColumns : this.technicalColumns;
        this.dataSource = normalizedData;
        
        console.log('Normalized data for display:', normalizedData);
        console.log('Field types for styling:', this.fieldTypes);
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
    } else if (this.selectedOverflowCell != element) {
      this.selectedOverflowCell = null;
    }
  }

  isTextHidden(cell: HTMLElement): boolean {
    return cell.scrollWidth > cell.clientWidth;
  }

  getFieldType(columnName: string): string {
    if (columnName === 'No.') return 'number';

    const type = this.fieldTypes.get(columnName);
    if (type) {
      // Convert Dynamics CRM types to our internal types
      switch (type.toLowerCase()) {
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
    
    return 'string'; // Default to string type if no type info is available
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
      case 'uniqueidentifier':
        return 'uniqueidentifier-cell';
      case 'picklist':
      case 'state':
      case 'status':
        return 'picklist-cell';
      default:
        return 'text-cell'; // Default styling
    }
  }

  getColumnDisplayName(columnName: string): string {
    if (columnName === 'No.') return 'No.';
    
    // If showing raw values, return the technical name
    if (!this.showFormattedValues) {
      return columnName;
    }
    
    // Get the display name from our map, or format the column name if not available
    const displayName = this.displayNames.get(columnName);
    if (displayName) {
      return displayName;
    }
    
    return this.formatDisplayName(columnName);
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

  // Get the raw field data with all annotations for a specific row and column
  getRawFieldData(row: any, columnName: string): any {
    if (!this.rawData.length || !row || !columnName) return null;
    
    // Find the corresponding raw data row
    const rowIndex = this.dataSource.indexOf(row);
    if (rowIndex === -1) return null;
    
    const rawRow = this.rawData[rowIndex];
    return rawRow[columnName];
  }

  toggleValueFormat() {
    // Store the currently selected row before toggling
    const currentSelectedRow = this.selectedRow;
    const currentSelectedCell = this.selectedOverflowCell;
    
    this.showFormattedValues = !this.showFormattedValues;
    
    // Toggle between technical and display column names
    if (this.technicalColumns.length > 0 && this.displayColumns.length > 0) {
      this.displayedColumns = this.showFormattedValues ? this.displayColumns : this.technicalColumns;
    }
    
    this.refreshDataSource();
    
    // Restore the selected row and cell after refreshing the data source
    if (currentSelectedRow) {
      // Find the corresponding row in the new data source by index
      const rowIndex = this.dataSource.findIndex(row => 
        row['No.'] === currentSelectedRow['No.']
      );
      
      if (rowIndex >= 0) {
        this.selectedRow = this.dataSource[rowIndex];
        
        // If there was a selected cell, try to restore that as well
        if (currentSelectedCell && currentSelectedCell['No.'] === currentSelectedRow['No.']) {
          this.selectedOverflowCell = this.selectedRow;
        }
      }
    }
  }

  private refreshDataSource() {
    if (!this.rawData || this.rawData.length === 0) return;

    const normalizedData = this.rawData.map((item: any, index) => {
      const normalizedItem: { [key: string]: any } = { 'No.': index + 1 };
      
      // Process each field in the item
      Object.keys(item).forEach(key => {
        const fieldInfo = item[key];
        
        if (fieldInfo && typeof fieldInfo === 'object' && 'value' in fieldInfo) {
          // Use formatted value if available and showFormattedValues is true, otherwise use raw value
          normalizedItem[key] = (this.showFormattedValues && fieldInfo.FormattedValue) 
            ? fieldInfo.FormattedValue 
            : fieldInfo.value;
        } else {
          // Fallback for simple values
          normalizedItem[key] = fieldInfo;
        }
      });
      
      return normalizedItem;
    });
    
    this.dataSource = normalizedData;
  }

  // Helper method to determine if a field has a formatted value
  hasFormattedValue(row: any, columnName: string): boolean {
    if (!this.rawData.length || !row || !columnName || columnName === 'No.') return false;
    
    const rawField = this.getRawFieldData(row, columnName);
    return rawField && typeof rawField === 'object' && 'FormattedValue' in rawField;
  }
}