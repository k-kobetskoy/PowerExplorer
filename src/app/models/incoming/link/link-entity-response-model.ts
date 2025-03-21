export enum RelationshipType {
    OneToMany = 'OneToMany',
    ManyToOne = 'ManyToOne'
}

export interface LinkEntityResponseModel {
    OneToManyRelationships: RelationshipModel[],
    ManyToOneRelationships: RelationshipModel[],
}

export interface RelationshipModel {
    ReferencedEntityName: string, 
    ReferencedEntityNavigationPropertyName: string,
    ReferencedAttribute: string,
    
    SchemaName: string,
    
    ReferencingEntityName: string,
    ReferencingEntityNavigationPropertyName: string,
    ReferencingAttribute: string,    
    
    RelationshipType: RelationshipType
}
