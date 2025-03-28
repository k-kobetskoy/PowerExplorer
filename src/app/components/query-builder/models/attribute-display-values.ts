import { BehaviorSubject, distinctUntilChanged, map, Observable, of, takeUntil } from "rxjs";
import { AttributeTreeViewDisplayStyle } from "./constants/attribute-tree-view-display-style";
import { NodeAttribute } from "./node-attribute";
export class AttributeDisplayValues {
    displayOnTreeView: boolean;
    treeViewDisplayValue$: Observable<string>;
    editorViewDisplayValue$: Observable<string>;

    constructor(
        nodeAttribute: NodeAttribute,
        attributeValue$: BehaviorSubject<string>,
        editorViewDisplayName: string,
        treeViewDisplayName?: string,
        treeViewDisplayStyle: string = AttributeTreeViewDisplayStyle.none,
        ignoreFalseValues: boolean = false) {

        this.displayOnTreeView = treeViewDisplayStyle !== AttributeTreeViewDisplayStyle.none;

        // Initialize with empty observable by default
        this.treeViewDisplayValue$ = of('');

        switch (treeViewDisplayStyle) {
            case AttributeTreeViewDisplayStyle.onlyName:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(),
                    map(value => {
                        if (value.toString().trim().length === 0) {
                            return '';
                        }

                        if (ignoreFalseValues) {
                            return value !== 'false' ? `${treeViewDisplayName}` : '';
                        }

                        return `${treeViewDisplayName}`;
                    }), takeUntil(nodeAttribute.destroyed$)
                );
                break;
            case AttributeTreeViewDisplayStyle.nameWithValue:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(),
                    map(value => {
                        if (value.toString().trim().length === 0) {
                            return '';
                        }

                        if (ignoreFalseValues) {
                            return value !== 'false' ? `${treeViewDisplayName}:${value}` : '';
                        }

                        return `${treeViewDisplayName}:${value}`;
                    }), takeUntil(nodeAttribute.destroyed$)
                );
                break;
            case AttributeTreeViewDisplayStyle.onlyValue:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(),
                    map(value => {
                        if (value.toString().trim().length === 0) {
                            return '';
                        }

                        if (ignoreFalseValues) {
                            return value !== 'false' ? `${value}` : '';
                        }

                        return `${value}`;
                    }), takeUntil(nodeAttribute.destroyed$)
                );
                break;
            case AttributeTreeViewDisplayStyle.alias:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(),
                    map(value => {
                        if (value.toString().trim().length === 0) {
                            return '';
                        }

                        if (ignoreFalseValues) {
                            return value !== 'false' ? `(${value})` : '';
                        }

                        return `(${value})`;
                    }), takeUntil(nodeAttribute.destroyed$)
                );
                break;
            case AttributeTreeViewDisplayStyle.none:
            default:
                // Keep the default empty observable
                break;
        }

        this.editorViewDisplayValue$ = attributeValue$.pipe(
            distinctUntilChanged(),
            map(value => this.getEditorViewDisplayValue(value, editorViewDisplayName, ignoreFalseValues)),
            takeUntil(nodeAttribute.destroyed$)
        );
    }

    getEditorViewDisplayValue(value: string, editorViewDisplayName: string, ignoreFalseValues: boolean): string {
        if (value.length === 0) {
            return '';
        }

        if (ignoreFalseValues) {
            return value !== 'false' && value !== '0' ? `${editorViewDisplayName}="${value}"` : '';
        }

        return `${editorViewDisplayName}="${value}"`;
    }
}
