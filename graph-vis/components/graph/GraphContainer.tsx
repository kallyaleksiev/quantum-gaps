'use client';

import React from 'react';
import { useGraph, ViewMode } from '../GraphContext';
import JSONVisualiser from '@/components/graph/JSONVisualiser';
import CytoscapeGraph from '@/components/graph/CytoscapeGraph';
import NodeInfoSidebar from '@/components/graph/NodeInfoSidebar';
import ControlPanel from '@/components/graph/ControlPanel';

export default function GraphContainer() {
    const {
        viewMode,
        setViewMode,
        selectedNode,
        rootNode,
        setRootNode,
        maxNodes,
        setMaxNodes,
        isLoading
    } = useGraph();

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-neutral-900 text-lg font-medium">Loading quantum graph data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-50">
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm border-b border-neutral-200 py-3 px-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-semibold text-black">Quantum Computing Graph</h1>
                        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                    </div>
                </header>

                <main className="flex-1 flex overflow-hidden">
                    <ControlPanel
                        rootNode={rootNode}
                        setRootNode={setRootNode}
                        maxNodes={maxNodes}
                        setMaxNodes={setMaxNodes}
                    />

                    <div className="flex-1 overflow-auto p-4">
                        <div className="h-full rounded-xl bg-white shadow-soft overflow-hidden border border-neutral-200">
                            {viewMode === 'json' ? (
                                <JSONVisualiser />
                            ) : (
                                <CytoscapeGraph />
                            )}
                        </div>
                    </div>

                    {selectedNode && <NodeInfoSidebar />}
                </main>
            </div>
        </div>
    );
}

interface ViewModeToggleProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps) {
    return (
        <div className="flex bg-neutral-100 p-1 rounded-lg text-sm relative">
            {/* Sliding background for active state */}
            <div
                className={`absolute top-1 bottom-1 rounded-md bg-white shadow-sm transition-all duration-300 ease-in-out ${viewMode === 'json' ? 'left-1 right-[calc(50%-1px)]' : 'left-[calc(50%-1px)] right-1'
                    }`}
            ></div>

            <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded-md z-10 transition-colors duration-300 ease-in-out relative ${viewMode === 'json'
                    ? 'text-primary-800 font-medium'
                    : 'text-neutral-800 font-medium'
                    }`}
            >
                JSON
            </button>
            <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 rounded-md z-10 transition-colors duration-300 ease-in-out relative ${viewMode === 'graph'
                    ? 'text-primary-800 font-medium'
                    : 'text-neutral-800 font-medium'
                    }`}
            >
                Graph
            </button>
        </div>
    );
} 