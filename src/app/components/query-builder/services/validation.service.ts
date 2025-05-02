import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, map, switchMap, shareReplay, catchError, takeUntil, BehaviorSubject } from 'rxjs';
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
        console.log(`Setting up validation for node: ${node.nodeName}`, {
            oneTimeValidators: node.validatiors.oneTimeValidators.length,
            validators: node.validatiors.validators.length,
            attributesCount: node.attributes$.value?.length || 0
        });
        
        // Return the one time validation result if it has errors
        if (node.validatiors.oneTimeValidators.length > 0) {
            const oneTimeResults = node.validatiors.oneTimeValidators.map(validator => validator.validate(node));

            const combinedResult = oneTimeResults.reduce((acc, result) => ({
                isValid: acc.isValid && result.isValid,
                errors: [...acc.errors, ...result.errors]
            }), VALID_RESULT);

            if (!combinedResult.isValid) {
                console.log(`One-time validation failed for ${node.nodeName}:`, combinedResult);
                return of(combinedResult);
            }
        }

        // Skip setting up reactive validations if there are no validators
        if (node.validatiors.validators.length === 0 &&
            (!node.attributes$.value || node.attributes$.value.length === 0)) {
            console.log(`No validators for ${node.nodeName}, returning VALID_RESULT`);
            return of(VALID_RESULT);
        }

        console.log(`Setting up node validators for ${node.nodeName}:`, 
            node.validatiors.validators.map(v => v.constructor.name));

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
            console.log(`No node validators for ${node.nodeName}, using only attribute validation`);
            return attributeValidationResults$.pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                takeUntil(node.destroyed$)
            );
        }

        // Node validation observable
        const nodeValidatorResults$ = node.validatiors.validators.map(validator => {
            console.log(`Setting up node validator: ${validator.constructor.name} for ${node.nodeName}`);
            return validator.validate(node).pipe(
                catchError(error => {
                    console.error(`Error in validator ${validator.constructor.name}:`, error);
                    return of({
                        isValid: false,
                        errors: [`Validation error: ${error.message}`]
                    });
                })
            );
        });

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
        // Handle null nodeTree case
        if (!nodeTree || !nodeTree.value) {
            console.warn('setupNodeTreeValidation called with null/undefined nodeTree or nodeTree.value');
            return of({ isValid: false, errors: ['Tree structure is invalid'] });
        }

        const destroyed$ = nodeTree.value.destroyed$;

        const treeValidation$ = this.requiredNodeValidator.validate(nodeTree).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(destroyed$)
        );

        // Create an observable that emits whenever a new node is added to the tree
        // or when an existing node's validation state changes
        const nodesValidation$ = nodeTree.pipe(
            switchMap(tree => {
                if (!tree || !tree.root) {
                    return of(VALID_RESULT);
                }                

                // Collect all node validation observables
                const nodeValidations: Observable<ValidationResult>[] = [];
                let nodeCount = 0;
                
                for (const node of tree) {
                    nodeCount++;
                    if (node && node.validationResult$) {
                        nodeValidations.push(node.validationResult$);
                    }
                }
                
                if (nodeValidations.length === 0) {
                    return of(VALID_RESULT);
                }

                // combineLatest will emit whenever any of the node validation observables emit
                return combineLatest(nodeValidations)
                    .pipe(
                        map(results => {
                            // Combine all validation results into one
                            const combinedResult = results.reduce((acc, result) => ({
                                isValid: acc.isValid && result.isValid,
                                errors: [...acc.errors, ...result.errors]
                            }), VALID_RESULT);
                            
                            return combinedResult;
                        })
                    );
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(destroyed$)
        );

        return combineLatest([treeValidation$, nodesValidation$]).pipe(
            map(([treeValidation, nodesValidation]) => {
                // Make sure overall validation fails if any node validation fails
                const isValid = treeValidation.isValid && nodesValidation.isValid;
                const errors = [...treeValidation.errors, ...nodesValidation.errors];
                
                return {
                    isValid,
                    errors
                };
            }),
            catchError(error => {
                console.error(`Node tree validation error:`, error);
                return of(VALID_RESULT);
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            takeUntil(destroyed$)
        );
    }
} 