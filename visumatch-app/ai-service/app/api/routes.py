from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, Header
from app.core.config import settings
from app.core.errors import (
    FileNotFoundException,
    InvalidLLMKeyException,
    ServiceException
)
from app.core.security import verify_internal_token
from app.schemas.api_models import (
    ExtractedKeyword,
    KeywordExtractRequest,
    KeywordExtractResponse,
    QueryNormalizeRequest,
    QueryNormalizeResponse,
    SuggestAlternativeRequest,
    SuggestAlternativeResponse,
    TranscribeRequest,
    TranscribeResponse
)
from app.services.llm import GeminiLLMService
from app.services.nlp import clean_and_tokenize, extract_fallback_keywords
from app.services.stt import FasterWhisperSTTService

router = APIRouter(prefix="/v1", dependencies=[Depends(verify_internal_token)])

stt_service = FasterWhisperSTTService()
llm_service = GeminiLLMService()


def _resolve_safe_file_path(relative_path: str) -> Path:
    base = settings.storage_root_path
    resolved = (base / relative_path).resolve()
    # Path traversal protection
    if not str(resolved).startswith(str(base)):
        raise FileNotFoundException("Access denied: Invalid path traversal")
    if not settings.MOCK_MODE and not resolved.is_file():
        raise FileNotFoundException(f"File not found: {relative_path}")
    return resolved


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(req: TranscribeRequest):
    file_path = _resolve_safe_file_path(req.file_path)
    return await stt_service.transcribe(file_path, req.language)


@router.post("/keywords/extract", response_model=KeywordExtractResponse)
async def extract_keywords_endpoint(
    req: KeywordExtractRequest,
    x_llm_api_key: Optional[str] = Header(default=None, alias="X-LLM-Api-Key")
):
    # If API key is provided, try LLM first
    if x_llm_api_key:
        try:
            keywords = await llm_service.extract_keywords(
                segments=req.segments,
                sensitivity_level=req.sensitivity_level,
                language=req.language,
                api_key=x_llm_api_key
            )
            return KeywordExtractResponse(source="llm", keywords=keywords)
        except InvalidLLMKeyException:
            raise
        except Exception:
            # LLM failed or timed out -> Graceful fallback
            pass

    # Fallback NLP (no key, or LLM failed/timed out)
    fallback_keywords: list[ExtractedKeyword] = []
    for idx, seg in enumerate(req.segments):
        tokens = extract_fallback_keywords(seg.text, limit=req.sensitivity_level, language=req.language)
        for t in tokens:
            fallback_keywords.append(
                ExtractedKeyword(
                    keyword=t,
                    search_query_en=t,
                    start=seg.start,
                    end=seg.end,
                    segment_index=idx
                )
            )
    return KeywordExtractResponse(source="fallback", keywords=fallback_keywords)


@router.post("/keywords/suggest-alternative", response_model=SuggestAlternativeResponse)
async def suggest_alternative_endpoint(
    req: SuggestAlternativeRequest,
    x_llm_api_key: Optional[str] = Header(default=None, alias="X-LLM-Api-Key")
):
    if x_llm_api_key:
        try:
            res = await llm_service.suggest_alternative(
                segment_text=req.segment_text,
                previous_keyword=req.previous_keyword,
                language=req.language,
                api_key=x_llm_api_key
            )
            return SuggestAlternativeResponse(
                keyword=res["keyword"],
                search_query_en=res["search_query_en"]
            )
        except InvalidLLMKeyException:
            raise
        except Exception:
            pass

    # Fallback
    candidates = extract_fallback_keywords(req.segment_text, limit=5, language=req.language)
    alt = next((c for c in candidates if c.lower() != req.previous_keyword.lower()), f"{req.previous_keyword} footage")
    return SuggestAlternativeResponse(
        keyword=alt[:50],
        search_query_en=alt
    )


@router.post("/query/normalize", response_model=QueryNormalizeResponse)
async def normalize_query_endpoint(
    req: QueryNormalizeRequest,
    x_llm_api_key: Optional[str] = Header(default=None, alias="X-LLM-Api-Key")
):
    # LLM attempt within max 2.5s
    if x_llm_api_key:
        try:
            res = await llm_service.normalize_query(
                query=req.query,
                language=req.language,
                api_key=x_llm_api_key,
                timeout_seconds=2.5
            )
            return QueryNormalizeResponse(
                source="llm",
                search_query_en=res["search_query_en"],
                tokens=res["tokens"]
            )
        except InvalidLLMKeyException:
            raise
        except Exception:
            pass

    # Fallback: clean tokens from original query
    tokens = clean_and_tokenize(req.query, req.language)
    search_en = " ".join(tokens) if tokens else req.query
    return QueryNormalizeResponse(
        source="fallback",
        search_query_en=search_en,
        tokens=tokens if tokens else [req.query]
    )
