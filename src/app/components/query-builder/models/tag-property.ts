import { BehaviorSubject, distinctUntilChanged, Observable, Subject, takeUntil } from "rxjs";
import { ITagProperty } from "./abstract/i-tag-property";
import { AttributeValueTypes } from "./constants/attribute-value-types";

export class TagProperty<T> implements ITagProperty<T> {
    typeIndicator: string;
    name: string;
    constructorValue$?: BehaviorSubject<T>;
    parsedValue$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    treeViewDisplayValue: string; // Value to display on tree view
    typeValidationPassed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
    tagPropertyErrorMessage: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    destroy$: Subject<void> = new Subject<void>();

    validateTagPropertyValue: () => Observable<boolean>;

    constructor(name: string, type: string, treeViewDisplayValue: string = '', value?: T) {
        this.typeIndicator = type;
        this.name = name;
        this.treeViewDisplayValue = treeViewDisplayValue;

        if (value) {
            this.constructorValue$ = new BehaviorSubject<T>(value);
        } else {
            this.constructorValue$ = new BehaviorSubject<T>(null);
        }

        this.constructorValue$.pipe(
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(value => {
            if (value !== null) {
                this.typeValidationPassed$.next(true);
                this.parsedValue$.next(null);
            }
        });
    }

    destroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
