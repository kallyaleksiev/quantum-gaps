import asyncio
import re

import httpx
import logfire
from bs4 import BeautifulSoup
from pydantic_ai.settings import ModelSettings

from quantum_gaps.search.agents import (
    classification_agent,
    explanation_agent,
    query_generation_agent,
)
from quantum_gaps.search.bing_search import BingSearch
from quantum_gaps.search.types import (
    Author,
    Match,
    ScholarPaper,
)
from quantum_gaps.search.utils import generate_classification_prompt

_QUOTATION_MARKS_TO_REPLACE = [
    '"',
    "“",
    "”",
    "'",
    "`",
    "’",
    "‘",
]


class ArxivPaperParser:
    """Parser for extracting paper information from arXiv HTML pages."""

    @staticmethod
    async def fetch_arxiv_page(url: str, timeout: float = 30.0) -> str:
        """Fetch the HTML content of an arXiv page

        This automatically tries to do some heuristics like converting pdf and html components
        to abs so that we point to the arxiv lanfing page for that paper.
        """
        arxiv_abs_url = url.replace("/pdf/", "/abs/").replace("/html/", "/abs/")
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(arxiv_abs_url)
            response.raise_for_status()
            return response.text

    @staticmethod
    def parse_arxiv_html(html_content: str) -> dict:
        """Parse arXiv HTML to extract paper information

        This assume that we are at a arxiv landing page and we try to parse literally according
        to what the html structure looks like
        """
        soup = BeautifulSoup(html_content, "html.parser")

        title_elem = soup.select_one(".title.mathjax")
        title = title_elem.text.replace("Title:", "").strip() if title_elem else "Unknown Title"

        authors = []
        authors_elem = soup.select_one(".authors")
        if authors_elem:
            author_links = authors_elem.select("a")
            for author_link in author_links:
                author_name = author_link.text.strip()
                if author_name and not author_name.startswith("("):
                    authors.append(Author(name=author_name))

        abstract_elem = soup.select_one("blockquote.abstract.mathjax")
        abstract = abstract_elem.text.replace("Abstract:", "").strip() if abstract_elem else None

        year = None
        dateline = soup.select_one(".dateline")
        if dateline:
            # Look for year in the format [Submitted on DD MMM YYYY]
            year_match = re.search(r"Submitted on .* (\d{4})", dateline.text)
            if year_match:
                year = int(year_match.group(1))

        return {
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "year": year,
        }


@logfire.instrument()
async def search_papers_semantic_arxiv(
    query: str,
    limit: int = 10,
    timeout: float = 30.0,
) -> list[ScholarPaper]:
    """
    Search for academic papers using Bing API and return structured results from arxiv.org.
    """
    # 1. Remove quotation marks from the query (because they force the surrounded string to be present in results)
    clean_query = query.translate(str.maketrans("", "", "".join(_QUOTATION_MARKS_TO_REPLACE)))

    # 2. Append site:arxiv.org to search solely in arxiv
    arxiv_query = f"{clean_query} site:arxiv.org"
    bing_client = BingSearch()
    search_results = await bing_client.search(arxiv_query, limit=limit)

    # 3. Process results concurrently
    async def process_result(result):
        assert "arxiv.org" in result.url, "We should only be searching arxiv.org"
        try:
            html_content = await ArxivPaperParser.fetch_arxiv_page(result.url, timeout)
            paper_info = ArxivPaperParser.parse_arxiv_html(html_content)

            return {"success": True, "result": result, "paper_info": paper_info}
        except Exception as e:
            logfire.error(f"Failed to parse paper from {result.url}: {e}")
            return {"success": False, "result": result, "error": str(e)}

    processing_results = await asyncio.gather(*[process_result(result) for result in search_results])

    # 4. Collect and deduplicate the processed results
    papers = []
    seen_titles = set()  # Track already seen titles

    for proc_result in processing_results:
        result = proc_result["result"]

        if proc_result["success"]:
            paper_info = proc_result["paper_info"]

            if paper_info["title"] in seen_titles:
                logfire.info(f"Skipping duplicate paper: {paper_info['title']}")
                continue

            seen_titles.add(paper_info["title"])

            paper = ScholarPaper(
                title=paper_info["title"],
                authors=paper_info["authors"] if paper_info["authors"] else [Author(name="Unknown")],
                url=result.url,
                abstract=paper_info["abstract"] if paper_info["abstract"] else result.snippet,
                year=paper_info["year"],
            )
            papers.append(paper)
            logfire.info(f"Successfully parsed paper: {paper.title}")
        else:
            # Fallback parsing for failed results
            try:
                title = result.title
                # Remove "arXiv:" or "[PDF]" prefixes and other common elements
                title = re.sub(r"^\[PDF\]|\[v\d+\]|arXiv:[\d\.]+\s*|\s*$", "", title).strip()

                # Skip papers with duplicate titles
                if title in seen_titles:
                    logfire.info(f"Skipping duplicate paper (fallback): {title}")
                    continue

                seen_titles.add(title)

                paper = ScholarPaper(
                    title=title,
                    authors=[Author(name="Unknown")],
                    url=result.url,
                    abstract=result.snippet,
                    year=None,
                )
                papers.append(paper)
                logfire.info(f"Used fallback parser for paper: {paper.title}")
            except Exception as e2:
                logfire.error(f"Also failed with fallback parsing for {result.url}: {e2}")
                continue

    return papers


