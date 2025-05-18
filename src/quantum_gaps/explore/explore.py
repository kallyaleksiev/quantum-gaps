import asyncio
import json
import pickle
import time
from collections import deque
from datetime import datetime
from functools import partial
from pathlib import Path

import logfire
import wikipediaapi
from tqdm import tqdm

from quantum_gaps.explore.config import WikiCSSHDataLoader
from quantum_gaps.explore.logging import tqdm_safe_log
from quantum_gaps.search import get_matches
from quantum_gaps.search.types import QuantumisationClassificationOutput

# Configure logfire -- set LOGFIRE_CONSOLE=false to disable console output
logfire.configure()
wiki_client = wikipediaapi.Wikipedia(
    user_agent="quantum-gaps",
    language="en",
)


def _is_page_irrelevant(page: wikipediaapi.WikipediaPage) -> bool:
    """
    Check if a Wikipedia page is ireelevant for processing. Right now the logic has
    heuristics to check if it's about a person or an organization, or a list of items.
    """
    bad_prefixes = [
        "list_of",
        "list of",
    ]
    title = page.title.lower()
    for p in bad_prefixes:
        if title.startswith(p):
            return True

    categories = page.categories
    person_indicators = [
        "birth",
        "death",
        "people",
        "person",
        "biography",
        "births",
        "deaths",
    ]
    org_indicators = [
        "organization",
        "organisation",
        "company",
        "institution",
        "corporation",
        "associations",
    ]

    for cat_name in categories:
        cat_lower = cat_name.lower()
        # Check if any person indicator is in the category name
        if any(ind in cat_lower for ind in person_indicators):
            return True
        # Check if any organization indicator is in the category name
        if any(ind in cat_lower for ind in org_indicators):
            return True

    return False


async def explore_category(
    category: str,
    exploration_state: dict[str, QuantumisationClassificationOutput],
    in_progress: set,
    max_concurrent: int = 10,
    tlog=None,
    wiki_cssh_data_dir: str | None = None,
) -> bool:
    """
    Return true and explore the category if it is quantumised or worth exploring,
    e.g. it has no pages; return false and stop exploring otherwise
    """
    log_info = tlog or logfire.info
    log_debug = tlog or logfire.debug
    wiki_cssh_loader = WikiCSSHDataLoader(wiki_cssh_data_dir)

    log_info(f"Exploring category: {category}")
    pages = wiki_cssh_loader.page_tree.get(category, [])

    if category in exploration_state and not exploration_state[category].has_quantum_relationship:
        log_info(f"Skipping category - already known to be non-quantumised: {category}")
        return False

    if not pages:
        log_info(f"Category has no pages, continuing exploration: {category}")
        return True

    # Convert pages to a list if it's a set
    pages_list = list(pages)

    log_info(f"Category {category} has {len(pages_list)} pages to explore")

    # Create a lock for safe state updates
    state_lock = asyncio.Lock()

    # Define a safe wrapper for explore_page that uses the lock
    async def safe_explore_page(page_title):
        result = await _explore_page_internal(
            page_title,
            exploration_state,
            in_progress,
            state_lock,
            tlog=tlog,
        )
        return result

    # Process pages in batches to control concurrency
    for i in range(0, len(pages_list), max_concurrent):
        batch = pages_list[i : i + max_concurrent]
        log_debug(f"Processing batch of {len(batch)} pages from category {category}")
        # Process this batch concurrently
        await asyncio.gather(*[safe_explore_page(page) for page in batch])

    return True


