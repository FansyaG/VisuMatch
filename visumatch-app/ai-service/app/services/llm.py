import asyncio
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import List, Optional
from google import genai
from google.genai import errors as genai_errors
from app.core.errors import InvalidLLMKeyException, LLMUnavailableException
from app.schemas.api_models import ExtractedKeyword, SegmentInput

logger = logging.getLogger("ai_service.llm")


class BaseLLMService(ABC):
    @abstractmethod
    async def extract_keywords(
        self,
        segments: List[SegmentInput],
        sensitivity_level: int,
        language: str,
        api_key: str
    ) -> List[ExtractedKeyword]:
        pass

    @abstractmethod
    async def suggest_alternative(
        self,
        segment_text: str,
        previous_keyword: str,
        language: str,
        api_key: str
    ) -> dict:
        pass

    @abstractmethod
    async def normalize_query(
        self,
        query: str,
        language: str,
        api_key: str,
        timeout_seconds: float = 2.5
    ) -> dict:
        pass


def _strip_json_codeblock(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


class GeminiLLMService(BaseLLMService):
    async def _generate_content_async(self, api_key: str, prompt: str, timeout: Optional[float] = None) -> str:
        def _call_gemini():
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text

        try:
            if timeout:
                return await asyncio.wait_for(asyncio.to_thread(_call_gemini), timeout=timeout)
            return await asyncio.to_thread(_call_gemini)
        except asyncio.TimeoutError:
            raise LLMUnavailableException("Gemini API call timed out")
        except genai_errors.APIError as e:
            # Check for invalid key errors (401 or specific message)
            if hasattr(e, "code") and e.code in (401, 403):
                raise InvalidLLMKeyException(f"Invalid Gemini API Key: {str(e)}")
            error_msg = str(e).lower()
            if "api_key" in error_msg or "unauthorized" in error_msg or "permission" in error_msg:
                raise InvalidLLMKeyException(f"Invalid Gemini API Key: {str(e)}")
            raise LLMUnavailableException(f"Gemini API error: {str(e)}")
        except Exception as e:
            error_msg = str(e).lower()
            if "api key" in error_msg or "401" in error_msg or "403" in error_msg:
                raise InvalidLLMKeyException("Invalid Gemini API Key")
            raise LLMUnavailableException(f"Unexpected LLM error: {str(e)}")

    async def extract_keywords(
        self,
        segments: List[SegmentInput],
        sensitivity_level: int,
        language: str,
        api_key: str
    ) -> List[ExtractedKeyword]:
        segments_data = [
            {"index": i, "start": s.start, "end": s.end, "text": s.text}
            for i, s in enumerate(segments)
        ]

        prompt = f"""
You are an expert video editor AI that extracts visual keywords for stock video B-roll matching.
Given the following transcript segments in '{language}', extract exactly up to {sensitivity_level} visual keywords per segment.
Rules:
1. Every keyword must be highly visual, tangible, and representative of what stock footage should appear on screen (e.g., 'pantai', 'sunset', 'orang berlari').
2. Do not use abstract stop-words or vague expressions.
3. Each keyword MUST be at most 50 characters.
4. Provide a corresponding 'search_query_en' which is the natural English translation/search phrase for stock video platforms (Pexels, Shutterstock).
5. Output ONLY a valid JSON array of objects, with no markdown code blocks, matching this schema:
[
  {{
    "segment_index": 0,
    "keyword": "string (max 50 chars)",
    "search_query_en": "string",
    "start": 0.0,
    "end": 4.2
  }}
]

Transcript segments:
{json.dumps(segments_data, ensure_ascii=False)}
"""

        raw_response = await self._generate_content_async(api_key, prompt, timeout=15.0)
        cleaned = _strip_json_codeblock(raw_response)
        
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # 1 retry attempt
            retry_prompt = f"Fix this invalid JSON and return ONLY valid JSON array:\n{cleaned}"
            raw_response2 = await self._generate_content_async(api_key, retry_prompt, timeout=10.0)
            cleaned2 = _strip_json_codeblock(raw_response2)
            parsed = json.loads(cleaned2)

        results: List[ExtractedKeyword] = []
        for item in parsed:
            kw = str(item.get("keyword", "")).strip()[:50]
            sq = str(item.get("search_query_en", "")).strip() or kw
            idx = int(item.get("segment_index", 0))
            if 0 <= idx < len(segments):
                seg = segments[idx]
                results.append(
                    ExtractedKeyword(
                        keyword=kw,
                        search_query_en=sq,
                        start=float(item.get("start", seg.start)),
                        end=float(item.get("end", seg.end)),
                        segment_index=idx
                    )
                )
        return results

    async def suggest_alternative(
        self,
        segment_text: str,
        previous_keyword: str,
        language: str,
        api_key: str
    ) -> dict:
        prompt = f"""
You are a stock footage matching assistant.
Segment Context ({language}): "{segment_text}"
Previous Keyword to avoid: "{previous_keyword}"

Provide a fresh, distinct, visually relevant alternative keyword for stock video search.
Rules:
1. Must NOT be "{previous_keyword}".
2. Keyword must be max 50 characters.
3. Provide an English stock footage search query 'search_query_en'.
4. Return ONLY a valid JSON object:
{{
  "keyword": "alternative keyword",
  "search_query_en": "english search phrase"
}}
"""
        raw = await self._generate_content_async(api_key, prompt, timeout=5.0)
        cleaned = _strip_json_codeblock(raw)
        data = json.loads(cleaned)
        return {
            "keyword": str(data.get("keyword", "")).strip()[:50],
            "search_query_en": str(data.get("search_query_en", "")).strip()
        }

    async def normalize_query(
        self,
        query: str,
        language: str,
        api_key: str,
        timeout_seconds: float = 2.5
    ) -> dict:
        prompt = f"""
Given the search query "{query}" in '{language}':
1. Extract the main visual subject/action tokens (discard stop words).
2. Translate/expand into a concise English stock video search query 'search_query_en'.
Output ONLY valid JSON:
{{
  "search_query_en": "english search phrase",
  "tokens": ["token1", "token2"]
}}
"""
        raw = await self._generate_content_async(api_key, prompt, timeout=timeout_seconds)
        cleaned = _strip_json_codeblock(raw)
        data = json.loads(cleaned)
        return {
            "search_query_en": str(data.get("search_query_en", "")).strip(),
            "tokens": [str(t).strip() for t in data.get("tokens", []) if str(t).strip()]
        }
