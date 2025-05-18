import pickle
from pathlib import Path
from typing import Any, Tuple


def load_tree_data(base_dir=None) -> Tuple[dict[str, Any], dict[str, Any]]:
    """
    Loads the category and page tree pickle files from a WikiCSSH directory.
    """
    wiki_dir = Path(base_dir or Path(__file__).parent) / "WikiCSSH"
    with open(wiki_dir / "category_tree.pkl", "rb") as f:
        category_tree = pickle.load(f)
    with open(wiki_dir / "category_pages.pkl", "rb") as f:
        page_tree = pickle.load(f)
    return category_tree, page_tree


class WikiCSSHDataLoader:
    def __init__(
        self,
        data_dir: Path = None,
    ):
        self.data_dir = Path(data_dir or Path(__file__).parent) / "WikiCSSH"
        self._category_tree = None
        self._page_tree = None

    @property
    def category_tree(self):
        if self._category_tree is None:
            with open(self.data_dir / "category_tree.pkl", "rb") as f:
                self._category_tree = pickle.load(f)
        return self._category_tree

    @property
    def page_tree(self):
        if self._page_tree is None:
            with open(self.data_dir / "category_pages.pkl", "rb") as f:
                self._page_tree = pickle.load(f)
        return self._page_tree
