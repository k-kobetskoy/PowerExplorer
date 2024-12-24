import { BehaviorSubject } from 'rxjs';
import { IQueryNode } from './abstract/OBSOLETE i-query-node';
import { AttributeValidators } from './attribute-validators';
import { AttributeDisplayProperties } from './attribute-display-properties';
import { AttributeTreeViewDisplayStyle } from './constants/attribute-tree-view-display-style';

export class NodeAttribute {
    parentNode: IQueryNode;
    name: string;
    order: number;
    isValidName: boolean;
    value$ = new BehaviorSubject<string>('');
    validators: AttributeValidators;
    attributeDisplayProperties: AttributeDisplayProperties;

    constructor(
        node: IQueryNode,
        name: string,
        validators: AttributeValidators,
        treeViewDisplayName?: string,
        treeViewDisplayStyle: string = AttributeTreeViewDisplayStyle.none,
        value?: string,
        order = 99,
        isValidName: boolean = true) {
        this.parentNode = node;
        this.name = name;
        this.validators = validators;
        this.order = order;
        this.isValidName = isValidName;

        if (value) {
            this.value$.next(value);
        }

        this.attributeDisplayProperties = new AttributeDisplayProperties(
            this.value$,
            name,
            treeViewDisplayName,
            treeViewDisplayStyle
        );
    }
}