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
    private validationState$: Observable<IAttributeValidationResult>;
    private validationStateChange$ = new BehaviorSubject<{attributeName: string, errors: string[]}>({
        attributeName: '',
        errors: []
    });

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

        this.setupValidation();

        if (this.parentNode) {
            this.validationStateChange$.subscribe(change => {
                this.parentNode.handleAttributeValidationChange(change);
            });
        }
    }

    private setupValidation() {
        this.validationState$ = combineLatest([
            ...this.validators.defaultAsyncValidators || [],
            ...this.validators.parsingSynchronousValidators || [],
            ...this.validators.parsingAsyncValidators || []
        ].map(validator => validator.getValidator(this)())).pipe(    
            map(results => {
                const errors = results
                    .filter(result => !result.isValid$)
                    .map(result => result.errorMessage)
                    .filter(msg => msg);
                
                this.validationStateChange$.next({
                    attributeName: this.editorName,
                    errors: errors
                });

                return {
                    isValid$: of(errors.length === 0),
                    errorMessage: errors.length > 0 ? 
                        `Validation failed for ${this.editorName}: ${errors.join(', ')}` : ''
                };
            }),
            shareReplay(1)
        );
    }

    getValidationState(): Observable<IAttributeValidationResult> {
        return this.validationState$;
    }
}