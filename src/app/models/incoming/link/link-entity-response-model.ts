export interface LinkEntityResponseModel {
    OneToManyRelationships: RelationshipModel[],
    ManyToOneRelationships: RelationshipModel[],
}

export interface RelationshipModel {
    ReferencedEntityName: string, // The child entity
    ReferencedEntityNavigationPropertyName: string,
    ReferencedAttribute: string,
    
    SchemaName: string,
    
    ReferencingEntityName: string, // The parent entity
    ReferencingEntityNavigationPropertyName: string,
    ReferencingAttribute: string,    
}
