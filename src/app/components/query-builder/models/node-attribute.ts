import { BehaviorSubject, Subject } from 'rxjs';
import { AttributeValidators } from './attribute-validators';
import { AttributeDisplayValues as AttributeDisplayValues } from './attribute-display-values';
import { QueryNode } from './query-node';
import { IAttributeData } from './constants/attribute-data';

export class NodeAttribute {
    parentNode: QueryNode;
    editorName: string;
    order: number;
    isValidName: boolean;
    value$ = new BehaviorSubject<string>('');
    validators: AttributeValidators;
    attributeDisplayValues: AttributeDisplayValues;
    destroyNotifier$ = new Subject<void>();

    constructor(
        node: QueryNode,
        validators: AttributeValidators,
        attributeData: IAttributeData,
        value?: string,
    ) {
        this.parentNode = node;
        this.editorName = attributeData.EditorName;
        this.validators = validators;
        this.order = attributeData.Order;
        this.isValidName = attributeData.IsValidName;

        if (value) {
            this.value$.next(value);
        }

        this.attributeDisplayValues = new AttributeDisplayValues(
            this.value$,
            attributeData.EditorName,
            attributeData.TreeViewName,
            attributeData.TreeViewDisplayStyle,
        );
    }    

    destroy() {
        this.destroyNotifier$.next();
        this.destroyNotifier$.complete();
    }
}