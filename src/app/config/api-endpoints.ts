import { AttributeType } from "../components/query-builder/models/constants/dataverse/attribute-types";

export const API_ENDPOINTS = {
    environments: {
        base: 'https://globaldisco.crm.dynamics.com/api/discovery/v2.0',
        instances: 'Instances',
        getResourceUrl() { return `${this.base}/${this.instances}`; }
    },
    entities: {
        entityParameters: ['LogicalName', 'DisplayName', 'EntitySetName'],
        getResourceUrl(apiUrl: string) { return `${apiUrl}/api/data/v9.2/EntityDefinitions?$select=${this.entityParameters.join(',')}`; }
    },
    attributes: {
        attributeParameters: ['LogicalName', 'DisplayName', 'AttributeType'],
        getResourceUrl(apiUrl: string, entityLogicalName: string) { 
            // Simple standard approach for all entities
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=${this.attributeParameters.join(',')}&$filter=(IsValidForForm eq true and AttributeType ne 'Virtual' and AttributeType ne 'EntityName')`; 
        }
    },
    picklist: {
        optionSetType: 'PicklistAttributeMetadata',
        getResourceUrl(apiUrl: string, entityLogicalName: string, attributeName: string, attributeType: string) {
            switch (attributeType) {
                case AttributeType.PICKLIST:
                    break;
                case AttributeType.STATE:
                    this.optionSetType = 'StateAttributeMetadata';
                    break;
                case AttributeType.STATUS:
                    this.optionSetType = 'StatusAttributeMetadata';
                    break;
            }
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.${this.optionSetType}/OptionSet?$select=Options`;
        }
    },
    boolean: {
        getResourceUrl(apiUrl: string, entityLogicalName: string, attributeName: string) {
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.BooleanAttributeMetadata/OptionSet?$select=TrueOption,FalseOption`;
        }
    },
    statecode: {
        getResourceUrl(apiUrl: string, entityLogicalName: string, attributeName: string) {
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.StateAttributeMetadata/OptionSet?$select=Options`;
        }
    },
    statuscode: {
        getResourceUrl(apiUrl: string, entityLogicalName: string, attributeName: string) {
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet?$select=Options`;
        }
    },
    link: {
        getResourceUrl(apiUrl: string, entityLogicalName: string) {
            return `${apiUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName&$expand=OneToManyRelationships,ManyToOneRelationships`;
        }
    },
    execute: {
        getResourceUrl(apiUrl: string, entitySetName: string, xml: string) {
            return `${apiUrl}/api/data/v9.2/${entitySetName}?fetchXml=${xml}`;
        }
    }    
};