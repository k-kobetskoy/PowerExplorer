import { Component, Input } from '@angular/core';
import { QueryNode } from '../../models/query-node';
import { IAttributeData } from '../../models/constants/attribute-data';
import { NodeAttribute } from '../../models/node-attribute';

@Component({ template: '' })
export class BaseFormComponent {
    @Input() selectedNode: QueryNode;

    protected getAttribute(attributeData: IAttributeData): NodeAttribute | undefined {
        return this.selectedNode?.findAttribute(attributeData.EditorName);
    }

    protected updateAttribute(attributeData: IAttributeData, value: string): void {
        this.selectedNode?.setAttribute(attributeData, value);
    }
} 