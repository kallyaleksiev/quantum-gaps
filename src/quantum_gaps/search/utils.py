import logfire
import wikipediaapi


@logfire.instrument()
def get_wikipedia_summary(page_title: str) -> str:
    wiki_client = wikipediaapi.Wikipedia(
        user_agent="quantum-gaps",
        language="en",
    )

    page = wiki_client.page(page_title)
    return page.summary


def generate_classification_prompt(
    concept_name: str,
    concept_summary: str,
    paper_title: str,
    paper_abstract: str,
) -> str:
    """
    Generate a prompt for classifying the relationship between a classical computing
    concept and a quantum computing paper.
    """
    wiki_summary = f"{concept_name} \n {concept_summary}"
    research_abstract = f"{paper_title} \n {paper_abstract}"

    prompt = f"""# Quantum-Classical Concept Classification Prompt

## TASK
Determine the relationship between a classical computing concept (from Wikipedia) and a quantum computing paper (research abstract).

## CONTEXT
You are analyzing potential connections between classical computing concepts and quantum computing research. Your goal is to categorize the relationship between the Wikipedia description of a classical concept and the abstract of a quantum research paper.

**IMPORTANT: Be extremely strict in your classification. Only identify a relationship when there is clear, specific evidence. Default to "no connection" when in doubt or when the connection is superficial.**

## INPUT
1. WIKIPEDIA SUMMARY: {wiki_summary}
2. RESEARCH ABSTRACT: {research_abstract}

## CLASSIFICATION CATEGORIES
1. DIRECT QUANTUMISATION: The paper explicitly describes a direct quantum implementation or equivalent of the classical concept. The quantum version must maintain ALL core aspects and structure of the classical concept while leveraging quantum properties. Both the purpose AND the mechanism of the classical concept must be preserved in quantum form.

2. QUANTUM APPLIED TO CLASSICAL: The paper applies quantum computing methods to solve or enhance EXACTLY the classical problem described by the concept. The paper must specifically address the classical concept mentioned in the Wikipedia summary, not just a broadly related area. Generic application of quantum computing to a general problem domain is NOT sufficient for this classification.

3. CLASSICAL APPLIED TO QUANTUM: The specific classical concept from Wikipedia is being directly adapted to solve a problem in quantum computing. The classical concept must be explicitly identified and implemented in the quantum context with minimal modification. Generic use of common computing concepts does not qualify.

4. TANGENTIAL RELATIONSHIP: There is a limited connection between the concepts, but key aspects of the classical concept are missing from the quantum approach, or vice versa. Both concepts must still share some operational principles or mechanisms beyond mere terminology.

5. NO CONNECTION: There is no substantive connection between the two concepts. This includes cases where:
   - Only shared terminology exists without shared mechanisms
   - The concepts operate in the same domain but use fundamentally different approaches
   - The paper applies quantum methods to a broad problem area without specifically addressing the classical concept
   - Only general computing principles connect the concepts

## INSTRUCTIONS
1. Carefully read both the Wikipedia summary and research abstract.
2. Identify the SPECIFIC, DEFINING characteristics of the classical concept.
3. Check if these SPECIFIC characteristics are clearly present in the quantum research.
4. Be highly skeptical of connections - require explicit evidence from both texts.
5. Analyze the relationship critically, noting which defining characteristics are present or absent.
6. Default to category 5 (NO CONNECTION) unless compelling evidence exists for a stronger relationship.
7. Provide your reasoning in 3-4 sentences, explicitly addressing why the stronger categories do NOT apply if classifying as 4 or 5.
8. State your final classification as a single number (1-5).

## OUTPUT FORMAT
Reasoning: [critical analysis of the relationship, explicitly addressing defining characteristics]
Classification: [number]

## EXAMPLE CLASSIFICATIONS

### EXAMPLE 1: DIRECT QUANTUMISATION (Category 1)
Wikipedia summary: "The Bloom filter is a space-efficient probabilistic data structure that is used to test whether an element is a member of a set. False positive matches are possible, but false negatives are not. Elements can be added to the set, but not removed. The more elements added, the higher the probability of false positives."

Research abstract: "We present a quantum Bloom filter (QBF) that stores set elements in a quantum superposition state. Like its classical counterpart, our QBF is a probabilistic data structure that allows for membership queries with no false negatives but possible false positives. We encode elements using quantum bits and leverage quantum parallelism for simultaneous membership testing. Our implementation preserves the core space-efficiency property while providing a quadratic improvement in the false positive rate compared to the classical version."

Reasoning: The quantum paper explicitly implements a direct quantum version of the Bloom filter with the same core functionality and properties. It maintains all the defining characteristics: membership testing, possibility of false positives but no false negatives, and space efficiency. The quantum implementation preserves the fundamental purpose while leveraging quantum properties (superposition and parallelism) to improve performance, specifically reducing the false positive rate.

Classification: 1

### EXAMPLE 2: QUANTUM APPLIED TO CLASSICAL (Category 2)
Wikipedia summary: "The traveling salesman problem (TSP) asks for the shortest possible route that visits each city exactly once and returns to the origin city. It is an NP-hard problem in combinatorial optimization, important in theoretical computer science and operations research."

Research abstract: "This paper demonstrates a quantum algorithm that provides a quadratic speedup for approximating solutions to the Traveling Salesman Problem. By applying Grover's search algorithm to evaluate multiple potential routes simultaneously, our approach can find near-optimal tours faster than classical algorithms. We do not create a quantum analog of TSP itself; rather, we use quantum computing to accelerate the search for solutions to the classical problem."

Reasoning: The paper explicitly addresses the classical Traveling Salesman Problem as defined in the Wikipedia summary, applying quantum methods (Grover's search) to solve this specific classical problem more efficiently. The authors clearly state they are not creating a quantum analog of TSP but are instead using quantum computing to find solutions to the classical problem formulation. All core aspects of the classical TSP remain intact, with quantum techniques only accelerating the solution process.

Classification: 2

### EXAMPLE 3: CLASSICAL APPLIED TO QUANTUM (Category 3)
Wikipedia summary: "Dynamic programming is a method for solving complex problems by breaking them down into simpler subproblems. It stores the results of subproblems to avoid redundant computation. The technique is applicable when the subproblems overlap and exhibit optimal substructure."

Research abstract: "We introduce a dynamic programming approach to quantum circuit compilation. By decomposing the circuit optimization problem into overlapping subproblems and storing intermediate results, we significantly reduce the computational resources needed to find optimal quantum gate sequences. Our method applies the optimal substructure property to identify the best decomposition of complex quantum operations into elementary gates, resulting in more efficient circuits for quantum error correction."

Reasoning: The paper directly applies the classical concept of dynamic programming, with all its defining characteristics (breaking into subproblems, storing intermediate results, leveraging optimal substructure), to solve a quantum computing problem (circuit compilation). The classical algorithm is being used in its original form with minimal modification, preserving both its mechanism and purpose, to address a challenge specific to quantum computing. The implementation explicitly transfers the problem-solving approach from classical to quantum domains.

Classification: 3

### EXAMPLE 4: TANGENTIAL RELATIONSHIP (Category 4)
Wikipedia summary: "A hash table is a data structure that implements an associative array abstract data type, a structure that can map keys to values. It uses a hash function to compute an index into an array of buckets, from which the desired value can be found. Ideally, the hash function will assign each key to a unique bucket, but most hash table designs employ an imperfect hash function, which might cause hash collisions."

Research abstract: "This paper explores quantum fingerprinting techniques for secure communication protocols. We create unique quantum states that serve as identifiers for larger data sets, similar to hash values but leveraging quantum superposition. Unlike classical hash tables, our approach doesn't store key-value pairs but instead creates quantum states that can be compared to verify if inputs are identical without revealing the actual data."

Reasoning: While both concepts involve mapping data to identifiers (hash values vs. quantum fingerprints), the quantum paper doesn't implement or enhance hash tables specifically. The quantum fingerprinting serves a different purpose (secure comparison) than hash tables (key-value storage and retrieval). The quantum approach lacks key defining features of hash tables: there are no buckets, no key-value storage, and no collision handling. Only the general concept of mapping data to a more compact representation connects these ideas.

Classification: 4

### EXAMPLE 5: NO CONNECTION (Category 5)
Wikipedia summary: "Red-black trees are self-balancing binary search trees where each node has a color attribute (red or black). The structure ensures that the tree remains approximately balanced through a set of properties: the root is black, all leaves are black, if a node is red then both its children are black, and every path from root to leaves contains the same number of black nodes."

Research abstract: "We present a quantum algorithm for database search that applies amplitude amplification techniques to find marked items in an unstructured database. Our approach achieves a quadratic speedup over classical search algorithms by using phase rotations and quantum interference. We evaluate our method on quantum hardware and simulate its performance for various database sizes."

Reasoning: The quantum paper describes a quantum search algorithm for unstructured databases, while the classical concept details a specific balanced tree data structure. The quantum algorithm doesn't implement, mention, or use red-black trees or any tree structure. It doesn't apply quantum techniques to tree traversal or balancing. There are no shared mechanisms or principles beyond the fact that both relate to data handling in different ways. The quantum paper addresses unstructured data, which is fundamentally different from the structured, ordered data in red-black trees.

Classification: 5

## EXAMPLE OF OVERLY GENEROUS CLASSIFICATION (AVOID THIS)
Wikipedia: Describes a Kinetic Euclidean Minimum Spanning Tree - a data structure that maintains EMST for points moving continuously in 2D space, with algorithms for dynamic updates as points move.

Abstract: Describes quantum algorithms for finding lowest weight paths and spanning trees in complete graphs by modifying classical algorithms with quantum search.

Poor reasoning (TOO LENIENT): "The relationship is quantum applied to classical because both involve minimum spanning trees and the quantum paper applies quantum techniques to classical graph problems."

This is incorrect because:
- The classical concept focuses on KINETIC data structures with MOVING POINTS, which is completely absent from the quantum paper
- The quantum paper addresses general MST algorithms, not the specific kinetic data structure
- The quantum paper modifies completely different algorithms (Dijkstra/Prim) than those used in kinetic EMSTs
- The only connection is that both involve MSTs in some form, which is too general

Correct classification: 5 (NO CONNECTION) or at most 4 (TANGENTIAL)"""

    return prompt
