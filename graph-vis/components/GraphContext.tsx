'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ViewMode = 'json' | 'graph';
export type GraphData = {
    categories: Record<string, string[]>;
    pages: Record<string, string[]>;
    classification: Record<string, {
        has_quantum_relationship: boolean;
        matches: Array<{
            concept: string;
            relationship_type: string;
            concept_summary: string;
            paper: {
                title: string;
                authors: Array<{ name: string }>;
                year: number;
                url: string;
                abstract: string;
            };
            classification_reasoning: string;
            classification_explanation: string;
        }>;
    }>;
};

interface GraphContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedNode: string | null;
    setSelectedNode: (node: string | null) => void;
    rootNode: string;
    setRootNode: (node: string) => void;
    maxNodes: number;
    setMaxNodes: (num: number) => void;
    graphData: GraphData | null;
    isLoading: boolean;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>('json');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [rootNode, setRootNode] = useState<string>(
        typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_QG_ROOT_NODE || '<ROOT>')
            : '<ROOT>'
    );
    const [maxNodes, setMaxNodes] = useState<number>(100);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadGraphData() {
            setIsLoading(true);
            try {
                const [categoriesRes, pagesRes, classificationRes] = await Promise.all([
                    fetch('/data/categories.json'),
                    fetch('/data/pages.json'),
                    fetch('/data/classification.json')
                ]);

                if (!categoriesRes.ok || !pagesRes.ok || !classificationRes.ok) {
                    throw new Error('Failed to load graph data');
                }

                const categories = await categoriesRes.json();
                const pages = await pagesRes.json();
                const classification = await classificationRes.json();

                // Filter out concepts without valid classification data
                const validConcepts = new Set(
                    Object.entries(classification)
                        .filter(([, data]) => {
                            const typedData = data as { has_quantum_relationship: boolean; matches?: unknown[] };
                            return typedData.matches && typedData.matches.length > 0;
                        })
                        .map(([concept]) => concept)
                );

                // Add category nodes to valid concepts if they either:
                // 1. Have no classification entry, or
                // 2. Have a classification entry with non-empty matches
                Object.keys(categories).forEach(category => {
                    if (!classification[category] || 
                        (classification[category] && 
                         classification[category].matches && 
                         classification[category].matches.length > 0)) {
                        validConcepts.add(category);
                    }
                });

                // Filter categories to only include valid concepts
                const filteredCategories: Record<string, string[]> = {};
                for (const [category, concepts] of Object.entries(categories)) {
                    const validConceptsInCategory = (concepts as string[]).filter(concept => validConcepts.has(concept));
                    if (validConceptsInCategory.length > 0) {
                        filteredCategories[category] = validConceptsInCategory;
                    }
                }

                // Filter pages to only include valid concepts
                const filteredPages: Record<string, string[]> = {};
                for (const [page, concepts] of Object.entries(pages)) {
                    const validConceptsInPage = (concepts as string[]).filter(concept => validConcepts.has(concept));
                    if (validConceptsInPage.length > 0) {
                        filteredPages[page] = validConceptsInPage;
                    }
                }

                // Filter classification to only include valid concepts
                const filteredClassification = Object.fromEntries(
                    Object.entries(classification)
                        .filter(([concept]) => validConcepts.has(concept))
                ) as Record<string, {
                    has_quantum_relationship: boolean;
                    matches: Array<{
                        concept: string;
                        relationship_type: string;
                        concept_summary: string;
                        paper: {
                            title: string;
                            authors: Array<{ name: string }>;
                            year: number;
                            url: string;
                            abstract: string;
                        };
                        classification_reasoning: string;
                        classification_explanation: string;
                    }>;
                }>;

                setGraphData({ 
                    categories: filteredCategories, 
                    pages: filteredPages, 
                    classification: filteredClassification 
                });
            } catch (error) {
                console.error('Error loading graph data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadGraphData();
    }, []);

    return (
        <GraphContext.Provider
            value={{
                viewMode,
                setViewMode,
                selectedNode,
                setSelectedNode,
                rootNode,
                setRootNode,
                maxNodes,
                setMaxNodes,
                graphData,
                isLoading,
            }}
        >
            {children}
        </GraphContext.Provider>
    );
}

export function useGraph() {
    const context = useContext(GraphContext);
    if (context === undefined) {
        throw new Error('useGraph must be used within a GraphProvider');
    }
    return context;
} 