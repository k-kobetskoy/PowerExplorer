import { TestBed } from '@angular/core/testing';
import { ResultProcessingFactoryService } from './result-processing-factory.service';
import { AllAttributesStrategy } from './all-attributes-strategy';
import { DefinedAttributesStrategy } from './defined-attributes-strategy';
import { ProcessingStrategyType, determineProcessingStrategy } from './result-processing-strategy';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
import { XmlExecutionResult } from '../xml-executor.service';
import { EntityAttributeMap } from '../entity-services/attribute-entity.service';

describe('Result Processing Strategies', () => {
  let factoryService: ResultProcessingFactoryService;
  let allAttributesStrategy: AllAttributesStrategy;
  let definedAttributesStrategy: DefinedAttributesStrategy;
  
  // Test data
  const sampleResponseData = {
    "cr1fc_orderid": "467a93bc-a111-ed11-b83d-000d3ab99dad",
    "cr1fc_name": "as;dflk'as",
    "cr1fc_description": "sldfjsdf",
    "cr1fc_cost": 4654,
    "cr1fc_cost_base": 4654,
    "statecode": 0,
    "statuscode": 1,
    "createdon": "2022-08-01T13:56:27Z",
    "modifiedon": "2022-08-01T13:56:27Z",
    "exchangerate": 1
  };
  
  const sampleFormattedData = {
    "cr1fc_orderid": "467a93bc-a111-ed11-b83d-000d3ab99dad",
    "cr1fc_name": "as;dflk'as",
    "cr1fc_description": "sldfjsdf",
    "cr1fc_cost": "Br4,654.00",
    "cr1fc_cost_base": "Br4,654.00",
    "statecode": "Active",
    "statuscode": "Active",
    "createdon": "8/1/2022 4:56 PM",
    "modifiedon": "8/1/2022 4:56 PM",
    "exchangerate": "1.0000000000"
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
  
  // Create the basic result data for tests
  const sampleResult: XmlExecutionResult = {
    header: {
      'cr1fc_orderid': { displayName: 'Order ID', logicalName: 'cr1fc_orderid', type: 'Uniqueidentifier' },
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
    rawValues: [sampleResponseData],
    formatedValues: [sampleFormattedData]
  };
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ResultProcessingFactoryService,
        AllAttributesStrategy,
        DefinedAttributesStrategy
      ]
    });
    
    factoryService = TestBed.inject(ResultProcessingFactoryService);
    allAttributesStrategy = TestBed.inject(AllAttributesStrategy);
    definedAttributesStrategy = TestBed.inject(DefinedAttributesStrategy);
  });
  
  describe('determineProcessingStrategy', () => {
    it('should return ALL_ATTRIBUTES when no attributes are defined', () => {
      const entityName = 'cr1fc_order';
      
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [], // Empty to trigger ALL_ATTRIBUTES strategy
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      const strategyType = determineProcessingStrategy(entityAttributeMap);
      expect(strategyType).toBe(ProcessingStrategyType.ALL_ATTRIBUTES);
    });
    
    it('should return DEFINED_ATTRIBUTES when attributes are defined', () => {
      const entityName = 'cr1fc_order';
      
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [
            { attributeLogicalName: 'cr1fc_name', alias: null },
            { attributeLogicalName: 'cr1fc_cost', alias: null }
          ],
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      const strategyType = determineProcessingStrategy(entityAttributeMap);
      expect(strategyType).toBe(ProcessingStrategyType.DEFINED_ATTRIBUTES);
    });
  });
  
  describe('ResultProcessingFactoryService', () => {
    it('should return the correct strategy based on entity attribute map', () => {
      // No attributes defined - should return AllAttributesStrategy
      const emptyEntityAttributeMap = {
        'cr1fc_order': {
          entityAlias: null,
          attributeData: [],
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      const strategy1 = factoryService.getStrategy(emptyEntityAttributeMap);
      expect(strategy1 instanceof AllAttributesStrategy).toBeTruthy();
      
      // Attributes defined - should return DefinedAttributesStrategy
      const populatedEntityAttributeMap = {
        'cr1fc_order': {
          entityAlias: null,
          attributeData: [{ attributeLogicalName: 'cr1fc_name', alias: null }],
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      const strategy2 = factoryService.getStrategy(populatedEntityAttributeMap);
      expect(strategy2 instanceof DefinedAttributesStrategy).toBeTruthy();
    });
  });
  
  describe('AllAttributesStrategy', () => {
    it('should add all available attributes from metadata', () => {
      const entityName = 'cr1fc_order';
      
      // Create entity attribute map for ALL_ATTRIBUTES strategy
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [], // Empty to trigger ALL_ATTRIBUTES strategy
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      // Create attribute maps with all available attributes
      const attributeMaps = {
        [entityName]: new Map<string, AttributeModel>()
      };
      
      // Populate attribute map with all attributes
      attributesArray.forEach(attr => {
        attributeMaps[entityName].set(attr.logicalName, attr);
      });
      
      // Process the result using the strategy
      const result = allAttributesStrategy.processResults(sampleResult, entityAttributeMap, attributeMaps);
      
      // Verify all attributes from the metadata are included
      attributesArray.forEach(attribute => {
        expect(Object.keys(result.header)).toContain(attribute.logicalName);
        expect(Object.keys(result.rawValues[0])).toContain(attribute.logicalName);
        expect(Object.keys(result.formatedValues[0])).toContain(attribute.logicalName);
      });
      
      // Verify attributes not in the original data have null values
      expect(result.rawValues[0]['cr1fc_boolean']).toBeNull();
      expect(result.rawValues[0]['cr1fc_picklist']).toBeNull();
      expect(result.formatedValues[0]['cr1fc_boolean']).toBeNull();
      expect(result.formatedValues[0]['cr1fc_picklist']).toBeNull();
      
      // Verify original data is preserved
      expect(result.rawValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.rawValues[0]['cr1fc_cost']).toBe(4654);
      expect(result.formatedValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.formatedValues[0]['cr1fc_cost']).toBe("Br4,654.00");
    });
  });
  
  describe('DefinedAttributesStrategy', () => {
    it('should only include attributes explicitly defined in the query', () => {
      const entityName = 'cr1fc_order';
      
      // Create entity attribute map for DEFINED_ATTRIBUTES strategy
      const entityAttributeMap = {
        [entityName]: {
          entityAlias: null,
          attributeData: [
            { attributeLogicalName: 'cr1fc_name', alias: null },
            { attributeLogicalName: 'cr1fc_cost', alias: null },
            { attributeLogicalName: 'cr1fc_boolean', alias: null } // This doesn't exist in the response
          ],
          isPrimaryEntity: true,
          primaryIdAttribute: 'cr1fc_orderid'
        }
      } as any as EntityAttributeMap;
      
      // Create attribute maps
      const attributeMaps = {
        [entityName]: new Map<string, AttributeModel>()
      };
      
      // Populate attribute map
      attributesArray.forEach(attr => {
        attributeMaps[entityName].set(attr.logicalName, attr);
      });
      
      // Create a simplified result with only some of the fields
      const simplifiedResult: XmlExecutionResult = {
        header: {
          'cr1fc_name': { displayName: 'Name', logicalName: 'cr1fc_name', type: 'String' },
          'cr1fc_cost': { displayName: 'Cost', logicalName: 'cr1fc_cost', type: 'Money' }
        },
        rawValues: [{
          'cr1fc_name': "as;dflk'as",
          'cr1fc_cost': 4654
        }],
        formatedValues: [{
          'cr1fc_name': "as;dflk'as",
          'cr1fc_cost': "Br4,654.00"
        }]
      };
      
      // Process the result using the strategy
      const result = definedAttributesStrategy.processResults(simplifiedResult, entityAttributeMap, attributeMaps);
      
      // Check that only the defined attributes are included (the 2 from the data plus the missing 1)
      expect(Object.keys(result.header).length).toBe(3);
      expect(Object.keys(result.header)).toContain('cr1fc_name');
      expect(Object.keys(result.header)).toContain('cr1fc_cost');
      expect(Object.keys(result.header)).toContain('cr1fc_boolean');
      
      // Make sure other attributes from the metadata aren't included
      expect(Object.keys(result.header)).not.toContain('cr1fc_description');
      expect(Object.keys(result.header)).not.toContain('statecode');
      
      // Verify the missing attribute has a null value
      expect(result.rawValues[0]['cr1fc_boolean']).toBeNull();
      expect(result.formatedValues[0]['cr1fc_boolean']).toBeNull();
      
      // Verify original values are preserved
      expect(result.rawValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.rawValues[0]['cr1fc_cost']).toBe(4654);
      expect(result.formatedValues[0]['cr1fc_name']).toBe("as;dflk'as");
      expect(result.formatedValues[0]['cr1fc_cost']).toBe("Br4,654.00");
    });
  });
}); 