from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    INTERNAL_SERVICE_TOKEN: str = Field(default="dev-internal-token")
    STORAGE_ROOT: str = Field(default="/data/storage")
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "auto"
    WHISPER_COMPUTE_TYPE: str = "default"
    MAX_CONCURRENT_TRANSCRIBE: int = 2
    MOCK_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def storage_root_path(self) -> Path:
        return Path(self.STORAGE_ROOT).resolve()


settings = Settings()