async def _explore_page_internal(
    page_title: str,
    exploration_state: dict[str, QuantumisationClassificationOutput],
    in_progress: set,
    state_lock: asyncio.Lock,
    initial_filter: bool = True,
    tlog=None,
) -> None:
    """
    Explore the page and modify the state accordingly.
    This is the internal implementation that is called by the wrapper.
    """
    log_info = tlog or logfire.info
    log_debug = tlog or logfire.debug
    log_warn = tlog or logfire.warning

    async with state_lock:
        if page_title in exploration_state or page_title in in_progress:
            log_debug(f"Page already explored or in progress, skipping: {page_title}")
            return
        in_progress.add(page_title)

    try:
        # Step 1: Get the wikipedia page and the summary
        log_info(f"Fetching Wikipedia page: {page_title}")
        page = wiki_client.page(page_title)
        if not page.exists():
            # if the page does not exist, no state needs to be updated
            log_warn(f"Page does not exist: {page_title}")
            return

        summary = page.summary
        log_debug(f"Got page summary for {page_title} with length {len(summary)}")

        # Step 2: Call the search procedure (determine if you want to filter quickly first)
        if initial_filter:
            # Use the category-based filtering instead of LLM
            is_irrelevant = _is_page_irrelevant(page)
            if is_irrelevant:
                # No need to keep exploring if this is the case
                log_info(f"Page filtered out as irrelevant: {page_title}")
                exploration_state[page_title] = (
                    QuantumisationClassificationOutput(  # OK for now but I actually think irrelevant inputs should not appear in the state at all
                        matches=[],
                        has_quantum_relationship=False,
                        concept=page_title,
                        concept_summary=summary,
                    )
                )
                return

        log_info(f"Searching for quantum equivalent for: {page_title}")

        # Step 3: Get the matches and the final result
        matches = await get_matches(page_title, summary)

        result = QuantumisationClassificationOutput(
            matches=matches,
            has_quantum_relationship=any(match.has_quantum_relationship for match in matches),
            concept=page_title,
            concept_summary=summary,
        )
        log_info(
            f"Search complete for page {page_title}: has_quantum_relationship={result.has_quantum_relationship}"
        )

        exploration_state[page_title] = result
    finally:
        # Make sure we remove from in_progress even if there's an error
        async with state_lock:
            if page_title in in_progress:  # Check in case it was removed elsewhere
                in_progress.remove(page_title)


