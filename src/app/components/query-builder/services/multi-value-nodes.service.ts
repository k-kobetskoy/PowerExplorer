import { Injectable } from '@angular/core';
import { QueryNode } from '../models/query-node';
import { NodeTreeService } from './node-tree.service';

@Injectable({
    providedIn: 'root'
})
export class MultiValueNodesService {

    constructor(private nodeTreeService: NodeTreeService) { }

    processMultiValues(parentNode: QueryNode, valueString: string): void {
        if (!valueString || valueString.trim() === '') {
            return;
        }
        
        // Split input by comma, clean up values, and filter empty ones
        const values = valueString.split(',')
            .map(val => val.trim())
            .filter(val => val.length > 0);
        
        // Get unique values to avoid duplicates
        const uniqueValues = [...new Set(values)];      
        
        // Create value nodes one by one with a slight delay
        setTimeout(() => {
            uniqueValues.forEach((val, index) => {
                this.nodeTreeService.addValueNode(parentNode, val);
            });
        }, 0);
    }

    getValueNodes(conditionNode: QueryNode): QueryNode[] {
        if (!conditionNode) return [];
               
        const valueNodes: QueryNode[] = [];
        let currentNode = conditionNode.next;
        
        // Traverse next nodes to find all value nodes that are direct children
        while (currentNode && currentNode.level > conditionNode.level) {
            if (currentNode.nodeName === 'Value' && currentNode.parent === conditionNode) {
                valueNodes.push(currentNode);
            }
            currentNode = currentNode.next;
        }
        
        return valueNodes;
    }

    clearValueNodes(conditionNode: QueryNode): void {
        if (!conditionNode) return;
        
        // Get value nodes in reverse order (to safely remove from end to beginning)
        const valueNodes = this.getValueNodes(conditionNode).reverse();

        // Wait for each removal to complete before starting the next one
        valueNodes.forEach(node => {
            try {
                this.nodeTreeService.removeNode(node);
            } catch (error) {
                console.error('Error removing node:', error);
            }
        });
    }

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