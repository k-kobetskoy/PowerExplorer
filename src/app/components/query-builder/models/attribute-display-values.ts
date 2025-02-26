import { BehaviorSubject, distinctUntilChanged, map, Observable, of } from "rxjs";
import { AttributeTreeViewDisplayStyle } from "./constants/attribute-tree-view-display-style";

export class AttributeDisplayValues {
    displayOnTreeView: boolean;
    treeViewDisplayValue$: Observable<string>;
    editorViewDisplayValue$: Observable<string>;

    constructor(attributeValue$: BehaviorSubject<string>, editorViewDisplayName: string, treeViewDisplayName?: string, treeViewDisplayStyle: string = AttributeTreeViewDisplayStyle.none) {
        // Only display on tree view if we have a tree view name AND the display style is not 'none'
        this.displayOnTreeView = !!treeViewDisplayName && treeViewDisplayStyle !== AttributeTreeViewDisplayStyle.none;

        // Initialize with empty observable by default
        this.treeViewDisplayValue$ = of('');

        switch (treeViewDisplayStyle) {
            case AttributeTreeViewDisplayStyle.onlyName:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(), 
                    map(value => {
                        // Only show the name if value is truthy and not 'false'
                        return value && value !== 'false' ? `${treeViewDisplayName}` : '';
                    })
                );
                break;
            case AttributeTreeViewDisplayStyle.nameWithValue:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(), 
                    map(value => value && value !== 'false' ? `${treeViewDisplayName}:${value}` : '')
                );
                break;
            case AttributeTreeViewDisplayStyle.onlyValue:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(), 
                    map(value => value && value !== 'false' ? `${value}` : '')
                );
                break;
            case AttributeTreeViewDisplayStyle.alias:
                this.treeViewDisplayValue$ = attributeValue$.pipe(
                    distinctUntilChanged(), 
                    map(value => value && value !== 'false' ? `(${value})` : '')
                );
                break;
            case AttributeTreeViewDisplayStyle.none:
            default:
                // Keep the default empty observable
                break;
        }

        this.editorViewDisplayValue$ = attributeValue$.pipe(
            distinctUntilChanged(), 
            map(value => value && value !== 'false' && value !== '0' ? `${editorViewDisplayName}="${value}"` : '')
        );
    }
}
