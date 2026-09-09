"""
Gemini adapter — translates OpenAI-compatible requests to Google Gemini API
using the new official google-genai SDK and Interactions API.

Handles request/response format translation, model mapping, error
classification, and token extraction from Gemini's native response.
"""

from __future__ import annotations

import time
from typing import AsyncIterator

import httpx
import structlog
from google import genai
from google.genai.errors import APIError

from infrgate.exceptions import (
    ProviderAuthError,
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
)
from infrgate.providers.base import ProviderAdapter, ProviderRequest, ProviderResponse
from infrgate.schemas.streaming import StreamChunk

logger = structlog.get_logger()

class GeminiAdapter(ProviderAdapter):
    """Provider adapter for Google Gemini via the Interactions API."""

    SUPPORTED_MODELS = [
        "gemini-3.7-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-pro-preview",
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ]

    def __init__(self, api_key: str, http_client: httpx.AsyncClient):
        self._api_key = api_key
        # We instantiate the async client provided by google-genai
        self._client = genai.Client(api_key=api_key, http_options={'api_version': 'v1beta'})

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def supported_models(self) -> list[str]:
        return self.SUPPORTED_MODELS

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        """Execute a non-streaming chat completion via Gemini Interactions API."""
        
        logger.info(
            "provider_call",
            provider="gemini",
            model=request.model,
            request_id=request.request_id,
        )

        input_text = self._build_combined_input(request)
        
        start = time.monotonic()
        try:
            interaction = await self._client.aio.interactions.create(
                model=request.model,
                input=input_text,
                stream=False
            )
        except APIError as e:
            self._handle_error(e, request.request_id)
        except Exception as e:
            raise ProviderError(
                message=f"Failed to connect to Gemini: {e}",
                provider="gemini",
                retryable=True,
            )

        latency_ms = int((time.monotonic() - start) * 1000)
        
        output_text = interaction.output_text or ""
        finish_reason = "stop"
        
        usage = interaction.usage if hasattr(interaction, "usage") and interaction.usage else None
        
        def get_usage(obj, attr_name):
            if isinstance(obj, dict):
                return obj.get(attr_name, 0)
            return getattr(obj, attr_name, 0)
            
        prompt_tokens = get_usage(usage, "prompt_token_count") if usage else 0
        completion_tokens = get_usage(usage, "response_token_count") if usage else 0
        total_tokens = get_usage(usage, "total_token_count") if usage else 0

        response = ProviderResponse(
            content=output_text,
            model=request.model,
            finish_reason=finish_reason,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            provider_latency_ms=latency_ms,
            raw_response={"interaction_id": interaction.id if hasattr(interaction, "id") else None},
        )

        logger.info(
            "provider_response",
            provider="gemini",
            model=request.model,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            request_id=request.request_id,
        )

        return response

    async def stream(self, request: ProviderRequest) -> AsyncIterator[StreamChunk]:
        """Execute a streaming chat completion via Gemini Interactions API."""
        
        logger.info(
            "provider_stream_started",
            provider="gemini",
            model=request.model,
            request_id=request.request_id,
        )

        input_text = self._build_combined_input(request)

        try:
            stream = await self._client.aio.interactions.create(
                model=request.model,
                input=input_text,
                stream=True
            )
            
            is_first = True
            
            async for event in stream:
                if event.event_type == "step.delta":
                    if event.delta.type == "text":
                        delta_role = "assistant" if is_first else None
                        is_first = False
                        
                        yield StreamChunk(
                            id=request.request_id,
                            model=request.model,
                            delta_role=delta_role,
                            delta_content=event.delta.text,
                            finish_reason=None,
                            usage=None
                        )
                elif event.event_type == "interaction.completed":
                    usage = None
                    if hasattr(event.interaction, "usage") and event.interaction.usage:
                        usage_obj = event.interaction.usage
                        
                        def get_usage(obj, attr_name):
                            if isinstance(obj, dict):
                                return obj.get(attr_name, 0)
                            return getattr(obj, attr_name, 0)
                            
                        usage = {
                            "prompt_tokens": get_usage(usage_obj, "prompt_token_count") or 0,
                            "completion_tokens": get_usage(usage_obj, "response_token_count") or 0,
                            "total_tokens": get_usage(usage_obj, "total_token_count") or 0,
                        }
                    
                    yield StreamChunk(
                        id=request.request_id,
                        model=request.model,
                        delta_role=None,
                        delta_content=None,
                        finish_reason="stop",
                        usage=usage
                    )

        except APIError as e:
            self._handle_error(e, request.request_id)
        except Exception as e:
            raise ProviderError(
                message=f"Failed to connect to Gemini: {e}",
                provider="gemini",
                retryable=True,
            )

    def _build_combined_input(self, request: ProviderRequest) -> str:
        """
        Translate the stateless messages array into a single combined input string,
        since the Interactions API uses stateful `previous_interaction_id`.
        """
        combined = ""
        for msg in request.messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                combined += f"[SYSTEM INSTRUCTION]:\n{content}\n\n"
            elif role == "assistant":
                combined += f"[ASSISTANT]:\n{content}\n\n"
            else:
                combined += f"[USER]:\n{content}\n\n"
        
        return combined.strip()

    def _handle_error(self, exc: APIError, request_id: str) -> None:
        """Classify Gemini SDK errors and raise appropriate exceptions."""
        status = exc.code
        message = exc.message

        logger.error(
            "provider_error",
            provider="gemini",
            status_code=status,
            message=message[:200],
            request_id=request_id,
        )

        if status in (401, 403):
            raise ProviderAuthError("gemini")
        elif status == 429:
            raise ProviderRateLimitError("gemini")
        elif status >= 500:
            raise ProviderError(
                message=f"Gemini server error ({status}): {message[:200]}",
                provider="gemini",
                upstream_status=status,
                retryable=True,
            )
        else:
            raise ProviderError(
                message=f"Gemini error ({status}): {message[:200]}",
                provider="gemini",
                upstream_status=status,
                retryable=False,
            )
