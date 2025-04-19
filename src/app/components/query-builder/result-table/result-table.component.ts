import { Component, EventEmitter, OnInit, Output, OnDestroy, ViewEncapsulation, ChangeDetectionStrategy, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { catchError, of, Subscription, takeUntil, tap, Subject, BehaviorSubject } from 'rxjs';
import { MatTableRawData, XmlExecutorService } from '../services/xml-executor.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';
import { EnvironmentEntityService } from '../services/entity-services/environment-entity.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CacheStorageService } from '../../../services/data-sorage/cache-storage.service';

@Component({
    selector: 'app-result-table',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatSlideToggleModule,
        MatTableModule,
        MatProgressBarModule,
        MatIconModule,
        MatPaginatorModule
    ],
    templateUrl: './result-table.component.html',
    styleUrls: ['./result-table.component.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class ResultTableComponent implements OnInit, OnDestroy {
  selectedRow: any;
  selectedOverflowCell: any;
  selectedColumn: string | null = null;

  showFormattedValues = true; // Toggle for formatted/raw values

  displayedColumns: string[] = [];
  dataSource: any[] = [];
  
  // Pagination properties
  paginatedData: any[] = [];
  pageSize = 50;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  pageIndex = 0;
  totalRows = 0;

  // Store the complete result data
  resultData: MatTableRawData | null = null;
  
  // Local BehaviorSubject to store the most recent result
  private mostRecentResult = new BehaviorSubject<MatTableRawData | null>(null);
  
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Track current environment URL
  private currentEnvironmentUrl: string = '';
  private environmentSubscription: Subscription;

  // Result subscription
  private resultSubscription: Subscription;
  
  // Add execution state subscription
  private executionStateSubscription: Subscription;

  // Add destroy$ Subject
  private destroy$ = new Subject<void>();

  constructor(
    private xmlExecutor: XmlExecutorService,
    private environmentService: EnvironmentEntityService,
    private nodeTreeService: NodeTreeService,
    private cacheStorageService: CacheStorageService,
    private cdr: ChangeDetectorRef
  ) {
    this.destroy$ = new Subject<void>();
  }
  @Output() resultTableGetResult = new EventEmitter<void>();

  ngOnInit() {
    // Check the initial loading state
    this.isLoading = this.xmlExecutor.isLoading();
    
    // Subscribe to our local result observable instead of cache service
    this.resultSubscription = this.mostRecentResult
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        // Update loading state with each result update
        this.isLoading = this.xmlExecutor.isLoading();
        
        if (!result) {
          this.displayedColumns = ['No results available'];
          this.dataSource = [];
          this.cdr.markForCheck();
          return;
        }
        
        // Only process results when not in loading state and no errors
        if (!this.isLoading && !this.hasError && result.rows?.length > 0) {
          this.resultData = result;
          this.processResultData();
          this.cdr.markForCheck();
        } else if (this.hasError) {
          // Show error in table
          this.displayedColumns = ['Error'];
          this.dataSource = [{ 'Error': this.errorMessage || 'An error occurred' }];
          this.cdr.markForCheck();
        } else if (!this.isLoading && (!result.rows || result.rows.length === 0)) {
          // Show no results message
          this.displayedColumns = ['No results'];
          this.dataSource = [];
          this.cdr.markForCheck();
        }
      });
    
    // Subscribe to loading state changes to detect new executions
    this.executionStateSubscription = this.xmlExecutor.isLoadingState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoading = isLoading;
        
        // Reset error state when a new execution starts
        if (isLoading) {
          this.hasError = false;
          this.errorMessage = '';
          this.cdr.markForCheck();
        } else {
          // When loading finishes
          // Check for errors when loading completes
          const error = this.xmlExecutor.getLastError();
          if (error) {
            this.hasError = true;
            this.errorMessage = typeof error === 'string' 
              ? error 
              : ((error as any)?.message || 'An error occurred during execution');
            
            // Show error in table
            this.displayedColumns = ['Error'];
            this.dataSource = [{ 'Error': this.errorMessage }];
            this.cdr.markForCheck();
          } else {
            // No error - if we have recent results, they should be in our local BehaviorSubject already
            console.log('Execution completed');
            
            // The most recent result should already be in our local BehaviorSubject
            const currentResult = this.mostRecentResult.value;
            if (currentResult && currentResult.rows?.length > 0) {
              console.log('Results available after execution');
              this.resultData = currentResult;
              this.processResultData();
            }
          }
          this.cdr.markForCheck();
        }
      });

    // Subscribe to environment changes for URL building
    this.environmentSubscription = this.environmentService.getActiveEnvironment()
      .pipe(takeUntil(this.destroy$))
      .subscribe(env => {
        if (env && env.apiUrl) {
          // Convert API URL to web client URL
          this.currentEnvironmentUrl = env.apiUrl.replace('.api.', '.');

          // Clean up URL format
          if (this.currentEnvironmentUrl.endsWith('/api/data/v9.2/')) {
            this.currentEnvironmentUrl = this.currentEnvironmentUrl.replace('/api/data/v9.2/', '/');
          } else if (this.currentEnvironmentUrl.endsWith('/api/data/v9.1/')) {
            this.currentEnvironmentUrl = this.currentEnvironmentUrl.replace('/api/data/v9.1/', '/');
          } else if (this.currentEnvironmentUrl.endsWith('/api/data/v9.0/')) {
            this.currentEnvironmentUrl = this.currentEnvironmentUrl.replace('/api/data/v9.0/', '/');
          }

          // Ensure URL ends with slash
          if (!this.currentEnvironmentUrl.endsWith('/')) {
            this.currentEnvironmentUrl += '/';
          }
          
          // If we already have results, refresh data source to update URLs
          if (this.resultData && this.resultData.rows?.length > 0) {
            this.refreshDataSource();
          }
        }
      });
  }

  ngOnDestroy() {
    if (this.environmentSubscription) {
      this.environmentSubscription.unsubscribe();
    }
    if (this.resultSubscription) {
      this.resultSubscription.unsubscribe();
    }
    if (this.executionStateSubscription) {
      this.executionStateSubscription.unsubscribe();
    }
    // Complete the destroy$ Subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  getResult() {
    // Reset error state when getting new results
    this.hasError = false;
    this.errorMessage = '';
    
    // Set loading state
    this.isLoading = true;
    this.cdr.markForCheck();
    
    // Check if we have a stored result already
    if (this.resultData && this.resultData.rows && this.resultData.rows.length > 0) {
      console.log('Using existing result data without a new query');
      this.isLoading = false;
      this.processResultData();
      this.cdr.markForCheck();
      return;
    }
    
    // Emit the event for parent components to handle
    this.resultTableGetResult.emit();
    
    // Try to get current XML for direct execution
    try {
      // Get current XML and node from nodeTreeService
      const xml = this.nodeTreeService.xmlRequest$.value;
      const entityNode = this.getEntityNode();
      
      // Validate we have both valid XML and entity node before attempting execution
      if (!xml) {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'No query defined';
        this.displayedColumns = ['Error'];
        this.dataSource = [{ 'Error': this.errorMessage }];
        this.cdr.markForCheck();
        return;
      }
      
      if (!entityNode || !entityNode.entitySetName$ || !entityNode.entitySetName$.value) {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'No entity selected';
        this.displayedColumns = ['Error'];
        this.dataSource = [{ 'Error': this.errorMessage }];
        this.cdr.markForCheck();
        return;
      }
      
      if (xml && entityNode) {
        // Execute the query and subscribe to the result
        this.xmlExecutor.executeXmlRequest(xml, entityNode)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            result => {
              console.log('Result table direct execution completed successfully');
              
              // Store the result in our local BehaviorSubject for components to use
              this.mostRecentResult.next(result);
              
              // For immediate feedback, process the result directly
              if (result && result.rows && result.rows.length > 0) {
                this.resultData = result;
                this.processResultData();
              }
            },
            error => {
              // Error will be handled by our isLoadingState$ subscription
              console.error('Error in direct execution:', error);
            }
          );
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error?.message || 'Error in query execution';
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private processResultData() {
    if (!this.resultData) {
      this.displayedColumns = ['No data'];
      this.dataSource = [];
      this.cdr.markForCheck();
      return;
    }

    // Reset cell selection when new data is loaded
    this.selectedOverflowCell = null;
    this.selectedColumn = null;
    this.selectedRow = null;

    // Get all columns from header but exclude __entity_url
    // This will include columns with null values after our processing strategy has run
    const headerColumns = Object.keys(this.resultData.header || {}).filter(col => col !== '__entity_url');
    
    // Sort columns to ensure consistent display order
    // First attempt to put ID fields at the beginning
    headerColumns.sort((a, b) => {
      // Put ID fields first
      const aIsId = a.toLowerCase().endsWith('id') || a.toLowerCase() === 'id';
      const bIsId = b.toLowerCase().endsWith('id') || b.toLowerCase() === 'id';
      
      if (aIsId && !bIsId) return -1;
      if (!aIsId && bIsId) return 1;
      
      // Then sort alphabetically
      return a.localeCompare(b);
    });
    
    // Add the __entity_url column to the end if it exists in the data
    const hasEntityUrl = this.resultData.rows?.length > 0 && 
                        this.resultData.rows[0].attributes.has('__entity_url');
    
    if (hasEntityUrl) {
      this.displayedColumns = ['No.', ...headerColumns, '__entity_url'];
    } else {
      this.displayedColumns = ['No.', ...headerColumns];
    }

    // Set the data source based on the toggle state
    this.refreshDataSource();
    
    // Force change detection immediately
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    // Force an update on the next tick to ensure Angular has processed the changes
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  private getEntityNode(): QueryNode {
    return this.nodeTreeService.getNodeTree().value.root.next;
  }

  selectRow(row: any) {
    this.selectedRow = row;
  }

  selectCell(element: Object, event: MouseEvent) {
    const cell = event.target as HTMLElement;
    const td = cell.closest('td');
    
    if (!td) return;
    
    // Get the column index
    const columnIndex = Array.from(td.parentElement?.children || []).indexOf(td);
    if (columnIndex < 0) return;
    
    // Get the column name
    const columnName = this.displayedColumns[columnIndex];
    
    // If clicking on the same cell as previously selected, toggle it off
    if (this.selectedOverflowCell === element && this.selectedColumn === columnName) {
      this.selectedOverflowCell = null;
      this.selectedColumn = null;
    } else {
      // Otherwise, select this cell
      this.selectedOverflowCell = element;
      this.selectedColumn = columnName;
    }
    
    // Force Angular to detect changes
    this.cdr.detectChanges();
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

    // Check for lookup fields by name pattern (_*_value)
    if (columnName.includes('_value') || (fieldInfo.type && fieldInfo.type.toLowerCase() === 'lookup')) {
      return 'lookup';
    }

    // Check if this column contains GUIDs in raw data
    if (this.hasGuidValues(columnName)) {
      return 'uniqueidentifier';
    }

    // Convert field types from the header to our internal types
    switch (fieldInfo.type?.toLowerCase()) {
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
      case 'dynamicslink':
        return 'dynamicslink';
      default:
        return 'string';
    }
  }

  // Helper method to check if a column contains GUID values
  private hasGuidValues(columnName: string): boolean {
    if (!this.resultData || !this.resultData.rows || this.resultData.rows.length === 0) {
      return false;
    }
    
    // Regular expression for GUID validation
    const guidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Check the first few rows to see if they contain GUID values
    const sampleSize = Math.min(5, this.resultData.rows.length);
    let guidCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const row = this.resultData.rows[i];
      if (row && row.attributes.has(columnName)) {
        const cellData = row.attributes.get(columnName);
        if (cellData && typeof cellData.attributeRawValue === 'string' && 
            guidRegEx.test(cellData.attributeRawValue)) {
          guidCount++;
        }
      }
    }
    
    // If more than half of the sampled rows contain GUIDs, consider it a GUID column
    return guidCount > sampleSize / 2;
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
      case 'dynamicslink':
        return 'link-cell';
      default:
        return 'text-cell'; // Default styling
    }
  }

  getColumnDisplayName(columnName: string): string {
    if (columnName === 'No.') return 'No.';

    // Always show "View in Dynamics" for the entity URL column in both views
    if (columnName === '__entity_url') return 'View in Dynamics';

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

  formatCellValue(row: any, columnName: string): string {
    if (!this.resultData || !row || columnName === 'No.') {
      return row ? row[columnName]?.toString() || '' : '';
    }

    // For attributes in the new format
    if (row.attributes && row.attributes.has(columnName)) {
      const cellData = row.attributes.get(columnName);
      
      // Handle null or undefined values
      if (!cellData || cellData.attributeRawValue === null || cellData.attributeRawValue === undefined) {
        return '';
      }
      
      // Handle link display
      if (cellData.link) {
        return '🔗 ' + (cellData.attributeFormattedValue || cellData.attributeRawValue);
      }
      
      // Return formatted or raw value based on toggle
      return this.showFormattedValues && cellData.attributeFormattedValue ? 
        cellData.attributeFormattedValue : cellData.attributeRawValue.toString();
    }
    
    // Fallback for direct access
    return row[columnName]?.toString() || '';
  }

  hasFormattedValue(row: any, columnName: string): boolean {
    if (!this.resultData || columnName === 'No.' || !row.attributes) {
      return false;
    }
    
    if (row.attributes.has(columnName)) {
      const cellData = row.attributes.get(columnName);
      return !!(cellData && cellData.attributeFormattedValue && 
                cellData.attributeFormattedValue !== cellData.attributeRawValue);
    }
    
    return false;
  }

  toggleValueFormat() {
    // Store the currently selected row before toggling
    const currentSelectedRow = this.selectedRow ? { ...this.selectedRow } : null;

    this.showFormattedValues = !this.showFormattedValues;

    // Reset cell selection when toggling format
    this.selectedOverflowCell = null;
    this.selectedColumn = null;

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
    if (!this.resultData || !this.resultData.rows) {
      console.log('No result data or rows available');
      this.dataSource = [];
      this.paginatedData = [];
      this.totalRows = 0;
      this.cdr.markForCheck();
      return;
    }

    console.log('RefreshDataSource called with:', {
      rowCount: this.resultData.rows.length,
      headerCount: Object.keys(this.resultData.header || {}).length,
      sampleRowData: this.resultData.rows.length > 0 ? this.resultData.rows[0] : null
    });

    try {
      // Check if rows have the expected structure
      if (this.resultData.rows.length > 0) {
        const firstRow = this.resultData.rows[0];
        console.log('First row structure:', {
          hasAttributesMap: !!firstRow.attributes && firstRow.attributes instanceof Map,
          rowDataKeys: Object.keys(firstRow),
          attributesSize: firstRow.attributes instanceof Map ? firstRow.attributes.size : 'not a Map'
        });
      }

      // Convert RowData to data source format
      this.dataSource = this.resultData.rows.map((rowData, index) => {
        // Create object with row number
        const newItem: any = { 'No.': index + 1 };
        
        // Add reference to original row data
        newItem['__rowData'] = rowData;
        
        // Add all header columns
        for (const columnName of Object.keys(this.resultData.header)) {
          // Check if attributes is a Map and has the column
          if (rowData.attributes && rowData.attributes instanceof Map && rowData.attributes.has(columnName)) {
            newItem[columnName] = rowData.attributes.get(columnName);
          } else if (rowData.attributes && !(rowData.attributes instanceof Map) && rowData.attributes[columnName]) {
            // If attributes is not a Map but an object, handle it differently
            newItem[columnName] = {
              attributeLogicalName: columnName,
              attributeRawValue: rowData.attributes[columnName]
            };
          } else {
            // Create empty cell for missing columns
            newItem[columnName] = {
              attributeLogicalName: columnName,
              attributeRawValue: '',
            };
          }
        }
        
        // Add dataverse link if available
        if (rowData.dataverseRowLink) {
          newItem['__entity_url'] = {
            url: rowData.dataverseRowLink,
            text: '🔗',
            isRawView: !this.showFormattedValues
          };
        }
        
        // For debugging, log the first item
        if (index === 0) {
          console.log('First data source item:', newItem);
        }
        
        return newItem;
      });
      
      // Update total rows
      this.totalRows = this.dataSource.length;
      console.log(`Data source created with ${this.totalRows} rows`);
      
      // Reset to first page when data source changes
      this.pageIndex = 0;
      
      // Update paginated view
      this.updatePaginatedData();
      
    } catch (error) {
      console.error('Error refreshing data source:', error);
      this.dataSource = [];
      this.paginatedData = [];
      this.totalRows = 0;
      this.cdr.markForCheck();
    }
  }

  // Handle page events from the paginator
  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    
    // Reset cell selection on page change
    this.selectedOverflowCell = null;
    this.selectedColumn = null;
    
    this.updatePaginatedData();
    this.cdr.detectChanges();
  }
  
  // Update the paginated data based on the current page and page size
  private updatePaginatedData() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    this.paginatedData = this.dataSource.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  executeWithData(xml: string, entityNode: any) {
    // Reset error state
    this.hasError = false;
    this.errorMessage = '';
    
    // Set loading state
    this.isLoading = true;
    this.cdr.markForCheck();
    
    console.log('Executing query with provided data');
    
    // Execute the query directly with the provided data
    this.xmlExecutor.executeXmlRequest(xml, entityNode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        result => {
          console.log('Result table direct execution completed successfully with provided data');
          
          // Store the result in our local BehaviorSubject for components to use
          this.mostRecentResult.next(result);
          
          // For immediate feedback, process the result directly
          if (result && result.rows && result.rows.length > 0) {
            this.resultData = result;
            this.processResultData();
          }
        },
        error => {
          // Error will be handled by our isLoadingState$ subscription
          console.error('Error in direct execution with provided data:', error);
        }
      );
  }
}