import { BehaviorSubject, Subject, Observable, map, takeUntil, distinctUntilChanged, take } from 'rxjs';
import { AttributeDisplayValues as AttributeDisplayValues } from './attribute-display-values';
import { QueryNode } from './query-node';
import { AttributeData, IAttributeData } from './constants/attribute-data';
import { ValidationResult, ValidationService } from '../services/validation.service';
import { IAttributeValidators } from '../services/attribute-services/abstract/i-attribute-validators';
import { AttributeModel } from 'src/app/models/incoming/attrubute/attribute-model';

export class NodeAttribute {
    parentNode: QueryNode;
    editorName: string;
    order: number;
    value$ = new BehaviorSubject<string>('');
    validators: IAttributeValidators;
    attributeDisplayValues: AttributeDisplayValues;
    destroyed$ = new Subject<void>();
    parserValidation: boolean;
    attributeModel$: BehaviorSubject<AttributeModel | null> = new BehaviorSubject<AttributeModel | null>(null);
    validationResult$: Observable<ValidationResult>;

    getAttributeModel(): AttributeModel | null {
        let attributeModel: AttributeModel | null = null;

        this.validationResult$.pipe(take(1))
        .subscribe(validationResult => {
            if (validationResult.isValid) {
                attributeModel = this.attributeModel$.value;
            }
        });

        return attributeModel;
    }

    setAttributeModel(attributeModel: AttributeModel | null): void {
        this.attributeModel$.next(attributeModel);
    }

    constructor(
        private validationService: ValidationService,
        node: QueryNode,
        validators: IAttributeValidators,
        attributeData: IAttributeData,
        value?: string,
        parserValidation: boolean = false
    ) {
        this.parentNode = node;
        this.editorName = attributeData.EditorName;
        this.validators = validators;
        this.order = attributeData.Order;
        this.parserValidation = parserValidation;
        if (value) {
            this.value$.next(value);
        }

        this.attributeDisplayValues = new AttributeDisplayValues(
            this.value$,
            attributeData.EditorName,
            attributeData.TreeViewName,
            attributeData.TreeViewDisplayStyle,
        );

        this.validationResult$ = this.validationService.setupNodeAttributeValidation(this);
    }

    dispose() {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}