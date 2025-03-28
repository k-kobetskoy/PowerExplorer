import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, map, switchMap, shareReplay, catchError, takeUntil, tap, BehaviorSubject, first, delay, filter, merge, find, mergeMap, from } from 'rxjs';
import { QueryNode } from '../models/query-node';
import { NodeAttribute } from '../models/node-attribute';
import { RequiredNodeValidatorService } from './attribute-services/validators/tree/required-node-validator.service';
import { QueryNodeTree } from '../models/query-node-tree';

export const VALID_RESULT: ValidationResult = {
    isValid: true,
    errors: [] as string[]
};

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
    constructor(private requiredNodeValidator: RequiredNodeValidatorService) { }

    setupNodeAttributeValidation(nodeAttribute: NodeAttribute): Observable<ValidationResult> {
        if (nodeAttribute.parserValidation && nodeAttribute.validators.oneTimeValidators.length > 0) {
            const oneTimeResults = nodeAttribute.validators.oneTimeValidators.map(validator => validator.validate(nodeAttribute));

            const combinedResult = oneTimeResults.reduce((acc, result) => ({
                isValid: acc.isValid && result.isValid,
                errors: [...acc.errors, ...result.errors]
            }), VALID_RESULT);

            if (!combinedResult.isValid) {
                return of(combinedResult);
            }
        }

        if (nodeAttribute.validators.validators.length === 0) {
            return of(VALID_RESULT);
        }

        const validatorResults$ = nodeAttribute.validators.validators.map(validator => validator.validate(nodeAttribute));

        return combineLatest(validatorResults$).pipe(
            map(results => {
                const errors = results
                    .filter(result => !result.isValid)
                    .flatMap(result => result.errors);

                return {
                    isValid: errors.length === 0,
                    errors
                };
            }),
            catchError(error => {
                console.error(`Validation pipeline error for ${nodeAttribute.editorName}:`, error);
                return of(VALID_RESULT);
            }),

            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(nodeAttribute.destroyed$),

        );
    }

    setupNodeValidation(node: QueryNode): Observable<ValidationResult> {
        // Return the one time validation result if it has errors
        if (node.validatiors.oneTimeValidators.length > 0) {
            const oneTimeResults = node.validatiors.oneTimeValidators.map(validator => validator.validate(node));

            const combinedResult = oneTimeResults.reduce((acc, result) => ({
                isValid: acc.isValid && result.isValid,
                errors: [...acc.errors, ...result.errors]
            }), VALID_RESULT);

            if (!combinedResult.isValid) {
                return of(combinedResult);
            }
        }

        // Skip setting up reactive validations if there are no validators
        if (node.validatiors.validators.length === 0 &&
            (!node.attributes$.value || node.attributes$.value.length === 0)) {
            return of(VALID_RESULT);
        }

        // Attributes validation observable
        const attributeValidationResults$ = node.attributes$.pipe(
            // distinctUntilChanged((prev, curr) => prev.length === curr.length),
            switchMap(attributes => {
                if (!attributes || attributes.length === 0) {
                    return of(VALID_RESULT);
                }

                const validationResults$ = attributes.map(attr => {
                    if (!attr) {
                        return of<ValidationResult>(VALID_RESULT);
                    }
                    return attr.validationResult$;
                });

                return combineLatest(validationResults$).pipe(
                    map(results => {
                        const errors = results.filter(result => !result.isValid).flatMap(result => result.errors);
                        return { isValid: errors.length === 0, errors };
                    })
                );
            })
        );

        // Return attribute validation results if there are no node validators
        if (node.validatiors.validators.length === 0) {
            return attributeValidationResults$.pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                takeUntil(node.destroyed$)
            );
        }

        // Node validation observable
        const nodeValidatorResults$ = node.validatiors.validators.map(validator =>
            validator.validate(node).pipe(
                catchError(error => {
                    return of({
                        isValid: false,
                        errors: [`Validation error: ${error.message}`]
                    });
                })
            )
        );

        // Combine node validators with attribute validation
        return combineLatest([
            combineLatest(nodeValidatorResults$).pipe(
                map(results => {
                    const errors = results
                        .filter(result => !result.isValid)
                        .flatMap(result => result.errors);

                    return {
                        isValid: errors.length === 0,
                        errors
                    };
                })
            ),
            attributeValidationResults$
        ]).pipe(
            map(([nodeValidation, attributeValidation]) => ({
                isValid: nodeValidation.isValid && attributeValidation.isValid,
                errors: [...nodeValidation.errors, ...attributeValidation.errors]
            })),
            catchError(error => {
                console.error(`Node validation error for ${node.defaultNodeDisplayValue}:`, error);
                return of(VALID_RESULT);
            }),
            shareReplay({ bufferSize: 1, refCount: true }), //TODO: Check if this is needed.
            takeUntil(node.destroyed$)
        );
    }

    setupNodeTreeValidation(nodeTree: BehaviorSubject<QueryNodeTree>): Observable<ValidationResult> {

        const treeValidation$ = this.requiredNodeValidator.validate(nodeTree).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(nodeTree.value.destroyed$)
        );

        const nodesValidation$ = nodeTree.pipe(
            switchMap(tree => {
                if (!tree || !tree.root) {
                    return of(VALID_RESULT);
                }
                
                const nodeValidations: Observable<ValidationResult>[] = [];
                for (const node of tree) {
                    if (node && node.validationResult$) {
                        nodeValidations.push(node.validationResult$);
                    }
                }
                
                if (nodeValidations.length === 0) {
                    return of(VALID_RESULT);
                }
                
                return combineLatest(nodeValidations).pipe(
                    map(results => {
                        const invalidResults = results.filter(r => !r.isValid);
                        if (invalidResults.length > 0) {
                            // Return the first invalid result if any exists
                            return invalidResults[0];
                        }
                        return VALID_RESULT;
                    })
                );
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(nodeTree.value.destroyed$)
        );

        return combineLatest([treeValidation$, nodesValidation$]).pipe(
            map(([treeValidation, nodesValidation]) => ({
                isValid: treeValidation.isValid && nodesValidation.isValid,
                errors: [...treeValidation.errors, ...nodesValidation.errors]
            })),
            catchError(error => {
                console.error(`Node tree validation error:`, error);
                return of(VALID_RESULT);
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(nodeTree.value.destroyed$)
        );
    }
} 