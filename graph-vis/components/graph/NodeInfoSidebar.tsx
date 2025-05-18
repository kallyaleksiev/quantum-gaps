"use client";

import React from "react";
import { useGraph } from "../GraphContext";
import Image from "next/image";

export default function NodeInfoSidebar() {
  const { selectedNode, setSelectedNode, graphData, setRootNode } = useGraph();

  if (!selectedNode || !graphData) {
    return null;
  }

  // const isInCategories = selectedNode in graphData.categories;
  const isInPages = selectedNode in graphData.pages;
  const classification = graphData.classification[selectedNode];
  const hasClassification =
    classification?.has_quantum_relationship !== undefined;
  const hasChildren =
    (graphData.categories[selectedNode]?.length ?? 0) > 0 ||
    (graphData.pages[selectedNode]?.length ?? 0) > 0;

  // Determine node type
  let nodeType: "concept" | "category" | "category_and_concept";
  if (hasClassification && hasChildren) {
    nodeType = "category_and_concept";
  } else if (hasClassification) {
    nodeType = "concept";
  } else {
    nodeType = "category";
  }

  return (
    <div className="w-96 bg-white border-l border-neutral-200 overflow-y-auto flex flex-col">
      <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black truncate">
          {selectedNode.replace(/_/g, " ")}
        </h3>
        <div className="flex items-center gap-2">
          {(nodeType === "category" || nodeType === "category_and_concept") && (
            <button
              onClick={() => setRootNode(selectedNode)}
              className="px-3 py-1 text-sm font-medium text-primary-700 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors"
            >
              Make Root
            </button>
          )}
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1 rounded-full hover:bg-neutral-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-900 mb-1">
            Node Type:
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-primary-100 text-black text-sm font-medium rounded-full">
              {nodeType.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Show Wikipedia link and quantum classification only for concepts or category_and_concept nodes */}
        {(nodeType === "concept" || nodeType === "category_and_concept") && (
          <>
            {/* Show Wikipedia link if it's a page */}
            {isInPages && (
              <div className="mb-4">
                <p className="text-sm font-medium text-neutral-900 mb-1">
                  Wikipedia Page:
                </p>
                <a
                  href={`https://en.wikipedia.org/wiki/${selectedNode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:text-primary-800 flex items-center gap-2"
                >
                  <div className="w-5 h-5 relative">
                    <Image
                      src="/wiki-logo.png"
                      alt="Wikipedia"
                      fill
                      className="object-contain"
                    />
                  </div>
                  View on Wikipedia
                </a>
              </div>
            )}

            {/* Classification Info */}
            <div className="mt-2">
              <h4 className="text-base font-medium text-neutral-900 mb-2">
                Quantum Classification
              </h4>

              {classification ? (
                <div className="space-y-4">
                  <div>
                    <div
                      className={`p-3 rounded-lg ${
                        classification.has_quantum_relationship
                          ? "bg-green-50 border border-green-200"
                          : "bg-neutral-50 border border-neutral-200"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          classification.has_quantum_relationship
                            ? "text-green-800"
                            : "text-neutral-900"
                        }`}
                      >
                        {classification.has_quantum_relationship
                          ? "Has quantum relationship"
                          : "No quantum relationship identified"}
                      </p>
                    </div>
                  </div>

                  {classification.has_quantum_relationship &&
                    classification.matches &&
                    classification.matches.length > 0 && (
                      <div>
                        <h4 className="text-base font-medium text-neutral-900 mb-2">
                          Reference Classifications
                        </h4>
                        <div className="space-y-3">
                          {classification.matches.map((match, index) => (
                            <div
                              key={index}
                              className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg"
                            >
                              {/* Relationship Type with improved visibility */}
                              <div className="mb-2">
                                <span className="inline-block px-2 py-0.5 bg-primary-100 text-black text-xs font-semibold rounded-full italic">
                                  {match.relationship_type.replace(/_/g, " ")}
                                </span>
                              </div>

                              {/* Paper Title and Authors */}
                              <div className="mb-2">
                                <h5 className="text-sm font-semibold text-neutral-900">
                                  {match.paper.title}
                                </h5>
                                <p className="text-sm text-neutral-600 mt-1">
                                  {match.paper.authors
                                    .map((a) => a.name)
                                    .join(", ")}{" "}
                                  ({match.paper.year})
                                </p>
                              </div>

                              {/* Paper URL if available */}
                              {match.paper.url && (
                                <div className="mb-2">
                                  <a
                                    href={match.paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-700 hover:text-primary-800 flex items-center gap-2"
                                  >
                                    <div className="w-5 h-5 relative">
                                      <Image
                                        src="/arxiv-logo.png"
                                        alt="arXiv"
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    View paper
                                  </a>
                                </div>
                              )}

                              <p className="text-sm text-neutral-900 line-clamp-4">
                                {match.classification_explanation.length > 250
                                  ? `${match.classification_explanation.substring(0, 250)}...`
                                  : match.classification_explanation}
                              </p>
                              {match.classification_explanation.length >
                                250 && (
                                <details className="mt-2">
                                  <summary className="text-sm text-primary-700 cursor-pointer">
                                    Read more
                                  </summary>
                                  <p className="mt-2 text-sm text-neutral-900">
                                    {match.classification_explanation}
                                  </p>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-lg">
                  <p className="text-neutral-900">
                    {classification && typeof classification === "object"
                      ? (() => {
                          const typedClassification = classification as { 
                            has_quantum_relationship: boolean; 
                            matches?: { length: number }[] 
                          };
                          return typedClassification.has_quantum_relationship &&
                            (!typedClassification.matches || typedClassification.matches.length === 0)
                            ? "Has quantum relationship but no detailed classification data available."
                            : "No quantum relationship identified for this node.";
                        })()
                      : "No quantum classification data available for this node."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
