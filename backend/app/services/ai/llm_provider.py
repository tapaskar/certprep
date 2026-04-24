"""LLM provider abstraction.

Lets the rest of the app talk to a single chat() interface that's
backed by either:
  - Anthropic Claude API  (settings.llm_provider = "anthropic")
  - A local llama.cpp HTTP server (settings.llm_provider = "local")

llama.cpp ships an OpenAI-compatible /v1/chat/completions endpoint
when started with `llama-server`, so the local provider is just an
HTTP POST against that.

Both providers implement the same async signature so callers can swap
with no code changes.
"""

from __future__ import annotations

from typing import Protocol

import anthropic
import httpx

from app.config import settings


class LLMUnavailable(RuntimeError):
    """Raised when the configured provider can't serve a request.

    Callers should map this to a 503 with a friendly message.
    """


class ChatProvider(Protocol):
    name: str

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],  # [{"role": "user"|"assistant", "content": str}]
        max_tokens: int = 700,
        temperature: float = 0.7,
    ) -> str:
        ...


# ── Anthropic provider ──────────────────────────────────────────────────


class AnthropicProvider:
    name = "anthropic"

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
    ) -> str:
        if not settings.anthropic_api_key:
            raise LLMUnavailable(
                "Anthropic API key is not configured (set ANTHROPIC_API_KEY)."
            )
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        try:
            msg = await client.messages.create(
                model=settings.ai_model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )
        except anthropic.APIError as e:
            raise LLMUnavailable(f"Anthropic API error: {str(e)[:200]}") from e
        return msg.content[0].text if msg.content else ""


# ── Local llama.cpp provider ────────────────────────────────────────────


class LocalLlamaCppProvider:
    """Talks to llama.cpp's `llama-server` via its OpenAI-compatible API.

    Start the server like:
        llama-server -m qwen2.5-7b-instruct-q4_k_m.gguf \
            --host 127.0.0.1 --port 8080 \
            --ctx-size 16384 --threads 8 --chat-template chatml \
            --cache-type-k q8_0 --cache-type-v q8_0

    No auth needed — the server is bound to localhost behind nginx/EC2 SG.
    """

    name = "local"

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
    ) -> str:
        # llama-server accepts the standard OpenAI format with `system` as the
        # first message in the array.
        oai_messages: list[dict] = []
        if system:
            oai_messages.append({"role": "system", "content": system})
        oai_messages.extend(messages)

        url = settings.local_llm_url.rstrip("/") + "/v1/chat/completions"
        payload = {
            # llama-server ignores the model field for a single loaded model
            # but Open-API clients require it.
            "model": settings.local_llm_model or "local-llm",
            "messages": oai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            # Server-side stream is supported but we use a single-shot
            # response; saves SSE plumbing on the FastAPI side.
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.local_llm_timeout_seconds
            ) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            raise LLMUnavailable(
                f"Local llama.cpp server unreachable at {settings.local_llm_url}: {e}"
            ) from e
        except Exception as e:  # noqa: BLE001
            raise LLMUnavailable(f"Local LLM error: {e}") from e

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise LLMUnavailable(
                f"Unexpected llama.cpp response shape: {str(data)[:200]}"
            ) from e


# ── Selection ──────────────────────────────────────────────────────────


_PROVIDER_CACHE: ChatProvider | None = None


def get_chat_provider() -> ChatProvider:
    """Return the configured chat provider.

    Memoised — the provider classes are stateless so we keep one instance
    per process.
    """
    global _PROVIDER_CACHE
    if _PROVIDER_CACHE is not None:
        return _PROVIDER_CACHE
    choice = (settings.llm_provider or "anthropic").lower()
    if choice == "local":
        _PROVIDER_CACHE = LocalLlamaCppProvider()
    else:
        _PROVIDER_CACHE = AnthropicProvider()
    return _PROVIDER_CACHE


def reset_provider_cache() -> None:
    """For tests."""
    global _PROVIDER_CACHE
    _PROVIDER_CACHE = None
