'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useGraph } from '../GraphContext';
import dynamic from 'next/dynamic';

// Define node colors (muted dark mode) and quantum relationship types and their tag styling
const CATEGORY_NODE_COLOR = 'rgba(74,144,226,0.4)';
const PAGE_QUANTUM_NODE_COLOR = 'rgba(80,250,123,0.4)';
const PAGE_NO_QUANTUM_NODE_COLOR = 'rgba(255,85,85,0.4)';
const PAGE_LIMITED_QUANTUM_NODE_COLOR = 'rgba(234,166,63,0.4)';

// Define quantum relationship tag styles
const RELATIONSHIP_TYPES = [
    'direct_quantumisation',
    'quantum_applied_to_classical',
    'classical_applied_to_quantum',
    'tangential_relationship',
];

// const RELATIONSHIP_COLORS: Record<string, string> = {
//     direct_quantumisation: '#276749',        // dark green
//     quantum_applied_to_classical: '#2f855a', // medium green
//     classical_applied_to_quantum: '#d69e2e', // muted yellow
//     tangential_relationship: '#dd6b20',      // muted orange
// };

// const RELATIONSHIP_LABELS: Record<string, string> = {
//     direct_quantumisation: 'DQ',
//     quantum_applied_to_classical: 'QC',
//     classical_applied_to_quantum: 'CQ',
//     tangential_relationship: 'TG',
// };

// const RELATIONSHIP_DISPLAY_NAMES: Record<string, string> = {
//     direct_quantumisation: 'Direct Quantumisation',
//     quantum_applied_to_classical: 'Quantum applied to classical',
//     classical_applied_to_quantum: 'Classical applied to quantum',
//     tangential_relationship: 'Tangential relationship',
// };

