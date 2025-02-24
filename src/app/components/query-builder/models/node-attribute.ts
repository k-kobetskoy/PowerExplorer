import { BehaviorSubject, combineLatest, map, Observable, shareReplay, of } from 'rxjs';
import { AttributeValidators } from './attribute-validators';
import { AttributeDisplayValues as AttributeDisplayValues } from './attribute-display-values';
import { QueryNode } from './query-node';
import { IAttributeData } from './constants/attribute-data';
import { IAttributeValidationResult } from '../services/attribute-services/abstract/i-attribute-validation-result';

export class NodeAttribute {
    parentNode: QueryNode;
    editorName: string;
    order: number;
    isValidName: boolean;
    value$ = new BehaviorSubject<string>('');
    validators: AttributeValidators;
    attributeDisplayValues: AttributeDisplayValues;
    private readonly validationState$: Observable<IAttributeValidationResult>;

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

        this.validationState$ = combineLatest([
            ...this.validators.defaultAsyncValidators || [],
            ...this.validators.parsingSynchronousValidators || [],
            ...this.validators.parsingAsyncValidators || []
        ].map(validator => validator.getValidator(this)().isValid$)).pipe(    
            map(results => ({
                isValid$: of(results.every(v => v)),
                errorMessage: results.some(isValid => !isValid) ? 
                    `Validation failed for ${this.editorName}` : ''
            })),
            shareReplay(1)
        );
    }


    getValidationState(): Observable<IAttributeValidationResult> {
        return this.validationState$;
    }
}