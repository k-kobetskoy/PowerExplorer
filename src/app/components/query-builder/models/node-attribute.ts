import { BehaviorSubject, combineLatest, map, Observable, shareReplay, of, tap, switchMap, catchError } from 'rxjs';
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
        const validators = [
            ...(this.validators?.defaultAsyncValidators || []),
            ...(this.validators?.parsingSynchronousValidators || []),
            ...(this.validators?.parsingAsyncValidators || [])
        ];
        
        // If no validators, return a default valid state
        if (validators.length === 0) {
            this.validationState$ = of({ isValid$: of(true), errorMessage: '' });
            return;
        }

        // Get validator results
        const validatorResults$ = validators.map(validator => {
            try {
                return validator.getValidator(this)();
            } catch (error) {
                return { isValid$: of(false), errorMessage: `Validator error: ${error.message}` };
            }
        });

        this.validationState$ = combineLatest(
            validatorResults$.map(result => 
                result.isValid$.pipe(
                    map(isValid => ({ isValid, errorMessage: result.errorMessage }))
                )
            )
        ).pipe(
            map(results => {
                const errors = results
                    .filter(result => !result.isValid)
                    .map(result => result.errorMessage)
                    .filter(Boolean);
                
                this.validationStateChange$.next({
                    attributeName: this.editorName,
                    errors: errors
                });

                return {
                    isValid$: of(errors.length === 0),
                    errorMessage: errors.length > 0 ? errors.join(', ') : ''
                };
            }),
            catchError(error => of({ 
                isValid$: of(false), 
                errorMessage: `Validation error: ${error.message}` 
            })),
            shareReplay(1)
        );
    }

    getValidationState(): Observable<IAttributeValidationResult> {
        return this.validationState$;
    }
}