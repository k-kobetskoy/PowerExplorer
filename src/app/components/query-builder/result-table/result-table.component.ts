import { Component, EventEmitter, OnInit, Output, OnDestroy, ViewEncapsulation, ChangeDetectionStrategy, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { catchError, of, Subscription, takeUntil, tap, Subject, BehaviorSubject } from 'rxjs';
import { XmlExecutionResult, XmlExecutorService } from '../services/xml-executor.service';
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
  resultData: XmlExecutionResult | null = null;
  
  // Local BehaviorSubject to store the most recent result
  private mostRecentResult = new BehaviorSubject<XmlExecutionResult | null>(null);
  
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
        if (!this.isLoading && !this.hasError && result.rawValues?.length > 0) {
          this.resultData = result;
          this.processResultData();
          this.cdr.markForCheck();
        } else if (this.hasError) {
          // Show error in table
          this.displayedColumns = ['Error'];
          this.dataSource = [{ 'Error': this.errorMessage || 'An error occurred' }];
          this.cdr.markForCheck();
        } else if (!this.isLoading && (!result.rawValues || result.rawValues.length === 0)) {
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
            if (currentResult && currentResult.rawValues?.length > 0) {
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
          if (this.resultData && this.resultData.rawValues?.length > 0) {
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
    if (this.resultData && this.resultData.rawValues && this.resultData.rawValues.length > 0) {
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
              if (result && result.rawValues && result.rawValues.length > 0) {
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
    if (this.resultData.rawValues?.length > 0 && this.resultData.rawValues[0]['__entity_url']) {
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
    if (!this.resultData || !this.resultData.rawValues || this.resultData.rawValues.length === 0) {
      return false;
    }
    
    // Regular expression for GUID validation
    const guidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Check the first few rows to see if they contain GUID values
    const sampleSize = Math.min(5, this.resultData.rawValues.length);
    let guidCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const row = this.resultData.rawValues[i];
      if (row && row[columnName] && 
          typeof row[columnName] === 'string' && 
          guidRegEx.test(row[columnName])) {
        guidCount++;
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

  formatCellValue(value: any, columnName?: string): string {
    // Handle null or undefined values consistently
    if (value === null || value === undefined) {
      return '';
    }

    // Handle DynamicsLink objects - but only show a simplified version in the cell
    if (value && typeof value === 'object') {
      if (value.url && value.id) {
        // Display the text property for links with URLs
        return value.text || '🔗';
      } else if (value.isPlaceholder) {
        // Show warning icon for placeholders
        return '⚠️';
      } else if (value.text) {
        // Return just the text for other objects with text property
        return value.text;
      }
    }

    // For lookup fields, display differently based on view mode
    if (columnName && this.getFieldType(columnName) === 'lookup') {
      // If the value is not a GUID, use it directly
      if (typeof value === 'string' && 
          !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return value;
      }
      
      // For raw view or if the value is a GUID
      if (typeof value === 'string' && 
          value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // In raw view, always show the full GUID
        if (!this.showFormattedValues) {
          return value;
        }
        
        // In formatted view, check if we have a formatted value in our result data
        const formattedValue = this.tryGetFormattedValue(value, columnName);
        if (formattedValue) {
          return formattedValue;
        }
        
        // If no formatted value is found, just show the GUID rather than empty string
        // This ensures values are visible even if formatting failed
        return value;
      }
      
      // Default case
      return value.toString();
    }
    
    // For uniqueidentifier fields, ensure we return the raw value
    // This ensures the GUID gets the proper styling
    if (columnName && this.getFieldType(columnName) === 'uniqueidentifier') {
      // Always return the raw GUID for uniqueidentifier fields
      if (typeof value === 'string' && 
          value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return value;
      }
    }

    return value.toString();
  }

  // Helper method to find formatted value for a lookup field
  private tryGetFormattedValue(guidValue: string, columnName: string): string | null {
    if (!this.resultData || !this.resultData.formattedValues) return null;
    
    // First try to get the value directly from the formatted values array
    // by finding the row index that contains this exact GUID
    for (let i = 0; i < this.resultData.rawValues.length; i++) {
      const row = this.resultData.rawValues[i];
      if (!row) continue;
      
      // Check if this row has our GUID value
      if (row[columnName] === guidValue) {
        // Get the formatted value for this column in this row
        if (i < this.resultData.formattedValues.length) {
          const formattedRow = this.resultData.formattedValues[i];
          if (formattedRow && formattedRow[columnName] !== guidValue) {
            // Only return if it's not another GUID and not the placeholder ID: format
            const formattedValue = formattedRow[columnName];
            if (formattedValue && typeof formattedValue === 'string') {
              // Skip ID: prefix values
              if (formattedValue.startsWith('ID:')) {
                continue;
              }
              
              // Skip if it's just another GUID
              if (formattedValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                continue;
              }
              
              return formattedValue;
            }
          }
        }
      }
    }
    
    // If we couldn't find it directly, try to find the row that contains this GUID in any column
    const rowIndex = this.getRowIndexFromValue(guidValue);
    if (rowIndex !== -1) {
      const formattedValue = this.getFormattedValueByIndex(rowIndex, columnName);
      if (formattedValue && formattedValue !== guidValue && typeof formattedValue === 'string') {
        // Skip ID: prefix values
        if (formattedValue.startsWith('ID:')) {
          return null;
        }
        
        // Skip if it's just another GUID
        if (formattedValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return null;
        }
        
        return formattedValue;
      }
    }
    
    return null;
  }

  // Helper to get row index from a GUID value
  private getRowIndexFromValue(guidValue: string): number {
    if (!this.resultData || !this.resultData.rawValues) return -1;
    
    // First try to find the row that contains this exact GUID
    for (let i = 0; i < this.resultData.rawValues.length; i++) {
      const row = this.resultData.rawValues[i];
      if (!row) continue;
      
      for (const key of Object.keys(row)) {
        if (row[key] === guidValue) {
          return i;
        }
      }
    }
    
    return -1;
  }
  
  // Helper to get formatted value by index
  private getFormattedValueByIndex(rowIndex: number, columnName: string): any {
    if (!this.resultData || !this.resultData.formattedValues || 
        rowIndex < 0 || rowIndex >= this.resultData.formattedValues.length) {
      return null;
    }
    
    return this.resultData.formattedValues[rowIndex][columnName];
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
    if (!this.resultData) {
      return;
    }

    // Choose the data source based on the toggle state
    let sourceData;

    if (this.showFormattedValues) {
      sourceData = this.resultData.formattedValues;
    } else {
      sourceData = this.resultData.rawValues;
    }

    if (!sourceData || sourceData.length === 0) {
      this.dataSource = [];
      this.paginatedData = [];
      this.totalRows = 0;
      this.cdr.markForCheck();
      return;
    }

    // Store raw data for reference in both views
    const rawData = this.resultData.rawValues;

    // Initialize linkValues if not already present
    if (!this.resultData.linkValues) {
      this.resultData.linkValues = [];
    }

    try {
      // Add row numbers and ensure entity URLs for all rows
      this.dataSource = sourceData.map((item, index) => {
        // Create a working copy with row number
        const newItem = { 'No.': index + 1, ...item };
        
        // Store reference to raw data for ID lookup
        if (rawData && rawData[index]) {
          // Store full raw record reference
          newItem['__raw_data'] = rawData[index];
        }

        // Check if we already have entity URL information in the result data
        const existingLinkInfo = this.resultData.linkValues && this.resultData.linkValues[index];
        if (existingLinkInfo) {
          // Use existing link info without making any calls
          newItem['__entity_url'] = {
            ...existingLinkInfo,
            isRawView: !this.showFormattedValues
          };
          return newItem;
        }

        // Only try to determine entity type if we don't have existing link info
        // Use a simpler fallback approach without making service calls
        const entityName = this.getSimpleEntityType(item);

        // Look for entity ID only in the current item data without service calls
        const entityId = this.findSimpleEntityId(item);

        // If we found a real ID, use it for URL generation
        if (entityId) {
          // Create the URL based on environment or fallback
          let url;
          if (this.currentEnvironmentUrl) {
            // Use current environment URL
            url = `${this.currentEnvironmentUrl}main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${entityId}`;
          } else {
            // Fallback to a sample URL when no environment is available
            url = `https://org2d6763a7.crm4.dynamics.com/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${entityId}`;
          }

          // Create link info
          const linkInfo = {
            id: entityId,
            url: url,
            text: '🔗',
            entityName: entityName,
            isRealId: true
          };

          // Store in linkValues array
          if (!this.resultData.linkValues) this.resultData.linkValues = [];
          if (this.resultData.linkValues.length <= index) {
            this.resultData.linkValues.push(linkInfo);
          } else {
            this.resultData.linkValues[index] = linkInfo;
          }

          // Add the entity URL to the item
          newItem['__entity_url'] = {
            ...linkInfo,
            isRawView: !this.showFormattedValues
          };
        } else {
          // Use simple ID generation without service calls
          const fallbackId = `00000000-0000-0000-0000-${index.toString().padStart(12, '0')}`;
          newItem['__entity_url'] = {
            id: fallbackId,
            url: fallbackId,
            text: '🔗',
            entityName: 'entity',
            isRealId: false
          };
        }

        return newItem;
      });
      
      // Update total rows
      this.totalRows = this.dataSource.length;
      
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

  // Check if a field has different formatted and raw values
  hasFormattedValue(row: any, columnName: string): boolean {
    if (!this.resultData || columnName === 'No.') return false;

    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0) return false;

    // Get raw and formatted values
    const rawValue = this.getRawValue(row, columnName);
    const formattedValue = this.getFormattedValue(row, columnName);

    return rawValue !== formattedValue && formattedValue !== null;
  }

  // Get the raw value for a field
  getRawValue(row: any, columnName: string): any {
    if (!this.resultData || columnName === 'No.' || !this.resultData['rawValues']) return null;

    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0 || rowIndex >= this.resultData['rawValues'].length) return null;

    return this.resultData['rawValues'][rowIndex][columnName];
  }

  // Get the formatted value for a field
  getFormattedValue(row: any, columnName: string): any {
    if (!this.resultData || columnName === 'No.') return null;

    const rowIndex = row['No.'] - 1;
    if (rowIndex < 0) return null;

    const formattedValues = this.resultData['formattedValues'];
    if (!formattedValues || rowIndex >= formattedValues.length) return null;

    return formattedValues[rowIndex][columnName];
  }
  
  // Simple entity type detection that doesn't use service calls
  private getSimpleEntityType(item: any): string {
    // Try to determine the entity name from the query node
    try {
      const entityNode = this.getEntityNode();
      if (entityNode && entityNode.entitySetName$ && entityNode.entitySetName$.value) {
        return entityNode.entitySetName$.value;
      }
    } catch (error) {
      console.error('Error getting entity type from node:', error);
    }

    // Look for typical ID field patterns to guess entity name
    for (const key of Object.keys(item)) {
      // Common pattern: entityname + id (e.g. accountid, contactid)
      if (key.toLowerCase().endsWith('id') && !key.includes('_')) {
        const entityName = key.substring(0, key.length - 2);
        if (entityName.length > 0) {
          return entityName;
        }
      }
    }

    // Look for custom entity prefixes (like cr1fc_)
    const customEntityPrefix = this.detectCustomEntityPrefix(item);
    if (customEntityPrefix) {
      return customEntityPrefix;
    }

    // Fallback to a generic entity type
    return 'entity';
  }

  // Detect common custom entity prefixes
  private detectCustomEntityPrefix(item: any): string | null {
    // Look for field name patterns like prefix_fieldname
    const prefixPattern = /^([a-z0-9]+_)([a-z0-9_]+)$/i;
    
    let mostCommonPrefix = null;
    const prefixCounts = new Map<string, number>();
    
    for (const key of Object.keys(item)) {
      const match = key.match(prefixPattern);
      if (match && match[1]) {
        const prefix = match[1].slice(0, -1); // Remove trailing underscore
        const count = (prefixCounts.get(prefix) || 0) + 1;
        prefixCounts.set(prefix, count);
      }
    }
    
    // Find the most common prefix
    let maxCount = 0;
    for (const [prefix, count] of prefixCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPrefix = prefix;
      }
    }
    
    // Only return if we have a somewhat confident match (at least 2 fields)
    return maxCount >= 2 ? mostCommonPrefix : null;
  }

  // Simplified ID finder that doesn't make service calls
  private findSimpleEntityId(item: any): string | null {
    if (!item) return null;

    // Regular expression for GUID validation
    const guidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Try to get entity name
    const entityType = this.getSimpleEntityType(item);
    
    // First, look for entityname + id pattern
    if (entityType && entityType !== 'entity') {
      const idField = `${entityType}id`;
      if (item[idField] && typeof item[idField] === 'string' && guidRegEx.test(item[idField])) {
        return item[idField];
      }
    }

    // Look for any field ending with 'id' that contains a valid GUID
    for (const key of Object.keys(item)) {
      if (key.toLowerCase().endsWith('id') && typeof item[key] === 'string' && guidRegEx.test(item[key])) {
        return item[key];
      }
    }

    // Check raw data as a fallback
    if (item['__raw_data']) {
      // First check entity-specific ID
      if (entityType && entityType !== 'entity') {
        const idField = `${entityType}id`;
        if (item['__raw_data'][idField] && 
            typeof item['__raw_data'][idField] === 'string' && 
            guidRegEx.test(item['__raw_data'][idField])) {
          return item['__raw_data'][idField];
        }
      }
      
      // Then check any id field
      for (const key of Object.keys(item['__raw_data'])) {
        if (key.toLowerCase().endsWith('id') && 
            typeof item['__raw_data'][key] === 'string' && 
            guidRegEx.test(item['__raw_data'][key])) {
          return item['__raw_data'][key];
        }
      }
    }

    // Last resort: look for any GUID in the data
    for (const key of Object.keys(item)) {
      if (typeof item[key] === 'string' && guidRegEx.test(item[key])) {
        return item[key];
      }
    }

    return null;
  }
}