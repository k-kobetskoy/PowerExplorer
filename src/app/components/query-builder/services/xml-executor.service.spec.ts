import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { XmlExecutorService, XmlExecutionResult } from './xml-executor.service';
import { AttributeEntityService, EntityAttributeMap } from './entity-services/attribute-entity.service';
import { NodeTreeService } from './node-tree.service';
import { ErrorDialogService } from 'src/app/services/error-dialog.service';
import { EnvironmentEntityService } from './entity-services/environment-entity.service';
import { XmlCacheService } from './xml-cache.service';
import { ResultProcessingFactoryService } from './result-table/result-processing-factory.service';
import { of } from 'rxjs';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { BehaviorSubject } from 'rxjs';
import { QueryNode } from '../models/query-node';

// Mock dependencies
class MockAttributeEntityService {
  getSpecificAttributes() { return of({}); }
}

class MockNodeTreeService {
  getEntityAttributeMap(): EntityAttributeMap { return {}; }
  xmlRequest$ = new BehaviorSubject<string>('');
  getNodeTree() { return new BehaviorSubject({ root: {} }); }
}

class MockErrorDialogService {
  showError() {}
  showHttpError() {}
}

class MockEnvironmentEntityService {
  getActiveEnvironment() { return of(null); }
}

class MockXmlCacheService {
  getMostRecentFetchXmlResult() { return new BehaviorSubject(null); }
  cacheFetchXmlResult() {}
  getCachedFetchXmlResult() { return of(null); }
  clearFetchXmlCache() {}
}

class MockQueryNode {
  entitySetName$ = new BehaviorSubject<string>('cr1fc_order');
}

// Define a custom EntityAttributeData interface for testing that includes isPrimaryEntity
interface TestEntityAttributeData {
  entityAlias: string | null;
  attributeData: Array<{ attributeLogicalName: string | null; alias: string | null }>;
  isPrimaryEntity?: boolean;
  primaryIdAttribute?: string | null;
}

// Define a custom EntityAttributeMap for testing
interface TestEntityAttributeMap {
  [entityLogicalName: string]: TestEntityAttributeData;
}

