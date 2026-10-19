import asyncio
import os
import subprocess
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional
from app.core.config import settings
from app.core.errors import STTFailedException, UnsupportedMediaException
from app.schemas.api_models import TranscribeResponse, TranscribeSegment


class BaseSTTService(ABC):
    @abstractmethod
    def load_model(self) -> None:
        pass

    @abstractmethod
    def is_loaded(self) -> bool:
        pass

    @abstractmethod
    async def transcribe(self, audio_path: Path, language: Optional[str] = "id") -> TranscribeResponse:
        pass


class FasterWhisperSTTService(BaseSTTService):
    def __init__(self):
        self._model = None
        self._semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_TRANSCRIBE)

    def load_model(self) -> None:
        if settings.MOCK_MODE:
            return
        from faster_whisper import WhisperModel
        # Auto selects device (cuda/cpu)
        self._model = WhisperModel(
            settings.WHISPER_MODEL,
            device=settings.WHISPER_DEVICE,
            compute_type=settings.WHISPER_COMPUTE_TYPE
        )

    def is_loaded(self) -> bool:
        if settings.MOCK_MODE:
            return True
        return self._model is not None

    def _extract_audio_with_ffmpeg(self, input_file: Path) -> Path:
        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_wav.close()
        temp_path = Path(temp_wav.name)

        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(input_file),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(temp_path)
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode != 0:
                raise UnsupportedMediaException(
                    f"FFmpeg audio extraction failed: {res.stderr.decode('utf-8', errors='ignore')[:200]}"
                )
            return temp_path
        except FileNotFoundError:
            raise STTFailedException("FFmpeg executable not found on system")

    def _transcribe_blocking(self, wav_path: Path, language: Optional[str]) -> TranscribeResponse:
        try:
            segments_gen, info = self._model.transcribe(
                str(wav_path),
                language=language if language else None,
                beam_size=5
            )
            segments: List[TranscribeSegment] = []
            for s in segments_gen:
                clean_text = s.text.strip()
                if clean_text:
                    segments.append(
                        TranscribeSegment(
                            start=round(float(s.start), 2),
                            end=round(float(s.end), 2),
                            text=clean_text
                        )
                    )
            return TranscribeResponse(
                duration=round(float(info.duration), 2),
                language=info.language or (language or "id"),
                segments=segments
            )
        except Exception as e:
            raise STTFailedException(f"Transcribe execution error: {str(e)}")

    async def transcribe(self, file_path: Path, language: Optional[str] = "id") -> TranscribeResponse:
        if settings.MOCK_MODE:
            return TranscribeResponse(
                duration=12.5,
                language=language or "id",
                segments=[
                    TranscribeSegment(start=0.0, end=4.2, text="Halo semuanya selamat datang di video dokumenter keindahan pantai."),
                    TranscribeSegment(start=4.5, end=8.0, text="Di sini kita bisa melihat anak-anak bermain pasir dan ombak laut."),
                    TranscribeSegment(start=8.2, end=12.5, text="Matahari terbenam memberikan suasana sore yang sangat menenangkan.")
                ]
            )

        async with self._semaphore:
            # 1. Extract audio via ffmpeg
            wav_path = await asyncio.to_thread(self._extract_audio_with_ffmpeg, file_path)
            try:
                # 2. Run faster-whisper in threadpool
                return await asyncio.to_thread(self._transcribe_blocking, wav_path, language)
            finally:
                if wav_path.exists():
                    try:
                        os.unlink(wav_path)
                    except OSError:
                        pass