@logfire.instrument()
async def find_unique_papers(
    concept: str,
    context_text: str | None = None,
    papers_per_query: int = 3,
) -> list[ScholarPaper]:
    """Find unique papers related to a concept by generating search queries and searching arXiv.

    Args:
        concept: The classical computer science concept to find quantum equivalents for
        context_text: Additional context about the concept, to be used by agent to generate queries
        papers_per_query: Number of papers to fetch per search query

    Returns:
        List of unique papers found across all search queries
    """
    logfire.info(f"Generating search queries for concept: {concept}")
    search_queries_result = await query_generation_agent.run(
        (
            "Generate search queries for finding quantum equivalents "
            f"of the classical computer science concept: {concept}\n\n"
            f"Context: {context_text}"
        )
    )
    search_queries = search_queries_result.data

    logfire.info(f"Generated {len(search_queries)} search queries", search_queries=search_queries)

    # Get relevant papers from Bing search on arxiv.org
    all_papers = []
    search_tasks = [search_papers_semantic_arxiv(query, limit=papers_per_query) for query in search_queries]

    try:
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        for query, papers_or_error in zip(search_queries, results):
            if isinstance(papers_or_error, Exception):
                logfire.error(f"Error searching for papers with query '{query}': {papers_or_error}")
                continue
            logfire.info(f"Found {len(papers_or_error)} papers for query: {query}")
            all_papers.extend(papers_or_error)
    except Exception as e:
        logfire.error(f"Error in concurrent paper search: {e}")

    # Remove duplicates by title
    unique_papers = list({paper.title: paper for paper in all_papers}.values())
    logfire.info(f"Found {len(unique_papers)} unique papers across all queries")

    return unique_papers


@logfire.instrument()
async def classify_paper(
    concept: str,
    concept_summary: str,
    paper: ScholarPaper,
) -> Match:
    """
    Process a single classification for a pair of (classical concept, quantum paper)
    and return a structured Match object signifying the relationship.
    """

    # Get classification from classifier
    classification_prompt = generate_classification_prompt(
        concept,
        concept_summary,
        paper.title,
        paper.abstract,
    )

    classification_res = await classification_agent.run(
        classification_prompt,
        model_settings=ModelSettings(
            max_tokens=1000,
            temperature=0,
        ),
    )
    classification_output = classification_res.data

    # Get explanation and relationship type from explanation agent
    explanation_res = await explanation_agent.run(classification_output)

    explanation_output = explanation_res.data

    return Match(
        concept=concept,
        relationship_type=explanation_output.relationship_type,
        concept_summary=concept_summary,
        paper=paper,
        classification_reasoning=classification_output,
        classification_explanation=explanation_output.explanation,
    )


async def classify_papers(concept: str, concept_summary: str, papers: list[ScholarPaper]) -> list[Match]:
    """
    Concurrent `classify_paper` for multiple papers.
    """
    return await asyncio.gather(*[classify_paper(concept, concept_summary, paper) for paper in papers])


@logfire.instrument()
async def get_matches(concept: str, concept_summary: str) -> list[Match]:
    """
    Get matches for a concept by finding unique papers and classifying them.
    """
    papers = await find_unique_papers(concept, concept_summary)
    return await classify_papers(concept, concept_summary, papers)
