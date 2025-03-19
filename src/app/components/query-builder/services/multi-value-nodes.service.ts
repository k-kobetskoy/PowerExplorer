import { Injectable } from '@angular/core';
import { QueryNode } from '../models/query-node';
import { NodeTreeService } from './node-tree.service';

@Injectable({
    providedIn: 'root'
})
export class MultiValueNodesService {

    constructor(private nodeTreeService: NodeTreeService) { }

    /**
     * Process multi-value input and create value nodes
     * @param parentNode - Parent condition node
     * @param valueString - Comma-separated values
     */
    processMultiValues(parentNode: QueryNode, valueString: string): void {
        // First, remove all existing value nodes
        this.clearValueNodes(parentNode);

        if (!valueString) return;

        // Split input by comma, clean up values, and filter empty ones
        const values = valueString.split(',')
            .map(val => val.trim())
            .filter(val => val.length > 0);

        // Get unique values to avoid duplicates
        const uniqueValues = [...new Set(values)];

        console.log('Processing values:', uniqueValues);

        // Create a value node for each unique value in the input
        uniqueValues.forEach(val => {
            this.nodeTreeService.addValueNode(parentNode, val);
        });
    }

    /**
     * Get all value nodes for a condition node
     * @param conditionNode - The parent condition node
     * @returns Array of value nodes
     */
    getValueNodes(conditionNode: QueryNode): QueryNode[] {
        if (!conditionNode) return [];

        const valueNodes: QueryNode[] = [];
        let currentNode = conditionNode.next;

        // Traverse next nodes to find all value nodes
        while (currentNode && currentNode.level > conditionNode.level) {
            if (currentNode.nodeName === 'value' && currentNode.parent === conditionNode) {
                valueNodes.push(currentNode);
            }
            currentNode = currentNode.next;
        }

        return valueNodes;
    }

    /**
     * Clear all value nodes for a condition node
     * @param conditionNode - The parent condition node
     */
    clearValueNodes(conditionNode: QueryNode): void {
        if (!conditionNode) return;

        const valueNodes = this.getValueNodes(conditionNode);

        // Remove each value node
        for (let i = valueNodes.length - 1; i >= 0; i--) {
            this.nodeTreeService.removeNode(valueNodes[i]);
        }
    }

    /**
     * Get the combined string value from all value nodes
     * @param conditionNode - The parent condition node
     * @returns Comma-separated string of values
     */
    getMultiValueString(conditionNode: QueryNode): string {
        const valueNodes = this.getValueNodes(conditionNode);

        if (!valueNodes.length) return '';

        // Get text values from all value nodes and join with commas
        const values = valueNodes.map(node => {
            const attrs = node.attributes$.value;
            const textAttr = attrs.find(attr => attr.editorName === 'innerText');
            return textAttr?.value$.value || '';
        });

        return values.join(', ');
    }
} 