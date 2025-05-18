import asyncio
from pathlib import Path

import click

from quantum_gaps.explore import bfs_explore_categories


async def run_exploration(start_category, max_concurrent_pages, max_concurrent_categories, output_dir):
    exploration_state = await bfs_explore_categories(
        start_category,
        max_concurrent_pages=max_concurrent_pages,
        max_concurrent_categories=max_concurrent_categories,
        output_dir=Path(output_dir),
    )
    print(exploration_state)


@click.command()
@click.option("--start-category", default="<ROOT>", help="Starting category for exploration")
@click.option("--max-concurrent-pages", default=3, type=int, help="Maximum concurrent pages to process")
@click.option(
    "--max-concurrent-categories", default=2, type=int, help="Maximum concurrent categories to process"
)
@click.option("--output-dir", default="./results", help="Directory to save output files")
def main(start_category, max_concurrent_pages, max_concurrent_categories, output_dir):
    """Run BFS exploration of Wikipedia categories."""
    asyncio.run(run_exploration(start_category, max_concurrent_pages, max_concurrent_categories, output_dir))


if __name__ == "__main__":
    main(auto_envvar_prefix="QGC")
