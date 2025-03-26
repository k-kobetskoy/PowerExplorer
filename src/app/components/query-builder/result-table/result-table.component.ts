import { Component, EventEmitter, OnInit, Output, OnDestroy, ViewEncapsulation, ChangeDetectionStrategy, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { catchError, of, Subscription, takeUntil, tap, Subject } from 'rxjs';
import { XmlExecutorService } from '../services/xml-executor.service';
import { NodeTreeService } from '../services/node-tree.service';
import { QueryNode } from '../models/query-node';
import { EnvironmentEntityService } from '../services/entity-services/environment-entity.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
interface ResultData {
  header: { [key: string]: { displayName: string, logicalName: string, type: string } };
  rawValues: any[];
  formatedValues: any[];
  linkValues?: any[];
}

@Component({
    selector: 'app-result-table',
    templateUrl: './result-table.component.html',
    styleUrls: ['./result-table.component.css'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatSlideToggleModule,
        MatIconModule,
        MatTableModule
    ],
    schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],   
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

  // Track current environment URL
  private currentEnvironmentUrl: string = '';
  private environmentSubscription: Subscription;

  // Add destroy$ Subject
  private destroy$ = new Subject<void>();

  constructor(
    private xmlExecutor: XmlExecutorService,
    private nodeTreeService: NodeTreeService,
    private environmentService: EnvironmentEntityService
  ) { }
  @Output() resultTableGetResult = new EventEmitter<void>();

  ngOnInit() {
    // Subscribe to XML changes but don't execute requests automatically
    this.xmlSubscription = this.nodeTreeService.xmlRequest$.subscribe(xml => {
      this.latestXml = xml;
    });

    // Subscribe to environment changes
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
        }
      });
  }

  ngOnDestroy() {
    if (this.xmlSubscription) {
      this.xmlSubscription.unsubscribe();
    }
    if (this.environmentSubscription) {
      this.environmentSubscription.unsubscribe();
    }
    // Complete the destroy$ Subject
    this.destroy$.next();
    this.destroy$.complete();
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
    if (!xml) {
      console.error('No XML available');
      this.displayedColumns = ['No query available'];
      this.dataSource = [];
      return;
    }

    this.xmlExecutor.executeXmlRequest(xml, entityNode)
      .pipe(
        catchError(error => {
          console.error('Error in query execution:', error);
          return of({ header: {}, rawValues: [], formatedValues: [] } as ResultData);
        }), takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: ResultData) => {
          this.resultData = data;

          if (!data || !data['rawValues'] || data['rawValues'].length === 0) {
            this.displayedColumns = ['No results'];
            this.dataSource = [];
            return;
          }

          // Get columns from header but exclude __entity_url
          this.displayedColumns = ['No.', ...Object.keys(data.header).filter(col => col !== '__entity_url')];

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

  selectCell(element: Object, event: MouseEvent) {
    const cell = event.target as HTMLElement;
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
      case 'dynamicslink':
        return 'dynamicslink';
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

  formatCellValue(value: any): string {
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

    return value.toString();
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

    console.log('Full result data structure:', {
      headerKeys: Object.keys(this.resultData.header || {}),
      rawValuesCount: this.resultData['rawValues']?.length || 0,
      formattedValuesCount: this.resultData['formatedValues']?.length || 0
    });

    // Example of first raw record if available
    if (this.resultData['rawValues']?.length > 0) {
      console.log('First raw record structure:', {
        keys: Object.keys(this.resultData['rawValues'][0]),
        sample: this.resultData['rawValues'][0]
      });

      // Check if cr1fc_orderid exists in the first record
      const firstRaw = this.resultData['rawValues'][0];
      if (firstRaw['cr1fc_orderid']) {
        console.log('Found cr1fc_orderid in first raw record:', firstRaw['cr1fc_orderid']);
      } else {
        console.log('cr1fc_orderid not found in first raw record');
      }
    }

    // Choose the data source based on the toggle state
    let sourceData;

    if (this.showFormattedValues) {
      sourceData = this.resultData['formatedValues'];
    } else {
      sourceData = this.resultData['rawValues'];
    }

    if (!sourceData || sourceData.length === 0) {
      this.dataSource = [];
      return;
    }

    console.log('Raw data being processed to add URLs:', sourceData.slice(0, 1));

    // Store raw data for reference in both views
    const rawData = this.resultData['rawValues'];

    // Initialize linkValues if not already present
    if (!this.resultData.linkValues) {
      this.resultData.linkValues = [];
    }

    // Add row numbers and ensure entity URLs for all rows
    this.dataSource = sourceData.map((item, index) => {
      // Create a working copy with row number
      const newItem = { 'No.': index + 1, ...item };

      // Store reference to raw data for ID lookup
      if (rawData && rawData[index]) {
        // Store full raw record reference
        newItem['__raw_data'] = rawData[index];

        // Debugging for first record
        if (index === 0) {
          console.log('Raw data for first record:', {
            keys: Object.keys(rawData[index]),
            hasOrderId: !!rawData[index]['cr1fc_orderid']
          });
        }
      }

      // Determine entity type first - needed for both real and generated IDs
      const entityName = this.getEntityType(newItem);

      // FIRST ATTEMPT: Try to get the actual entity ID from the data returned by Dataverse
      const entityId = this.findEntityId(newItem);

      // If we found a real ID, use it for URL generation
      if (entityId) {
        console.log(`Row ${index + 1}: Using real entity ID: ${entityId}`);

        // Create the URL based on environment or fallback
        let url;
        if (this.currentEnvironmentUrl) {
          // Use current environment URL
          url = `${this.currentEnvironmentUrl}main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${entityId}`;
        } else {
          // Fallback to a sample URL when no environment is available
          url = `https://org2d6763a7.crm4.dynamics.com/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${entityId}`;
        }

        console.log(`Row ${index + 1}: Generated URL: ${url}`);

        // Create link info
        const linkInfo = {
          id: entityId,
          url: url,
          text: '🔗',
          entityName: entityName,
          isRealId: true
        };

        // Store in linkValues array
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
      }
      // If no real ID was found, try to use a related ID as a fallback
      else {
        console.log(`Row ${index + 1}: No primary entity ID found, using fallback ID generation`);

        // Generate a fallback ID based on the data
        const fallbackId = this.generateConsistentId(newItem, index);

        // Create a URL using the fallback ID
        const url = this.currentEnvironmentUrl
          ? `${this.currentEnvironmentUrl}main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${fallbackId}`
          : `https://org2d6763a7.crm4.dynamics.com/main.aspx?forceUCI=1&pagetype=entityrecord&etn=${entityName}&id=${fallbackId}`;

        console.log(`Row ${index + 1}: Generated fallback URL: ${url}`);

        // Create link info
        const linkInfo = {
          id: fallbackId,
          url: url,
          text: '🔗',
          entityName: entityName,
          isFallbackId: true
        };

        // Store in linkValues array
        if (this.resultData.linkValues.length <= index) {
          this.resultData.linkValues.push(linkInfo);
        } else {
          this.resultData.linkValues[index] = linkInfo;
        }

        // Add the entity URL with fallback ID to the item
        newItem['__entity_url'] = {
          ...linkInfo,
          isRawView: !this.showFormattedValues
        };
      }

      return newItem;
    });

    // Log the first few rows of processed data for debugging
    console.log('First few rows with entity URLs:', this.dataSource.slice(0, 1));
  }

  // Try to determine entity type from data
  private getEntityType(item: any): string | null {
    // First try to get entity info from the node tree service
    try {
      const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap();

      if (entityAttributeMap) {
        // Find the primary entity from the map
        for (const [entityName, entityData] of Object.entries(entityAttributeMap)) {
          if (entityData.isPrimaryEntity) {
            console.log(`Using primary entity from node tree: ${entityName}`);
            return entityName;
          }
        }
      }
    } catch (error) {
      console.error('Error getting entity type from node tree:', error);
    }

    // Fallback to detection based on field presence
    if (item['cr1fc_cost'] !== undefined || item['Cost'] !== undefined) {
      return 'cr1fc_order';
    } else if (item['currencytype'] !== undefined || item['Currency Type'] !== undefined) {
      return 'transactioncurrency';
    } else if (item['createdby'] !== undefined || item['Created By'] !== undefined) {
      return 'account';
    }

    // Last resort fallback
    return 'cr1fc_order';
  }

  // Find an entity ID in the record data - prioritize actual IDs from Dataverse
  private findEntityId(item: any): string | null {
    if (!item) return null;

    // Regular expression for GUID validation
    const guidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // DEBUG: Log the keys in the item to help troubleshoot
    const itemKeys = Object.keys(item);
    console.log('Available keys in item:', itemKeys);

    // PRIORITY 0: Direct check for cr1fc_orderid as seen in the sample data
    if (item['cr1fc_orderid'] && typeof item['cr1fc_orderid'] === 'string' && guidRegEx.test(item['cr1fc_orderid'])) {
      console.log(`Found direct cr1fc_orderid field with value: ${item['cr1fc_orderid']}`);
      return item['cr1fc_orderid'];
    }

    // Also check raw data for cr1fc_orderid
    if (item['__raw_data'] && item['__raw_data']['cr1fc_orderid'] &&
        typeof item['__raw_data']['cr1fc_orderid'] === 'string' &&
        guidRegEx.test(item['__raw_data']['cr1fc_orderid'])) {
      console.log(`Found cr1fc_orderid in __raw_data: ${item['__raw_data']['cr1fc_orderid']}`);
      return item['__raw_data']['cr1fc_orderid'];
    }

    // Get entity type and primary ID field name from node tree if possible
    const entityType = this.getEntityType(item);
    let primaryIdField = null;

    if (entityType) {
      try {
        const entityAttributeMap = this.nodeTreeService.getEntityAttributeMap();
        if (entityAttributeMap && entityAttributeMap[entityType]) {
          primaryIdField = entityAttributeMap[entityType].primaryIdAttribute || `${entityType}id`;
          console.log(`Primary ID field for ${entityType}: ${primaryIdField}`);
        } else {
          primaryIdField = `${entityType}id`;
          console.log(`Using default ID field format: ${primaryIdField}`);
        }
      } catch (error) {
        console.error('Error getting primary ID field:', error);
        primaryIdField = `${entityType}id`;
      }
    }

    // HIGHEST PRIORITY: Check for the primary ID field from the entity type
    if (primaryIdField && item[primaryIdField] && typeof item[primaryIdField] === 'string' &&
        guidRegEx.test(item[primaryIdField])) {
      console.log(`Found primary ID field ${primaryIdField} with value ${item[primaryIdField]}`);
      return item[primaryIdField];
    }

    // SECOND PRIORITY: Check for common ID patterns with the entity name
    if (entityType) {
      // Common patterns:
      // 1. entitynameid (e.g., accountid)
      const standardIdField = `${entityType}id`;
      if (item[standardIdField] && typeof item[standardIdField] === 'string' &&
          guidRegEx.test(item[standardIdField])) {
        console.log(`Found standard ID field ${standardIdField} with value ${item[standardIdField]}`);
        return item[standardIdField];
      }

      // 2. id (just 'id' field)
      if (item['id'] && typeof item['id'] === 'string' && guidRegEx.test(item['id'])) {
        console.log(`Found generic id field with value ${item['id']}`);
        return item['id'];
      }
    }

    // If we have raw data, perform more intensive inspection
    if (item['__raw_data']) {
      console.log('Inspecting __raw_data keys:', Object.keys(item['__raw_data']));

      // Special case: Look for cr1fc_orderid in raw data (from sample)
      if (item['__raw_data']['cr1fc_orderid'] &&
          typeof item['__raw_data']['cr1fc_orderid'] === 'string' &&
          guidRegEx.test(item['__raw_data']['cr1fc_orderid'])) {
        console.log(`Found cr1fc_orderid in __raw_data: ${item['__raw_data']['cr1fc_orderid']}`);
        return item['__raw_data']['cr1fc_orderid'];
      }

      // Look for primary ID field in raw data
      if (primaryIdField && item['__raw_data'][primaryIdField] &&
          typeof item['__raw_data'][primaryIdField] === 'string' &&
          guidRegEx.test(item['__raw_data'][primaryIdField])) {
        console.log(`Found primary ID ${primaryIdField} in __raw_data: ${item['__raw_data'][primaryIdField]}`);
        return item['__raw_data'][primaryIdField];
      }

      // Look for any field ending with 'id' in raw data
      const rawIdFields = Object.keys(item['__raw_data']).filter(key =>
        key.toLowerCase().endsWith('id') &&
        typeof item['__raw_data'][key] === 'string' &&
        guidRegEx.test(item['__raw_data'][key])
      );

      if (rawIdFields.length > 0) {
        rawIdFields.sort((a, b) => {
          // Exact match for entity ID gets highest priority
          if (a.toLowerCase() === `${entityType}id`) return -1;
          if (b.toLowerCase() === `${entityType}id`) return 1;

          // Regular ID fields get next priority
          if (a.toLowerCase() === 'id') return -1;
          if (b.toLowerCase() === 'id') return 1;

          // If both end with 'id', prefer shorter ones (more likely to be primary)
          return a.length - b.length;
        });

        console.log(`Found ID field in raw data: ${rawIdFields[0]} with value ${item['__raw_data'][rawIdFields[0]]}`);
        return item['__raw_data'][rawIdFields[0]];
      }
    }

    // FOURTH PRIORITY: look for any fields ending with "id" that contain GUIDs
    const idFields = Object.keys(item).filter(key =>
      key.toLowerCase().endsWith('id') &&
      typeof item[key] === 'string' &&
      guidRegEx.test(item[key])
    );

    if (idFields.length > 0) {
      // Sort to prioritize fields that are named exactly 'id' or end with 'id'
      idFields.sort((a, b) => {
        // Exact match for entity ID gets highest priority
        if (entityType) {
          if (a.toLowerCase() === `${entityType}id`) return -1;
          if (b.toLowerCase() === `${entityType}id`) return 1;
        }

        // Fields named exactly 'id' get next priority
        if (a.toLowerCase() === 'id') return -1;
        if (b.toLowerCase() === 'id') return 1;

        // Fields ending with 'id' get next priority
        const aEndsWithId = a.toLowerCase().endsWith('id');
        const bEndsWithId = b.toLowerCase().endsWith('id');

        if (aEndsWithId && !bEndsWithId) return -1;
        if (!aEndsWithId && bEndsWithId) return 1;

        // If both end with 'id', prefer shorter ones (more likely to be primary)
        return a.length - b.length;
      });

      console.log(`Found ID field ${idFields[0]} with value ${item[idFields[0]]}`);
      return item[idFields[0]];
    }

    // FIFTH PRIORITY: Look for common lookup reference patterns (_entityname_value)
    const lookupFields = Object.keys(item).filter(key =>
      key.startsWith('_') &&
      key.endsWith('_value') &&
      typeof item[key] === 'string' &&
      guidRegEx.test(item[key])
    );

    if (lookupFields.length > 0) {
      console.log(`Found lookup field ${lookupFields[0]} with value ${item[lookupFields[0]]}`);
      return item[lookupFields[0]];
    }

    // FINALLY: Look for any field containing a valid GUID
    for (const key of Object.keys(item)) {
      if (typeof item[key] === 'string' && guidRegEx.test(item[key])) {
        console.log(`Found GUID in field ${key} with value ${item[key]}`);
        return item[key];
      }
    }

    // Also check any fields in raw data
    if (item['__raw_data']) {
      for (const key of Object.keys(item['__raw_data'])) {
        if (typeof item['__raw_data'][key] === 'string' &&
            guidRegEx.test(item['__raw_data'][key])) {
          console.log(`Found GUID in raw data field ${key}: ${item['__raw_data'][key]}`);
          return item['__raw_data'][key];
        }
      }
    }

    console.log('No valid GUID found in item, will use generated ID');
    return null;
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

    const formattedValues = this.resultData['formatedValues'];
    if (!formattedValues || rowIndex >= formattedValues.length) return null;

    return formattedValues[rowIndex][columnName];
  }

  // Generate a consistent ID for a record when a real one can't be found
  private generateConsistentId(item: any, index: number): string {
    // Check raw response data for possible fallback IDs

    // Try to use transactioncurrencyid as a fallback
    if (item['_transactioncurrencyid_value'] &&
        typeof item['_transactioncurrencyid_value'] === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item['_transactioncurrencyid_value'])) {
      console.log(`Using _transactioncurrencyid_value as fallback ID: ${item['_transactioncurrencyid_value']}`);
      return item['_transactioncurrencyid_value'];
    }

    // Try to use ATTRIBUTE_ACCOUNT as a fallback
    if (item['ATTRIBUTE_ACCOUNT'] &&
        typeof item['ATTRIBUTE_ACCOUNT'] === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item['ATTRIBUTE_ACCOUNT'])) {
      console.log(`Using ATTRIBUTE_ACCOUNT as fallback ID: ${item['ATTRIBUTE_ACCOUNT']}`);
      return item['ATTRIBUTE_ACCOUNT'];
    }

    // If no valid ID was found in the data, create a last resort fallback
    // This should rarely be needed since the Dataverse response contains real IDs
    console.log(`No fallback ID found in data, creating a last resort ID for row ${index + 1}`);
    return `00000000-0000-0000-0000-${index.toString().padStart(12, '0')}`;
  }
}