// Dynamically import ForceGraph2D with SSR disabled
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function CytoscapeGraph() {
    const { rootNode, maxNodes, graphData, setSelectedNode } = useGraph();
    const fgRef = useRef<any>(null);
    const [hoverNode, setHoverNode] = useState<any>(null);
    const [selectedNodeSet, setSelectedNodeSet] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);

    // Set isMounted on client side
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Add stronger repulsion on mount and kick off physics
    useEffect(() => {
        if (!isMounted) return;

        const fg = fgRef.current;
        if (fg) {
            // Using forceManyBody when available on the client
            if (typeof window !== 'undefined') {
                import('d3-force-3d').then(({ forceManyBody }) => {
                    fg.d3Force('charge', forceManyBody().strength(-200));
                    fg.d3ReheatSimulation();
                    fg.resumeAnimation();
                });
            }
        }
    }, [isMounted]);

    // Build graph data with pruning
    const graphDataWithPruning = useMemo(() => {
        if (!graphData) return { nodes: [], links: [] };

        const nodes: any[] = [];
        const links: any[] = [];
        const addedNodeIds = new Set<string>();

        // BFS traversal with depth tracking
        function traverseGraph(nodeId: string, depth: number) {
            if (addedNodeIds.has(nodeId)) return;

            // Check if node has classification
            const hasClassification = graphData?.classification[nodeId]?.has_quantum_relationship !== undefined;
            
            // Check if node has children
            const hasChildren = (graphData?.categories[nodeId]?.length ?? 0) > 0 || (graphData?.pages[nodeId]?.length ?? 0) > 0;

            // Determine node type based on classification and children
            let type: 'concept' | 'category' | 'category_and_concept';
            if (hasClassification && hasChildren) {
                type = 'category_and_concept';
            } else if (hasClassification) {
                type = 'concept';
            } else {
                type = 'category';
            }

            // Add the node
            nodes.push({
                id: nodeId,
                label: nodeId.replace(/_/g, ' '),
                type,
                has_quantum_relationship: hasClassification && 
                    graphData?.classification[nodeId]?.has_quantum_relationship &&
                    graphData?.classification[nodeId]?.matches?.length > 0
            });
            addedNodeIds.add(nodeId);

            // Skip expanding if we've reached nodes limit (except for root)
            if (nodes.length >= maxNodes && depth > 0) return;

            // Process category children
            if (graphData?.categories[nodeId]) {
                for (const childId of graphData.categories[nodeId]) {
                    // Skip if we've reached the max node count
                    if (nodes.length >= maxNodes && depth > 0) break;

                    // Only traverse children for depths 0 and 1
                    // For depth > 1, just add the node without traversing its children
                    if (depth <= 1 || nodes.length < maxNodes * 0.8) {
                        traverseGraph(childId, depth + 1);
                    } else if (!addedNodeIds.has(childId)) {
                        // Just add the node without traversing
                        const childHasClassification = graphData?.classification[childId]?.has_quantum_relationship !== undefined;
                        const childHasChildren = (graphData?.categories[childId]?.length ?? 0) > 0 || (graphData?.pages[childId]?.length ?? 0) > 0;
                        
                        let childType: 'concept' | 'category' | 'category_and_concept';
                        if (childHasClassification && childHasChildren) {
                            childType = 'category_and_concept';
                        } else if (childHasClassification) {
                            childType = 'concept';
                        } else {
                            childType = 'category';
                        }

                        nodes.push({
                            id: childId,
                            label: childId.replace(/_/g, ' '),
                            type: childType,
                            has_quantum_relationship: childHasClassification && 
                                graphData?.classification[childId]?.has_quantum_relationship &&
                                graphData?.classification[childId]?.matches?.length > 0
                        });
                        addedNodeIds.add(childId);
                    }

                    // Add the edge
                    links.push({ source: nodeId, target: childId });
                }
            }

            // Process page children (if this node is in pages)
            if (graphData?.pages[nodeId]) {
                for (const childId of graphData.pages[nodeId]) {
                    // Skip if already added as a category
                    if (addedNodeIds.has(childId)) {
                        links.push({ source: nodeId, target: childId });
                        continue;
                    }

                    // Skip if we've reached the max node count
                    if (nodes.length >= maxNodes && depth > 0) break;

                    // Add page node
                    const childHasClassification = graphData?.classification[childId]?.has_quantum_relationship !== undefined;
                    const childHasChildren = (graphData?.categories[childId]?.length ?? 0) > 0 || (graphData?.pages[childId]?.length ?? 0) > 0;
                    
                    let childType: 'concept' | 'category' | 'category_and_concept';
                    if (childHasClassification && childHasChildren) {
                        childType = 'category_and_concept';
                    } else if (childHasClassification) {
                        childType = 'concept';
                    } else {
                        childType = 'category';
                    }

                    nodes.push({
                        id: childId,
                        label: childId.replace(/_/g, ' '),
                        type: childType,
                        has_quantum_relationship: childHasClassification && 
                            graphData?.classification[childId]?.has_quantum_relationship &&
                            graphData?.classification[childId]?.matches?.length > 0
                    });
                    addedNodeIds.add(childId);

                    // Add the edge
                    links.push({ source: nodeId, target: childId });
                }
            }
        }

        // Start traversal from root node
        traverseGraph(rootNode, 0);

        return { nodes, links };
    }, [graphData, rootNode, maxNodes]);

    // Build neighbor map for hover highlighting
    const neighborMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        graphDataWithPruning.links.forEach(({ source, target }) => {
            const srcId = typeof source === 'string' ? source : (source as any).id;
            const tgtId = typeof target === 'string' ? target : (target as any).id;
            if (!map.has(srcId)) map.set(srcId, new Set());
            map.get(srcId)!.add(tgtId);
            if (!map.has(tgtId)) map.set(tgtId, new Set());
            map.get(tgtId)!.add(srcId);
        });
        return map;
    }, [graphDataWithPruning.links]);

    if (!graphData) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-neutral-900">Loading visualization...</p>
            </div>
        );
    }

    // Show loading until client-side rendering is ready
    if (!isMounted) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-neutral-900">Loading graph visualization...</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#121212' }}>
            <ForceGraph2D
                ref={fgRef}
                graphData={graphDataWithPruning}
                nodeId="id"
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                // Highlight edges adjacent to hovered or selected nodes
                linkColor={(link: any) => {
                    const srcId = typeof link.source === 'string' ? link.source : (link.source as any).id;
                    const tgtId = typeof link.target === 'string' ? link.target : (link.target as any).id;
                    const isHover = hoverNode != null && (srcId === hoverNode.id || tgtId === hoverNode.id);
                    const isSelected = Array.from(selectedNodeSet).some((id) => srcId === id || tgtId === id);
                    return isHover || isSelected ? 'gold' : 'rgba(255,255,255,0.15)';
                }}
                // Adjust link thickness: thicker for highlighted edges
                linkWidth={(link: any) => {
                    const zoom = fgRef.current?.zoom() || 1;
                    const defaultWidth = Math.min(0.5, Math.sqrt(zoom));
                    const srcId = typeof link.source === 'string' ? link.source : (link.source as any).id;
                    const tgtId = typeof link.target === 'string' ? link.target : (link.target as any).id;
                    const isHover = hoverNode != null && (srcId === hoverNode.id || tgtId === hoverNode.id);
                    const isSelected = Array.from(selectedNodeSet).some((id) => srcId === id || tgtId === id);
                    return isHover || isSelected ? 2 : defaultWidth;
                }}
                // Keep animating frames while simulation is running
                autoPauseRedraw={false}
                // Slow down alpha decay to extend initial movement
                d3AlphaDecay={0.005}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const n = node as any;
                    // Dynamic node sizing: scale with zoom up to a screen-size cap, then freeze
                    const zoom = globalScale;
                    const baseScreenNodeSize = 6;   // min radius on screen in px
                    const maxScreenNodeSize = 10;   // max radius on screen in px
                    const screenNodeSize = Math.min(
                        maxScreenNodeSize,
                        Math.max(baseScreenNodeSize, baseScreenNodeSize * zoom)
                    );
                    const worldNodeSize = screenNodeSize / zoom;
                    // Draw node circle at its x,y coordinates
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, worldNodeSize, 0, 2 * Math.PI, false);
                    // Determine node fill color based on category and quantum relationship types
                    let fillColor: string = 'transparent';
                    if (n.type === 'category') {
                        fillColor = CATEGORY_NODE_COLOR;
                    } else if (n.type === 'concept' || n.type === 'category_and_concept') {
                        if (!n.has_quantum_relationship) {
                            fillColor = PAGE_NO_QUANTUM_NODE_COLOR;
                        } else {
                            const entry = graphData.classification[n.id];
                            if (entry) {
                                const quantumTypes = entry.matches
                                    .map((m: any) => m.relationship_type)
                                    .filter((type: string) => RELATIONSHIP_TYPES.includes(type));
                                const isLimitedQuantum =
                                    quantumTypes.length > 0 &&
                                    quantumTypes.every((type: string) =>
                                        ['tangential_relationship', 'classical_applied_to_quantum'].includes(type)
                                    );
                                fillColor = isLimitedQuantum
                                    ? PAGE_LIMITED_QUANTUM_NODE_COLOR
                                    : PAGE_QUANTUM_NODE_COLOR;
                            } else {
                                fillColor = PAGE_QUANTUM_NODE_COLOR;
                            }
                        }
                    }
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                    // Hover or selection highlight
                    const isHighlighted =
                        (hoverNode &&
                            (n.id === hoverNode.id || neighborMap.get(hoverNode.id)?.has(n.id))) ||
                        selectedNodeSet.has(n.id);
                    if (isHighlighted) {
                        ctx.beginPath();
                        ctx.arc(n.x, n.y, worldNodeSize + 2 / zoom, 0, 2 * Math.PI, false);
                        ctx.lineWidth = 2 / zoom;
                        ctx.strokeStyle = 'gold';
                        ctx.stroke();
                    }
                    // Labels: show on hover or when zoomed in enough
                    const labelZoomThreshold = 1.5;
                    const baseLabelScreenSize = 8;    // base font size per zoom unit
                    const hoverLabelScreenSize = 16;  // on-screen px when hovered
                    const thresholdLabelScreenSize = baseLabelScreenSize * labelZoomThreshold;
                    const isHovered = hoverNode && hoverNode.id === n.id;
                    if (zoom > labelZoomThreshold || isHovered) {
                        const targetScreenFontSize = isHovered
                            ? hoverLabelScreenSize
                            : thresholdLabelScreenSize;
                        const fontSize = targetScreenFontSize / zoom;
                        ctx.font = `${fontSize}px Inter, sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx.shadowColor = 'black';
                        ctx.shadowBlur = 1;
                        ctx.fillText(n.label, n.x, n.y + worldNodeSize * 1.5);
                        ctx.shadowBlur = 0;
                    }
                }}
                // Expand hover hit area to match visible node size
                nodePointerAreaPaint={(node: any, color: string, ctx, globalScale) => {
                    const baseScreenNodeSize = 6;
                    const maxScreenNodeSize = 10;
                    const screenNodeSize = Math.min(
                        maxScreenNodeSize,
                        Math.max(baseScreenNodeSize, baseScreenNodeSize * globalScale)
                    );
                    const worldNodeSize = screenNodeSize / globalScale;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc((node as any).x, (node as any).y, worldNodeSize, 0, 2 * Math.PI, false);
                    ctx.fill();
                }}
                onNodeHover={(node) => setHoverNode(node)}
                onNodeClick={(node) => {
                    const n = node as any;
                    setSelectedNodeSet(new Set([n.id]));
                    setSelectedNode(n.id);
                }}
                onBackgroundClick={() => {
                    setSelectedNodeSet(new Set());
                    setHoverNode(null);
                    setSelectedNode(null);
                }}
                width={typeof window !== 'undefined' ? window.innerWidth : 1000}
                height={typeof window !== 'undefined' ? window.innerHeight - 200 : 800}
            />
            {/* Node key (static bottom-left) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: '#1e1e1e',
                    color: '#d0d0d0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '0.85em',
                    lineHeight: 1.2,
                    zIndex: 1,
                }}
            >
                <strong>Key:</strong>
                <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: PAGE_QUANTUM_NODE_COLOR }} />
                        <span>Quantum Relationship</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: PAGE_LIMITED_QUANTUM_NODE_COLOR }} />
                        <span>Limited Quantum Relationship</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: PAGE_NO_QUANTUM_NODE_COLOR }} />
                        <span>No Quantum Relationship</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: CATEGORY_NODE_COLOR }} />
                        <span>Category</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 