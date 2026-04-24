"""Embedding provider abstraction for Coach RAG.

Choices:
  - "bedrock-titan" (default) — Amazon Titan Embeddings V2 via Bedrock.
                                Uses the EC2 IAM role, single AWS bill.
  - "openai" — OpenAI text-embedding-3-small. Requires OPENAI_API_KEY.

Both produce normalized 1024-dim vectors so they can share the same
DB column. Switching providers means re-embedding the corpus.
"""

from __future__ import annotations

import asyncio
import json
from typing import Protocol

from app.config import settings


class EmbeddingUnavailable(RuntimeError):
    pass


class EmbeddingProvider(Protocol):
    name: str
    dimensions: int

    async def embed(self, texts: list[str]) -> list[list[float]]:
        ...


# ── Bedrock Titan V2 ─────────────────────────────────────────────────────


class BedrockTitanEmbedder:
    name = "bedrock-titan-v2"
    dimensions = 1024
    model_id = "amazon.titan-embed-text-v2:0"
    # Titan V2 input limit ≈ 8192 tokens ≈ ~32K chars. We truncate to be safe.
    _MAX_CHARS = 30_000

    def __init__(self) -> None:
        try:
            import boto3  # noqa: WPS433
        except ImportError as e:
            raise EmbeddingUnavailable(
                "boto3 not installed. Run: pip install boto3"
            ) from e
        self._client = boto3.client(
            "bedrock-runtime", region_name=settings.bedrock_region
        )

    def _embed_one_sync(self, text: str) -> list[float]:
        truncated = text[: self._MAX_CHARS]
        body = {
            "inputText": truncated,
            "dimensions": self.dimensions,
            "normalize": True,
        }
        response = self._client.invoke_model(
            modelId=self.model_id,
            body=json.dumps(body),
            contentType="application/json",
            accept="application/json",
        )
        data = json.loads(response["body"].read())
        return data["embedding"]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # Bedrock Titan v2 doesn't batch — one request per text.
        # Run them in parallel via asyncio.to_thread so the event loop
        # isn't blocked by the synchronous boto3 client.
        try:
            return await asyncio.gather(
                *(asyncio.to_thread(self._embed_one_sync, t) for t in texts)
            )
        except Exception as e:  # noqa: BLE001
            raise EmbeddingUnavailable(f"Bedrock Titan error: {str(e)[:200]}") from e


# ── OpenAI text-embedding-3-small ───────────────────────────────────────


class OpenAIEmbedder:
    name = "openai-text-embedding-3-small"
    dimensions = 1024  # 1536 native, reduced to 1024 to share DB column
    model_id = "text-embedding-3-small"

    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise EmbeddingUnavailable(
                "OPENAI_API_KEY is not configured."
            )
        try:
            from openai import AsyncOpenAI  # noqa: WPS433
        except ImportError as e:
            raise EmbeddingUnavailable(
                "openai package not installed. Run: pip install openai"
            ) from e
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            resp = await self._client.embeddings.create(
                model=self.model_id,
                input=texts,
                dimensions=self.dimensions,
            )
            return [d.embedding for d in resp.data]
        except Exception as e:  # noqa: BLE001
            raise EmbeddingUnavailable(f"OpenAI embed error: {str(e)[:200]}") from e


# ── Selection ────────────────────────────────────────────────────────────


_EMBEDDER_CACHE: EmbeddingProvider | None = None


def get_embedder() -> EmbeddingProvider:
    """Returns the configured embedding provider.

    Raises EmbeddingUnavailable if the provider can't be initialised
    (missing deps or credentials). Callers should catch this and skip
    the RAG enrichment rather than failing the whole chat call.
    """
    global _EMBEDDER_CACHE
    if _EMBEDDER_CACHE is not None:
        return _EMBEDDER_CACHE

    choice = (settings.embedding_provider or "bedrock-titan").lower()
    if choice == "openai":
        _EMBEDDER_CACHE = OpenAIEmbedder()
    else:
        _EMBEDDER_CACHE = BedrockTitanEmbedder()
    return _EMBEDDER_CACHE


def reset_embedder_cache() -> None:
    global _EMBEDDER_CACHE
    _EMBEDDER_CACHE = None


# Vector dimension all providers must conform to (they all return 1024-dim
# normalized vectors, so the DB column is shared across providers).
EMBEDDING_DIMENSIONS = 1024
