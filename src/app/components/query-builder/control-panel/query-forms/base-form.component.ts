import { Component } from '@angular/core';
import { IAttributeData } from '../../models/constants/attribute-data';
import { NodeAttribute } from '../../models/node-attribute';
import { QueryNode } from '../../models/query-node';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';
@Component({ template: '' })
export class BaseFormComponent {
    
    protected getAttribute(attributeData: IAttributeData, selectedNode: QueryNode): NodeAttribute | undefined {
        return selectedNode?.findAttribute(attributeData.EditorName);
    }

    protected updateAttribute(attributeData: IAttributeData, selectedNode: QueryNode, value: string, attributeModel: AttributeModel = null): void {
        selectedNode?.setAttribute(attributeData, value, attributeModel);
    }
} 