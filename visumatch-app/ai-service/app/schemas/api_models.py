from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# Error Schemas
class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


# Health Schema
class HealthResponse(BaseModel):
    status: str = "ok"
    whisper_model_loaded: bool
    mock_mode: bool


# Transcribe Schemas
class TranscribeRequest(BaseModel):
    file_path: str = Field(..., description="Relative file path inside STORAGE_ROOT")
    language: Optional[str] = Field(default="id", description="Language code e.g. 'id' or 'en'")


class TranscribeSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscribeResponse(BaseModel):
    duration: float
    language: str
    segments: List[TranscribeSegment]


# Keyword Extraction Schemas
class SegmentInput(BaseModel):
    start: float
    end: float
    text: str


class KeywordExtractRequest(BaseModel):
    language: str = Field(default="id")
    sensitivity_level: int = Field(default=3, ge=1, le=5)
    segments: List[SegmentInput]


class ExtractedKeyword(BaseModel):
    keyword: str = Field(..., max_length=50)
    search_query_en: str
    start: float
    end: float
    segment_index: int


class KeywordExtractResponse(BaseModel):
    source: Literal["llm", "fallback"]
    keywords: List[ExtractedKeyword]


# Keyword Suggest Alternative Schemas
class SuggestAlternativeRequest(BaseModel):
    language: str = Field(default="id")
    segment_text: str
    previous_keyword: str


class SuggestAlternativeResponse(BaseModel):
    keyword: str = Field(..., max_length=50)
    search_query_en: str


# Query Normalize Schemas
class QueryNormalizeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=100)
    language: Literal["id", "en"] = Field(default="id")


class QueryNormalizeResponse(BaseModel):
    source: Literal["llm", "fallback"]
    search_query_en: str
    tokens: List[str]
