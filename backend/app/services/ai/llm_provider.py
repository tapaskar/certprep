"""LLM provider abstraction.

A single async chat() interface backed by one of:
  - "anthropic"  — Anthropic Claude API direct
  - "bedrock"    — Claude via AWS Bedrock (uses your existing AWS auth /
                   IAM role, billed inside AWS, lower latency in-region)
  - "local"      — A local llama.cpp HTTP server (Qwen2.5, etc.)

Cost-minded features baked in:
  • `fast=True` routes to a much cheaper model (Haiku ~ 12x cheaper than
    Sonnet) — used by the agentic /observe judgment which doesn't need
    Sonnet's reasoning depth.
  • The Anthropic provider applies **prompt caching** to the system
    prompt, dropping repeated reads from $3/M to $0.30/M.
  • Every call returns a ChatResult with input/output/cached token counts
    so callers can persist usage telemetry.

All providers implement the same async signature. Switching is a config
change, not a code change.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import anthropic
import httpx

from app.config import settings


class LLMUnavailable(RuntimeError):
    """Raised when the configured provider can't serve a request."""


@dataclass
class ChatResult:
    """Return type for any provider.chat() call."""

    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0  # Anthropic cache hits (90% discount)
    model: str = ""


class ChatProvider(Protocol):
    name: str

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
        fast: bool = False,
    ) -> ChatResult:
        ...


# ── Anthropic provider (with prompt caching) ────────────────────────────


class AnthropicProvider:
    name = "anthropic"

    def _model(self, fast: bool) -> str:
        return settings.ai_model_fast if fast else settings.ai_model

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
        fast: bool = False,
    ) -> ChatResult:
        if not settings.anthropic_api_key:
            raise LLMUnavailable(
                "Anthropic API key is not configured (set ANTHROPIC_API_KEY)."
            )
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        model = self._model(fast)

        # ── Prompt caching ─────────────────────────────────────
        # Mark the system prompt as cacheable. For typical Coach usage
        # (multiple turns within ~5 minutes of each other) this drops
        # the cost of the system prompt portion to 10% on every turn
        # after the first. Min cache size on Anthropic is 1024 tokens
        # for Sonnet — system prompts in tutor.py easily exceed that.
        system_param: str | list[dict]
        if system and len(system) > 500:
            system_param = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_param = system

        try:
            msg = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_param,
                messages=messages,
            )
        except anthropic.APIError as e:
            raise LLMUnavailable(f"Anthropic API error: {str(e)[:200]}") from e

        usage = getattr(msg, "usage", None)
        return ChatResult(
            content=msg.content[0].text if msg.content else "",
            input_tokens=getattr(usage, "input_tokens", 0) if usage else 0,
            output_tokens=getattr(usage, "output_tokens", 0) if usage else 0,
            cached_tokens=getattr(usage, "cache_read_input_tokens", 0) if usage else 0,
            model=model,
        )


# ── Bedrock provider (Claude via AWS) ──────────────────────────────────


class BedrockProvider:
    """Claude via Amazon Bedrock — uses your existing AWS auth chain.

    Benefits over direct Anthropic API:
      - Single AWS bill (no separate Anthropic invoice)
      - Same VPC/region — lower latency, no egress
      - Provisioned throughput option for predictable traffic

    Auth: the anthropic SDK's BedrockClient uses boto3's default chain,
    so the IAM role attached to the EC2 instance just needs the
    `bedrock:InvokeModel` permission for the configured model ARNs.
    """

    name = "bedrock"

    def _model(self, fast: bool) -> str:
        return settings.bedrock_model_fast if fast else settings.bedrock_model

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
        fast: bool = False,
    ) -> ChatResult:
        try:
            from anthropic import AsyncAnthropicBedrock
        except ImportError as e:
            raise LLMUnavailable(
                "Bedrock support requires `anthropic[bedrock]`. "
                "Install: pip install 'anthropic[bedrock]'."
            ) from e

        client = AsyncAnthropicBedrock(aws_region=settings.bedrock_region)
        model = self._model(fast)

        # Bedrock supports prompt caching for some Claude models; same shape.
        system_param: str | list[dict]
        if system and len(system) > 500:
            system_param = [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            system_param = system

        try:
            msg = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_param,
                messages=messages,
            )
        except Exception as e:  # noqa: BLE001
            raise LLMUnavailable(f"Bedrock error: {str(e)[:200]}") from e

        usage = getattr(msg, "usage", None)
        return ChatResult(
            content=msg.content[0].text if msg.content else "",
            input_tokens=getattr(usage, "input_tokens", 0) if usage else 0,
            output_tokens=getattr(usage, "output_tokens", 0) if usage else 0,
            cached_tokens=getattr(usage, "cache_read_input_tokens", 0) if usage else 0,
            model=model,
        )


