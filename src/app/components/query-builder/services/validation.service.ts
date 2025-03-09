import { Injectable } from '@angular/core';
import { Observable, of, combineLatest, debounceTime, distinctUntilChanged, map, switchMap, shareReplay, catchError, NEVER, takeUntil, Subject } from 'rxjs';
import { NodeAttribute } from '../models/node-attribute';
import { QueryNode } from '../models/query-node';

const VALID_RESULT: Readonly<ValidationResult> = {
    isValid: true,
    errors: [] as string[]
};

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
    constructor() { }

    validateAttribute(attribute: NodeAttribute,  destroyed$?: Subject<void>): Observable<ValidationResult> {
        const validators = [
            ...(attribute.validators?.defaultAsyncValidators || []),
            ...(attribute.validators?.parsingSynchronousValidators || []),
            ...(attribute.validators?.parsingAsyncValidators || [])
        ];

        if (validators.length === 0) {
            return of(VALID_RESULT);
        }

        const validatorResults$ = validators.map(validator =>
            validator.getValidator(attribute).pipe(
                catchError(error => {
                    console.error(`Validator error for ${attribute.editorName}:`, error);
                    return of({ isValid: false, errors: [`Validator error: ${error.message}`] });
                }),
                takeUntil(destroyed$ || NEVER)
            )
        );

        const validationStream = attribute.value$.pipe(
            debounceTime(150),
            distinctUntilChanged(),
            switchMap(() => {
                // Combine all validation results
                return combineLatest(validatorResults$).pipe(
                    map(results => {
                        const errors = results
                            .filter(result => !result.isValid)
                            .flatMap(result => result.errors);

                        return {
                            isValid: errors.length === 0,
                            errors
                        };
                    })
                );
            }),
            catchError(error => {
                console.error(`Validation error for ${attribute.editorName}:`, error);
                return of(VALID_RESULT);
            }),
            shareReplay(1),
            takeUntil(destroyed$ || NEVER)
        );

        return validationStream;
    }

    validateNode(node: QueryNode,  destroyed$?: Subject<void>): Observable<ValidationResult> {
        return node.attributes$.pipe(
            distinctUntilChanged(),
            debounceTime(150),
            switchMap(attributes => {
                if (!attributes || attributes.length === 0) {
                    return of(VALID_RESULT);
                }

                const validationResults$ = attributes.map(attr => {
                    if (!attr) {
                        return of<ValidationResult>(VALID_RESULT);
                    }
                    return this.validateAttribute(attr, destroyed$);
                });

                return combineLatest(validationResults$).pipe(
                    map(results => {
                        const errors = results.filter(result => !result.isValid).flatMap(result => result.errors);
                        return {
                            isValid: errors.length === 0,
                            errors
                        };
                    }),
                    catchError(error => {
                        console.error('Error validating node:', error);
                        return of({ isValid: false, errors: [`Validation error: ${error.message}`] });
                    }),
                    shareReplay(1),
                    takeUntil(destroyed$ || NEVER)
                );
            })
        );
    }
} 