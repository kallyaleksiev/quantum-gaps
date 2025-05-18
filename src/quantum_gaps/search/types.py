from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Author(BaseModel):
    name: str


class ScholarPaper(BaseModel):
    title: str
    authors: list[Author]
    year: Optional[int] = None
    url: Optional[str] = None
    abstract: Optional[str] = None


class QuantumClassicalRelationship(str, Enum):
    DIRECT_QUANTUMISATION = "direct_quantumisation"
    """
    A paper that directly translates a classical concept into quantum terms and creates a quantum version.
    Example: Grover's algorithm is a direct quantumisation of classical search algorithms.
    """

    QUANTUM_APPLIED_TO_CLASSICAL = "quantum_applied_to_classical"
    """
    A paper that applies a quantum concept to solve the classical problem.
    Example: Using Grover's algorithm to solve the Travelling Salesman Problem.
    """

    CLASSICAL_APPLIED_TO_QUANTUM = "classical_applied_to_quantum"
    """
    A paper that uses a classical concept and applies it to a quantum problem.
    Example: Using minimal spanning tree algorithms for quantum error correction.
    """

    TANGENTIAL_RELATIONSHIP = "tangential_relationship"
    """
    A paper with a useful but indirect relationship between the classical concept and quantum application.
    Example: An algorithm using disjoint sets for error correction that's tangentially related to classical error correction.
    """

    NO_RELATIONSHIP = "no_relationship"
    """
    A paper with no useful connection to the specified classical concept. (or no relation to quantum computing)
    """


class Match(BaseModel):
    """Output of the relationship analysis between a classical concept and a quantum paper."""

    concept: str
    """The classical concept that was classified"""

    relationship_type: QuantumClassicalRelationship
    """
    The type of relationship between the classical concept and quantum paper.
    """

    concept_summary: str
    """
    A short summary of the classical concept from wikipedia.
    """

    paper: ScholarPaper
    """The quantum paper that was classified"""

    classification_reasoning: str
    """
    Detailed reasoning for the relationship classification, critically analyzing both the classical concept and the quantum paper.
    """

    classification_explanation: str
    """
    A short explanation for the relationship classification in clear and formal language.
    """

    @property
    def has_quantum_relationship(self) -> bool:
        return self.relationship_type != QuantumClassicalRelationship.NO_RELATIONSHIP


class QuantumisationClassificationOutput(BaseModel):
    """Output of a search that tries to find quantum versions or applications of a classical concept

    NOTE: There is no LLM involved for this one, this is constructed from `CConceptQPaperMatchOutput`

    """

    matches: list[Match] = Field(default_factory=list)
    """Papers that have been classified as having a quantum relationship with the classical concept."""

    has_quantum_relationship: bool = Field(default=False)
    """Whether the classical concept has a quantum relationship with any of the papers"""

    concept: str
    """The classical concept that was classified"""

    concept_summary: str
    """A short summary of the classical concept from wikipedia."""


class ExplanationAgentOutput(BaseModel):
    relationship_type: QuantumClassicalRelationship
    """The type of relationship between the classical concept and the quantum paper"""

    explanation: str
    """Explanation for the relationship classification in clear and formal language"""