async def bfs_explore_categories(
    start_category: str,
    max_concurrent_pages: int = 5,
    max_concurrent_categories: int = 3,
    output_dir: Path | None = None,
    exploration_state: dict[str, QuantumisationClassificationOutput] = {},
    wiki_cssh_data_dir: str | None = None,
) -> dict[str, QuantumisationClassificationOutput]:
    """
    Perform BFS exploration of categories starting from the given category.
    Only explores children of categories that don't have quantum gaps.
    """
    wiki_cssh_loader = WikiCSSHDataLoader(wiki_cssh_data_dir)
    queue = deque([start_category])
    visited = set()
    in_progress = set()  # Create a single in_progress set for the whole BFS
    state_lock = asyncio.Lock()
    visited_lock = asyncio.Lock()  # Dedicated lock for visited set operations

    # Create a timestamp and run ID for this exploration
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"{start_category.replace('/', '_')}_{timestamp}"

    # Count reachable categories from the start category with BFS
    def count_reachable_categories(start):
        to_visit = deque([start])
        counted = set([start])

        while to_visit:
            current = to_visit.popleft()
            children = wiki_cssh_loader.category_tree.get(current, [])
            for child in children:
                if child not in counted:
                    counted.add(child)
                    to_visit.append(child)

        return len(counted)

    total_categories = count_reachable_categories(start_category)

    # Configure tqdm and logging stuff
    pbar = tqdm(total=total_categories, desc="Exploring categories")

    tlog_info = partial(tqdm_safe_log, level="info")
    tlog_debug = partial(tqdm_safe_log, level="debug")
    tlog_error = partial(tqdm_safe_log, level="error")

    tlog_info(f"Starting BFS exploration from {start_category} with {total_categories} reachable categories")

    # Setup output directory
    if output_dir is None:
        output_dir = Path(__file__).parent / "results"

    # Create a dedicated directory for this run
    run_dir = output_dir / run_id
    run_dir.mkdir(exist_ok=True, parents=True)

    # Function to extract the subtree from category_tree
    def extract_subtree(start_cat):
        subtree = {}
        queue = deque([start_cat])

        while queue:
            current = queue.popleft()
            if current in wiki_cssh_loader.category_tree:
                # Convert set to list for JSON serialization
                subtree[current] = list(wiki_cssh_loader.category_tree[current])
                for child in subtree[current]:
                    if child not in subtree:
                        queue.append(child)

        return subtree

    try:
        last_save_time = time.time()

        async def process_category(category):
            nonlocal last_save_time

            # Use lock to check and update visited atomically
            async with visited_lock:
                if category in visited:
                    return []
                # Mark as visited before processing to avoid duplicates
                visited.add(category)

            keep_exploring = await explore_category(
                category, exploration_state, in_progress, max_concurrent=max_concurrent_pages, tlog=tlog_info
            )

            # Update progress
            pbar.update(1)
            async with state_lock:
                pbar.set_postfix({
                    "queue": len(queue),
                    "visited": len(visited),
                    "state": len(exploration_state),
                })

            # Periodically save state (only one task should do this at a time)
            async with state_lock:
                if time.time() - last_save_time > 300:  # 300 seconds = 5 minutes
                    save_path = run_dir / "classification_interim.pkl"
                    tlog_info(f"Saving interim state to {save_path} with {len(exploration_state)} entries")
                    with open(save_path, "wb") as f:
                        pickle.dump(exploration_state, f)
                    last_save_time = time.time()

            # Return new categories to explore if needed
            if keep_exploring:
                children = wiki_cssh_loader.category_tree.get(category, [])
                tlog_debug(f"Adding {len(children)} children to queue for category {category}")

                # Filter children not yet visited, using lock for safety
                async with visited_lock:
                    return [child for child in children if child not in visited]
            return []

        while queue:
            # Process up to max_concurrent_categories at once
            current_batch = []
            for _ in range(min(max_concurrent_categories, len(queue))):
                if queue:
                    current_batch.append(queue.popleft())

            # Process this batch of categories concurrently
            new_categories_lists = await asyncio.gather(*[process_category(cat) for cat in current_batch])

            # Add new categories to the queue, with proper locking
            for new_cats in new_categories_lists:
                for cat in new_cats:
                    async with visited_lock:
                        # Double-check that it's still not visited before adding to queue
                        if cat not in visited:
                            queue.append(cat)

    except Exception as e:
        tlog_error(f"Error during exploration: {str(e)}")
        # Save what we have so far in case of error
        error_save_path = run_dir / "classification_error.pkl"
        with open(error_save_path, "wb") as f:
            pickle.dump(exploration_state, f)
        raise
    finally:
        pbar.close()

    tlog_info(
        f"Exploration complete: explored {len(visited)} categories with {len(exploration_state)} entries in state"
    )

    # Save final state as pickle (for backward compatibility)
    final_save_path = run_dir / "classification.pkl"
    tlog_info(f"Saving final state to {final_save_path}")
    with open(final_save_path, "wb") as f:
        pickle.dump(exploration_state, f)

    # Convert to JSON for better interoperability
    try:
        json_state = {key: value.model_dump() for key, value in exploration_state.items()}
        with open(run_dir / "classification.json", "w") as f:
            json.dump(json_state, f, indent=4)
    except Exception as e:
        tlog_error(f"Error converting classification to JSON: {e}")

    # Save pages tree (sets converted to lists)
    pages_json = {category: list(pages) for category, pages in wiki_cssh_loader.page_tree.items()}
    with open(run_dir / "pages.json", "w") as f:
        json.dump(pages_json, f, indent=4)

    # Save the explored subtree of categories (sets converted to lists)
    category_subtree = extract_subtree(start_category)
    with open(run_dir / "category.json", "w") as f:
        json.dump(category_subtree, f, indent=4)

    tlog_info(f"All data saved to directory: {run_dir}")

    return exploration_state