describe('XmlExecutorService', () => {
  let service: XmlExecutorService;
  let mockAttributeEntityService: MockAttributeEntityService;
  let mockNodeTreeService: MockNodeTreeService;
  let mockErrorDialogService: MockErrorDialogService;
  let mockEnvironmentEntityService: MockEnvironmentEntityService;
  let mockXmlCacheService: MockXmlCacheService;
  let resultProcessingFactory: ResultProcessingFactoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        XmlExecutorService,
        ResultProcessingFactoryService,
        { provide: AttributeEntityService, useClass: MockAttributeEntityService },
        { provide: NodeTreeService, useClass: MockNodeTreeService },
        { provide: ErrorDialogService, useClass: MockErrorDialogService },
        { provide: EnvironmentEntityService, useClass: MockEnvironmentEntityService },
        { provide: XmlCacheService, useClass: MockXmlCacheService }
      ]
    });

    service = TestBed.inject(XmlExecutorService);
    mockAttributeEntityService = TestBed.inject(AttributeEntityService) as unknown as MockAttributeEntityService;
    mockNodeTreeService = TestBed.inject(NodeTreeService) as unknown as MockNodeTreeService;
    mockErrorDialogService = TestBed.inject(ErrorDialogService) as unknown as MockErrorDialogService;
    mockEnvironmentEntityService = TestBed.inject(EnvironmentEntityService) as unknown as MockEnvironmentEntityService;
    mockXmlCacheService = TestBed.inject(XmlCacheService) as unknown as MockXmlCacheService;
    resultProcessingFactory = TestBed.inject(ResultProcessingFactoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('normalizeDataWithTypes', () => {
    // Test data
    const sampleResponseData = {
      "@odata.etag": "W/\"2973530\"",
      "_owningbusinessunit_value@OData.Community.Display.V1.FormattedValue": "org2d6763a7",
      "_owningbusinessunit_value@Microsoft.Dynamics.CRM.associatednavigationproperty": "owningbusinessunit",
      "_owningbusinessunit_value@Microsoft.Dynamics.CRM.lookuplogicalname": "businessunit",
      "_owningbusinessunit_value": "d6c9b0cd-06d3-ec11-a7b5-0022489efdff",
      "_cr1fc_account_value@OData.Community.Display.V1.FormattedValue": "sfasf",
      "_cr1fc_account_value@Microsoft.Dynamics.CRM.associatednavigationproperty": "cr1fc_Account",
      "_cr1fc_account_value@Microsoft.Dynamics.CRM.lookuplogicalname": "account",
      "_cr1fc_account_value": "e3797a71-37e0-ec11-bb3c-000d3ab4ff20",
      "statecode@OData.Community.Display.V1.FormattedValue": "Active",
      "statecode": 0,
      "statuscode@OData.Community.Display.V1.FormattedValue": "Active",
      "statuscode": 1,
      "cr1fc_orderid": "467a93bc-a111-ed11-b83d-000d3ab99dad",
      "_transactioncurrencyid_value@OData.Community.Display.V1.FormattedValue": "Belarusian Ruble",
      "_transactioncurrencyid_value@Microsoft.Dynamics.CRM.associatednavigationproperty": "transactioncurrencyid",
      "_transactioncurrencyid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "transactioncurrency",
      "_transactioncurrencyid_value": "d434390e-2dd3-ec11-a7b5-0022489efdff",
      "cr1fc_cost@OData.Community.Display.V1.FormattedValue": "Br4,654.00",
      "cr1fc_cost": 4654,
      "_createdby_value@OData.Community.Display.V1.FormattedValue": "Kostiantyn Kobetskyi",
      "_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
      "_createdby_value": "bc10a9d3-06d3-ec11-a7b5-0022489efdff",
      "modifiedon@OData.Community.Display.V1.FormattedValue": "8/1/2022 4:56 PM",
      "modifiedon": "2022-08-01T13:56:27Z",
      "createdon@OData.Community.Display.V1.FormattedValue": "8/1/2022 4:56 PM",
      "createdon": "2022-08-01T13:56:27Z",
      "cr1fc_cost_base@OData.Community.Display.V1.FormattedValue": "Br4,654.00",
      "cr1fc_cost_base": 4654,
      "exchangerate@OData.Community.Display.V1.FormattedValue": "1.0000000000",
      "exchangerate": 1,
      "_ownerid_value@OData.Community.Display.V1.FormattedValue": "Kostiantyn Kobetskyi",
      "_ownerid_value@Microsoft.Dynamics.CRM.associatednavigationproperty": "ownerid",
      "_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
      "_ownerid_value": "bc10a9d3-06d3-ec11-a7b5-0022489efdff",
      "_modifiedby_value@OData.Community.Display.V1.FormattedValue": "Kostiantyn Kobetskyi",
      "_modifiedby_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
      "_modifiedby_value": "bc10a9d3-06d3-ec11-a7b5-0022489efdff",
      "_owninguser_value@Microsoft.Dynamics.CRM.lookuplogicalname": "systemuser",
      "_owninguser_value": "bc10a9d3-06d3-ec11-a7b5-0022489efdff",
      "cr1fc_name": "as;dflk'as",
      "cr1fc_description": "sldfjsdf"
    };

    const attributesArray: AttributeModel[] = [
      { logicalName: 'cr1fc_account', displayName: 'Account', attributeType: 'Lookup' },
      { logicalName: 'cr1fc_boolean', displayName: 'Boolean', attributeType: 'Boolean' },
      { logicalName: 'cr1fc_cost', displayName: 'Cost', attributeType: 'Money' },
      { logicalName: 'cr1fc_cost_base', displayName: 'Cost (Base)', attributeType: 'Money' },
      { logicalName: 'cr1fc_description', displayName: 'Description', attributeType: 'Memo' },
      { logicalName: 'cr1fc_name', displayName: 'Name', attributeType: 'String' },
      { logicalName: 'cr1fc_picklist', displayName: 'Picklist', attributeType: 'Picklist' },
      { logicalName: 'cr1fc_startworkflow', displayName: 'Start Workflow', attributeType: 'String' },
      { logicalName: 'createdby', displayName: 'Created By', attributeType: 'Lookup' },
      { logicalName: 'createdon', displayName: 'Created On', attributeType: 'DateTime' },
      { logicalName: 'createdonbehalfby', displayName: 'Created By (Delegate)', attributeType: 'Lookup' },
      { logicalName: 'exchangerate', displayName: 'Exchange Rate', attributeType: 'Decimal' },
      { logicalName: 'modifiedby', displayName: 'Modified By', attributeType: 'Lookup' },
      { logicalName: 'modifiedon', displayName: 'Modified On', attributeType: 'DateTime' },
      { logicalName: 'modifiedonbehalfby', displayName: 'Modified By (Delegate)', attributeType: 'Lookup' },
      { logicalName: 'new_category', displayName: 'Category', attributeType: 'Picklist' },
      { logicalName: 'ownerid', displayName: 'Owner', attributeType: 'Owner' },
      { logicalName: 'owningbusinessunit', displayName: 'Owning Business Unit', attributeType: 'Lookup' },
      { logicalName: 'statecode', displayName: 'State', attributeType: 'State' },
      { logicalName: 'statuscode', displayName: 'Status', attributeType: 'Status' },
      { logicalName: 'transactioncurrencyid', displayName: 'Currency', attributeType: 'Lookup' }
    ];

    it('should process results with all attributes when none are defined in the query', () => {
      // Setup test mocks
      const entityName = 'cr1fc_order';
      
      console.log('[TEST] Setting up ALL_ATTRIBUTES test case');
      
      // Create entity attribute map for ALL_ATTRIBUTES strategy
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [], // Empty to trigger ALL_ATTRIBUTES strategy
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      console.log('[TEST] Created entityAttributeMap with empty attributeData to trigger ALL_ATTRIBUTES strategy');
      
      // Create attribute maps
      const attributeMaps = {
        [entityName]: new Map<string, AttributeModel>()
      };
      
      // Populate attribute map
      attributesArray.forEach(attr => {
        attributeMaps[entityName].set(attr.logicalName, attr);
      });
      
      console.log(`[TEST] Populated attributeMaps with ${attributesArray.length} attributes`);
      
      // Create a basic result from normalizeData method (would normally be called internally)
      const basicResult: XmlExecutionResult = {
        header: {
          'cr1fc_orderid': { displayName: 'Order', logicalName: 'cr1fc_orderid', type: 'Uniqueidentifier' },
          'cr1fc_name': { displayName: 'Name', logicalName: 'cr1fc_name', type: 'String' },
          'cr1fc_description': { displayName: 'Description', logicalName: 'cr1fc_description', type: 'Memo' },
          'cr1fc_cost': { displayName: 'Cost', logicalName: 'cr1fc_cost', type: 'Money' },
          'cr1fc_cost_base': { displayName: 'Cost (Base)', logicalName: 'cr1fc_cost_base', type: 'Money' },
          'statecode': { displayName: 'State', logicalName: 'statecode', type: 'State' },
          'statuscode': { displayName: 'Status', logicalName: 'statuscode', type: 'Status' },
          'createdon': { displayName: 'Created On', logicalName: 'createdon', type: 'DateTime' },
          'modifiedon': { displayName: 'Modified On', logicalName: 'modifiedon', type: 'DateTime' },
          'exchangerate': { displayName: 'Exchange Rate', logicalName: 'exchangerate', type: 'Decimal' }
        },
        rawValues: [
          {
            'cr1fc_orderid': '467a93bc-a111-ed11-b83d-000d3ab99dad',
            'cr1fc_name': "as;dflk'as",
            'cr1fc_description': 'sldfjsdf',
            'cr1fc_cost': 4654,
            'cr1fc_cost_base': 4654,
            'statecode': 0,
            'statuscode': 1,
            'createdon': '2022-08-01T13:56:27Z',
            'modifiedon': '2022-08-01T13:56:27Z',
            'exchangerate': 1
          }
        ],
        formatedValues: [
          {
            'cr1fc_orderid': '467a93bc-a111-ed11-b83d-000d3ab99dad',
            'cr1fc_name': "as;dflk'as",
            'cr1fc_description': 'sldfjsdf',
            'cr1fc_cost': 'Br4,654.00',
            'cr1fc_cost_base': 'Br4,654.00',
            'statecode': 'Active',
            'statuscode': 'Active',
            'createdon': '8/1/2022 4:56 PM',
            'modifiedon': '8/1/2022 4:56 PM',
            'exchangerate': '1.0000000000'
          }
        ]
      };
      
      console.log('[TEST] Created basic mock result with header keys:', Object.keys(basicResult.header));
      console.log('[TEST] Raw values first row keys:', Object.keys(basicResult.rawValues[0]));
      console.log('[TEST] Formatted values first row keys:', Object.keys(basicResult.formatedValues[0]));
      
      // Spy on the private method and test it directly
      console.log('[TEST] Calling normalizeDataWithTypes directly...');
      // @ts-ignore - Accessing private method for testing
      const result = service['normalizeDataWithTypes']([sampleResponseData], attributeMaps, entityAttributeMap);
      console.log('[TEST] normalizeDataWithTypes completed');
      
      console.log('[TEST] Result header keys:', Object.keys(result.header));
      console.log('[TEST] Result raw values first row keys:', Object.keys(result.rawValues[0]));
      console.log('[TEST] Result formatted values first row keys:', Object.keys(result.formatedValues[0]));
      
      // Check that the result contains all known attributes, even those not present in the original response
      attributesArray.forEach(attribute => {
        const hasHeaderProp = Object.keys(result.header).includes(attribute.logicalName);
        const hasRawProp = Object.keys(result.rawValues[0]).includes(attribute.logicalName);
        const hasFormattedProp = Object.keys(result.formatedValues[0]).includes(attribute.logicalName);
        
        console.log(`[TEST] Checking attribute ${attribute.logicalName}: header=${hasHeaderProp}, raw=${hasRawProp}, formatted=${hasFormattedProp}`);
        
        expect(Object.keys(result.header)).toContain(attribute.logicalName);
        expect(Object.keys(result.rawValues[0])).toContain(attribute.logicalName);
        expect(Object.keys(result.formatedValues[0])).toContain(attribute.logicalName);
      });
      
      // Verify attributes not in response have null values
      console.log('[TEST] Verifying null values for attributes not in response');
      expect(result.rawValues[0]['cr1fc_boolean']).toBeNull();
      expect(result.rawValues[0]['cr1fc_picklist']).toBeNull();
      expect(result.rawValues[0]['cr1fc_startworkflow']).toBeNull();
      expect(result.rawValues[0]['createdonbehalfby']).toBeNull();
      expect(result.rawValues[0]['modifiedonbehalfby']).toBeNull();
      expect(result.rawValues[0]['new_category']).toBeNull();
      
      // Make sure original attributes are preserved correctly
      console.log('[TEST] Verifying original values are preserved');
      expect(result.rawValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.rawValues[0]['cr1fc_description']).toBe('sldfjsdf');
      expect(result.rawValues[0]['cr1fc_cost']).toBe(4654);
      expect(result.formatedValues[0]['cr1fc_cost']).toBe('Br4,654.00');
    });
    
    it('should only include explicitly defined attributes when attributes are defined in the query', () => {
      // Setup test mocks
      const entityName = 'cr1fc_order';
      
      console.log('[TEST] Setting up DEFINED_ATTRIBUTES test case');
      
      // Create entity attribute map for DEFINED_ATTRIBUTES strategy
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [
            { attributeLogicalName: 'cr1fc_name', alias: null },
            { attributeLogicalName: 'cr1fc_cost', alias: null },
            { attributeLogicalName: 'createdon', alias: null },
            { attributeLogicalName: 'cr1fc_boolean', alias: null } // This attribute doesn't exist in the response
          ],
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      console.log('[TEST] Created entityAttributeMap with defined attributes to trigger DEFINED_ATTRIBUTES strategy');
      console.log('[TEST] Defined attributes:', entityAttributeMap[entityName].attributeData.map(a => a.attributeLogicalName));
      
      // Create attribute maps
      const attributeMaps = {
        [entityName]: new Map<string, AttributeModel>()
      };
      
      // Populate attribute map
      attributesArray.forEach(attr => {
        attributeMaps[entityName].set(attr.logicalName, attr);
      });
      
      console.log(`[TEST] Populated attributeMaps with ${attributesArray.length} attributes`);
      
      // Create a basic result from normalizeData method (would normally be called internally)
      const basicResult: XmlExecutionResult = {
        header: {
          'cr1fc_name': { displayName: 'Name', logicalName: 'cr1fc_name', type: 'String' },
          'cr1fc_cost': { displayName: 'Cost', logicalName: 'cr1fc_cost', type: 'Money' },
          'createdon': { displayName: 'Created On', logicalName: 'createdon', type: 'DateTime' }
        },
        rawValues: [
          {
            'cr1fc_name': "as;dflk'as",
            'cr1fc_cost': 4654,
            'createdon': '2022-08-01T13:56:27Z'
          }
        ],
        formatedValues: [
          {
            'cr1fc_name': "as;dflk'as",
            'cr1fc_cost': 'Br4,654.00',
            'createdon': '8/1/2022 4:56 PM'
          }
        ]
      };
      
      console.log('[TEST] Created basic mock result with header keys:', Object.keys(basicResult.header));
      console.log('[TEST] Basic result missing the cr1fc_boolean attribute which should be added');
      
      // Spy on the private method and test it directly
      console.log('[TEST] Calling normalizeDataWithTypes directly...');
      // @ts-ignore - Accessing private method for testing
      const result = service['normalizeDataWithTypes']([sampleResponseData], attributeMaps, entityAttributeMap);
      console.log('[TEST] normalizeDataWithTypes completed');
      
      console.log('[TEST] Result header keys:', Object.keys(result.header));
      console.log('[TEST] Result raw values first row keys:', Object.keys(result.rawValues[0]));
      console.log('[TEST] Result formatted values first row keys:', Object.keys(result.formatedValues[0]));
      
      // Check that only the defined attributes are included, plus any missing attributes from the defined list
      const definedAttributes = ['cr1fc_name', 'cr1fc_cost', 'createdon', 'cr1fc_boolean'];
      definedAttributes.forEach(attr => {
        const hasAttribute = Object.keys(result.header).includes(attr);
        console.log(`[TEST] Checking defined attribute '${attr}': header=${hasAttribute}`);
        expect(Object.keys(result.header)).toContain(attr);
      });
      
      console.log('[TEST] Checking that cr1fc_boolean is added (was missing in the basic result)');
      expect(Object.keys(result.header)).toContain('cr1fc_boolean');
      
      // Make sure we don't include other attributes that weren't requested
      console.log('[TEST] Checking that non-defined attributes are NOT included');
      const nonDefinedAttr1 = 'statuscode';
      const nonDefinedAttr2 = 'cr1fc_description';
      console.log(`[TEST] Checking '${nonDefinedAttr1}' is not included: ${!Object.keys(result.header).includes(nonDefinedAttr1)}`);
      console.log(`[TEST] Checking '${nonDefinedAttr2}' is not included: ${!Object.keys(result.header).includes(nonDefinedAttr2)}`);
      expect(Object.keys(result.header)).not.toContain(nonDefinedAttr1);
      expect(Object.keys(result.header)).not.toContain(nonDefinedAttr2);
      
      // Verify the missing attribute has a null value
      console.log('[TEST] Verify the missing attribute (cr1fc_boolean) has a null value');
      console.log('[TEST] cr1fc_boolean raw value:', result.rawValues[0]['cr1fc_boolean']);
      console.log('[TEST] cr1fc_boolean formatted value:', result.formatedValues[0]['cr1fc_boolean']);
      expect(result.rawValues[0]['cr1fc_boolean']).toBeNull();
      expect(result.formatedValues[0]['cr1fc_boolean']).toBeNull();
      
      // Make sure original attributes are preserved correctly
      console.log('[TEST] Verifying original values are preserved');
      expect(result.rawValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.rawValues[0]['cr1fc_cost']).toBe(4654);
      expect(result.formatedValues[0]['cr1fc_cost']).toBe('Br4,654.00');
    });
  });
}); 