# ── Local llama.cpp provider ────────────────────────────────────────────


class LocalLlamaCppProvider:
    """Talks to llama.cpp's `llama-server` via /v1/chat/completions."""

    name = "local"

    async def chat(
        self,
        *,
        system: str,
        messages: list[dict],
        max_tokens: int = 700,
        temperature: float = 0.7,
        fast: bool = False,  # local has no separate fast model
    ) -> ChatResult:
        oai_messages: list[dict] = []
        if system:
            oai_messages.append({"role": "system", "content": system})
        oai_messages.extend(messages)

        url = settings.local_llm_url.rstrip("/") + "/v1/chat/completions"
        model = settings.local_llm_model or "local-llm"
        payload = {
            "model": model,
            "messages": oai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
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
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise LLMUnavailable(
                f"Unexpected llama.cpp response shape: {str(data)[:200]}"
            ) from e

        usage = data.get("usage", {}) or {}
        return ChatResult(
            content=content,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            cached_tokens=0,
            model=model,
        )


# ── Selection ───────────────────────────────────────────────────────────


_PROVIDER_CACHE: ChatProvider | None = None


def get_chat_provider() -> ChatProvider:
    global _PROVIDER_CACHE
    if _PROVIDER_CACHE is not None:
        return _PROVIDER_CACHE
    choice = (settings.llm_provider or "anthropic").lower()
    if choice == "local":
        _PROVIDER_CACHE = LocalLlamaCppProvider()
    elif choice == "bedrock":
        _PROVIDER_CACHE = BedrockProvider()
    else:
        _PROVIDER_CACHE = AnthropicProvider()
    return _PROVIDER_CACHE


def reset_provider_cache() -> None:
    global _PROVIDER_CACHE
    _PROVIDER_CACHE = None


# ── Cost estimator (for the usage log) ──────────────────────────────────


# Per-million-token prices (USD). Update as models/prices change.
_MODEL_PRICES: dict[str, tuple[float, float, float]] = {
    # (input_per_M, output_per_M, cache_hit_per_M)
    "claude-sonnet-4-20250514": (3.00, 15.00, 0.30),
    "claude-3-5-sonnet-20241022": (3.00, 15.00, 0.30),
    "claude-3-5-haiku-20241022": (0.80, 4.00, 0.08),
    "claude-haiku-4-20250514": (0.80, 4.00, 0.08),
    # Bedrock model IDs use the same prices on AWS
    "anthropic.claude-sonnet-4-20250514-v1:0": (3.00, 15.00, 0.30),
    "anthropic.claude-3-5-sonnet-20241022-v2:0": (3.00, 15.00, 0.30),
    "anthropic.claude-3-5-haiku-20241022-v1:0": (0.80, 4.00, 0.08),
}


def estimate_cost_usd(result: ChatResult) -> float:
    """Best-effort cost estimate for a single chat result."""
    prices = _MODEL_PRICES.get(result.model)
    if not prices:
        # Unknown model — use Sonnet 4 prices as a conservative default
        prices = _MODEL_PRICES["claude-sonnet-4-20250514"]
    in_per_m, out_per_m, cache_per_m = prices
    fresh_in = max(0, result.input_tokens - result.cached_tokens)
    return (
        fresh_in * in_per_m / 1_000_000
        + result.cached_tokens * cache_per_m / 1_000_000
        + result.output_tokens * out_per_m / 1_000_000
    )
