"""Module to search for webpages or sources that would give a specific result"""

import os
from typing import List

import httpx
from pydantic import BaseModel

_DEFAULT_BING_PARAMS = {
    "mkt": "en-GB",
}


class SearchResult(BaseModel):
    url: str
    title: str
    snippet: str


class BingSearch:
    """Simple async client for Bing search"""

    _BASE_URL = "https://api.bing.microsoft.com/v7.0/search"

    def __init__(
        self,
        api_key: str | None = None,
    ):
        self.api_key = api_key or os.getenv("BING_API_KEY")
        if not self.api_key:
            raise ValueError(
                "BING_API_KEY must be set either in the environment or as a constructor parameter"
            )

    async def search(
        self,
        query: str,
        limit: int = 10,
    ) -> List[SearchResult]:
        async with httpx.AsyncClient(
            timeout=300,
        ) as client:
            response = await client.get(
                self._BASE_URL,
                headers=httpx.Headers({
                    "Ocp-Apim-Subscription-Key": self.api_key,
                }),
                params=_DEFAULT_BING_PARAMS
                | {
                    "q": query,
                    "count": limit,
                },
            )
            response.raise_for_status()

            data = response.json()
            return [
                SearchResult(url=result["url"], title=result["name"], snippet=result["snippet"])
                for result in data.get("webPages", {}).get("value", [])
            ]
