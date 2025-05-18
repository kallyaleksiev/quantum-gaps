'use client';

import React, { useEffect, useState } from 'react';
import { useGraph } from '../GraphContext';

type NodeType = 'concept' | 'category' | 'category_and_concept';

interface TreeNode {
    id: string;
    type: NodeType;
    children: TreeNode[];
    hasQuantumRelationship?: boolean;
    relationshipTypes?: string[];
}

// Styling constants (match graph colors)
const CATEGORY_NODE_COLOR = 'rgba(74,144,226,0.4)';
const PAGE_QUANTUM_NODE_COLOR = 'rgba(80,250,123,0.4)';
const PAGE_NO_QUANTUM_NODE_COLOR = 'rgba(255,85,85,0.4)';
const PAGE_LIMITED_QUANTUM_NODE_COLOR = 'rgba(234,166,63,0.4)';

// Relationship types for classification
const RELATIONSHIP_TYPES = [
    'direct_quantumisation',
    'quantum_applied_classically',
    'classical_applied_quantum',
    'tangential_relationship',
];

export default function JSONVisualiser() {
    const { rootNode, graphData, setSelectedNode } = useGraph();
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode]));

    // Build tree data from graph data
    useEffect(() => {
        if (!graphData) return;

        function buildTree(nodeName: string, visited = new Set<string>()): TreeNode | null {
            if (visited.has(nodeName)) return null; // Prevent cycles
            visited.add(nodeName);

            // Check if node has classification
            const hasClassification = graphData?.classification[nodeName]?.has_quantum_relationship !== undefined;
            
            // Check if node has children
            const hasChildren = (graphData?.categories[nodeName]?.length ?? 0) > 0 || (graphData?.pages[nodeName]?.length ?? 0) > 0;

            // Determine node type based on classification and children
            let type: NodeType;
            if (hasClassification && hasChildren) {
                type = 'category_and_concept';
            } else if (hasClassification) {
                type = 'concept';
            } else {
                type = 'category';
            }

            // Check classification data for pages
            const hasQuantumRelationship = hasClassification &&
                graphData?.classification[nodeName]?.has_quantum_relationship;

            // Get relationship types if available
            const relationshipTypes = hasClassification && hasQuantumRelationship ?
                graphData?.classification[nodeName]?.matches?.map(
                    (c: { relationship_type: string }) => c.relationship_type
                ).filter((type: string) => RELATIONSHIP_TYPES.includes(type)) : [];

            const node: TreeNode = {
                id: nodeName,
                type,
                children: [],
                hasQuantumRelationship,
                relationshipTypes
            };

            // Add category children
            if (graphData?.categories[nodeName]) {
                for (const childName of graphData.categories[nodeName]) {
                    const childNode = buildTree(childName, new Set(visited));
                    if (childNode) {
                        node.children.push(childNode);
                    }
                }
            }

            // Add page children (only for categories that are in pages.json)
            if (graphData?.pages[nodeName]) {
                for (const childName of graphData.pages[nodeName]) {
                    // Skip if the child is already a category
                    if (!node.children.some(child => child.id === childName)) {
                        // Check classification data for this page
                        const childHasQuantum = graphData?.classification[childName]?.has_quantum_relationship;

                        // Get relationship types if available
                        const childRelationshipTypes = childHasQuantum ?
                            graphData?.classification[childName]?.matches?.map(
                                (c: { relationship_type: string }) => c.relationship_type
                            ) : [];

                        const childNode = {
                            id: childName,
                            type: 'concept' as NodeType,
                            children: [],
                            hasQuantumRelationship: childHasQuantum,
                            relationshipTypes: childRelationshipTypes
                        };
                        node.children.push(childNode);
                    }
                }
            }

            return node;
        }

        const tree = buildTree(rootNode);
        setTreeData(tree);
    }, [graphData, rootNode]);

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    if (!graphData || !treeData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-neutral-900">Loading visualization...</p>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="flex flex-col overflow-auto pb-8">
                <JSONTreeView
                    node={treeData}
                    level={0}
                    expandedNodes={expandedNodes}
                    toggleNode={toggleNode}
                    onSelectNode={setSelectedNode}
                />
            </div>
        </div>
    );
}

interface JSONTreeViewProps {
    node: TreeNode;
    level: number;
    expandedNodes: Set<string>;
    toggleNode: (id: string) => void;
    onSelectNode: (id: string | null) => void;
}

function JSONTreeView({ node, level, expandedNodes, toggleNode, onSelectNode }: JSONTreeViewProps) {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indentation = level * 20;

    // Determine background color based on node type and classification
    const getBackgroundColor = () => {
        if (node.type === 'category') {
            return CATEGORY_NODE_COLOR;
        } else if (node.type === 'concept' || node.type === 'category_and_concept') {
            if (!node.hasQuantumRelationship) {
                return PAGE_NO_QUANTUM_NODE_COLOR;
            } else if (node.relationshipTypes && node.relationshipTypes.length > 0) {
                // Check if all relationship types are 'limited' (tangential or classical applied to quantum)
                const isLimited = node.relationshipTypes.every(type =>
                    ['tangential_relationship', 'classical_applied_quantum'].includes(type)
                );
                return isLimited ? PAGE_LIMITED_QUANTUM_NODE_COLOR : PAGE_QUANTUM_NODE_COLOR;
            }
            return PAGE_QUANTUM_NODE_COLOR;
        }
        return 'transparent';
    };

    // Get text color based on node type
    const getTextColor = () => 'text-neutral-800';

    return (
        <div className="text-left whitespace-nowrap">
            {/* Node row with table-like appearance */}
            <div
                style={{
                    marginLeft: `${indentation}px`,
                    backgroundColor: getBackgroundColor(),
                }}
                className="flex items-center my-1 p-2 rounded-md cursor-pointer hover:brightness-95 transition-all"
                onClick={() => {
                    if (hasChildren) toggleNode(node.id);
                    onSelectNode(node.id);
                }}
            >
                {/* Expand/collapse indicator */}
                <span className="mr-2">
                    {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
                </span>

                {/* Node name */}
                <span className={`${getTextColor()} font-medium`}>
                    {node.id.replace(/_/g, ' ')}
                </span>

                {/* Item count for collapsed nodes */}
                {hasChildren && !isExpanded && (
                    <span className="ml-2 text-xs text-neutral-500">
                        {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            {/* Children if expanded */}
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <JSONTreeView
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                            onSelectNode={onSelectNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 