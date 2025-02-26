import { Component, Input } from '@angular/core';
import { QueryNode } from '../../models/query-node';
import { AttributeData } from '../../models/constants/attribute-data';
import { IAttributeData } from '../../models/constants/attribute-data';

@Component({ template: '' })
export class BaseFormComponent {
    @Input() selectedNode: QueryNode;
    protected readonly AttributeData = AttributeData;

    protected getAttributeValue(attributeData: IAttributeData): string {
        console.log(`getAttributeValue called for: ${attributeData.EditorName}`);
        const attribute = this.selectedNode.findAttribute(attributeData.EditorName);
        return attribute?.value$.value || '';
    }

    protected updateAttribute(attributeData: IAttributeData, value: string): void {
        console.log(`updateAttribute called for: ${attributeData.EditorName} with value: ${value}`);
        this.selectedNode.setAttribute(attributeData, value);
    }
} 