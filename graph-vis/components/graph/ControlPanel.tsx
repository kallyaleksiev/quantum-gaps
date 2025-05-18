'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGraph } from '../GraphContext';

interface ControlPanelProps {
    rootNode: string;
    setRootNode: (node: string) => void;
    maxNodes: number;
    setMaxNodes: (max: number) => void;
}

export default function ControlPanel({
    rootNode,
    setRootNode,
    maxNodes,
    setMaxNodes,
}: ControlPanelProps) {
    const { graphData, viewMode } = useGraph();
    const [isOpen, setIsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Search through categories and pages
    useEffect(() => {
        if (!graphData || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const results: string[] = [];
        const query = searchQuery.toLowerCase();

        // Search in categories
        Object.keys(graphData.categories).forEach(category => {
            if (category.toLowerCase().includes(query)) {
                results.push(category);
            }
        });

        // Search in pages (limit to 10 results)
        if (results.length < 10) {
            Object.keys(graphData.pages).forEach(page => {
                if (results.length < 10 && page.toLowerCase().includes(query)) {
                    if (!results.includes(page)) {
                        results.push(page);
                    }
                }
            });
        }

        setSearchResults(results.slice(0, 10));
    }, [searchQuery, graphData]);

    // Don't show max nodes control for JSON mode
    if (isOpen) {
        return (
            <div className="w-72 bg-white border-r border-neutral-200 p-3 overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-semibold text-black">Controls</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-full hover:bg-neutral-100"
                        aria-label="Close controls"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-neutral-900 mb-1">
                            Root Node
                        </label>
                        <div className="relative" ref={searchRef}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for a node..."
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500 text-sm text-neutral-900 placeholder:text-neutral-600 shadow-sm"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result}
                                            className="w-full text-left px-3 py-2 hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none text-neutral-900 text-sm"
                                            onClick={() => {
                                                setRootNode(result);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                        >
                                            {result}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-neutral-900 mb-1">Current Root: </p>
                        <p className="px-3 py-2 bg-neutral-100 rounded-lg text-sm font-mono text-neutral-900 overflow-x-auto">
                            {rootNode}
                        </p>
                    </div>

                    {viewMode === 'graph' && (
                        <div>
                            <label
                                htmlFor="maxNodes"
                                className="block text-sm font-medium text-neutral-900 mb-1"
                            >
                                Max Nodes: {maxNodes}
                            </label>
                            <input
                                id="maxNodes"
                                type="range"
                                min="20"
                                max="300"
                                step="10"
                                value={maxNodes}
                                onChange={(e) => setMaxNodes(parseInt(e.target.value))}
                                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-neutral-700 mt-1">
                                <span>20</span>
                                <span>300</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Collapsed version
    return (
        <div className="border-r border-neutral-200 bg-white flex items-center p-1">
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-full hover:bg-neutral-100"
                title="Open Controls"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
    );
} 