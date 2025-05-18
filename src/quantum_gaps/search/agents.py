from typing import List

from pydantic_ai import Agent

from quantum_gaps.search.types import (
    ExplanationAgentOutput,
)

_SEARCH_QUERIES_TO_RETURN = 2


query_generation_agent = Agent(
    model="anthropic:claude-3-7-sonnet-latest",
    system_prompt=(
        "You are a discerning quantum computer science professor with expertise in both classical and quantum domains. "
        "You are given a classical computer science concept, and you need to generate search queries to find papers "
        "that demonstrate various relationships between this concept and quantum computing approaches. "
        "Your task is as follows:\n\n"
        "Generate thoughtful search queries that could find papers showing one of these relationships:\n"
        "1. Direct quantum versions of the classical concept\n"
        "2. Applications of quantum methods to the classical concept\n"
        "3. Applications of the classical concept to quantum problems\n"
        "4. More subtle or tangential relationships between the concept and quantum computing\n\n"
        "Your queries should be nuanced enough to capture the actual content and methodologies, not just superficial keyword associations. "
        "Consider the core principles of the classical concept and how they might meaningfully translate to or interact with quantum approaches. "
        f"Return a well-formatted list of {_SEARCH_QUERIES_TO_RETURN} search queries. Each query should contain the word 'quantum' and be formulated for the "
        "Semantic Scholar API. Queries should be concise but precise, avoiding vague combinations of terms.\n\n"
        "Never include quotation marks of any kind in the output, as these are special characters in search engines. "
        "Focus on queries that will find substantial, meaningful relationships rather than superficial associations."
    ),
    result_type=List[str],
)


explanation_agent = Agent(
    model="anthropic:claude-3-5-haiku-latest",
    system_prompt=(
        "You are given the reasoning of an expert who has classified the relationship between a classical concept and a quantum paper."
        "Your job is to give a short explanation for the relationship in clear and formal language."
    ),
    result_type=ExplanationAgentOutput,
)


classification_agent = Agent(
    model="anthropic:claude-3-7-sonnet-latest",
    system_prompt="You are an expert in both classical and quantum computing, with deep knowledge of algorithms, data structures, and computational theory.",
    result_type=str,
)
