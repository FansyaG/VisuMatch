# VisuMatch AI Service

Stateless STT and NLP microservice for VisuMatch.

## Fitur & Arsitektur
- **FastAPI + Uvicorn**: Inferensi non-blocking dengan threadpool & semaphore concurrency limit.
- **Speech-to-Text**: `faster-whisper` (default model `base`), ekstraksi audio mono 16kHz via `ffmpeg`.
- **LLM Keyword Extraction & Query Normalization**: Google Gemini (`google-genai` gemini-2.5-flash) dengan output JSON ketat dan mekanisme retry.
- **Graceful NLP Fallback**: Tokenizer & stopwords lokal (Indonesia & Inggris) bila Gemini timeout atau tanpa API key.
- **Keamanan**: Wajib header `X-Internal-Token`, key LLM diterima per-request via `X-LLM-Api-Key` (tanpa log/penyimpanan), validasi path traversal pada storage root.
- **Mock Mode**: Jalankan tanpa model STT (`MOCK_MODE=true`) untuk testing cepat.

---

## 1. Setup & Menjalankan

### Persyaratan
- Python 3.11+
- `ffmpeg` terinstal di PATH sistem.

### Langkah Instalasi
```bash
cd ai-service

# Buat virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Salin konfigurasi environment
cp .env.example .env
```

### Menjalankan Service
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Atau aktifkan mock mode pada `.env`:
```env
MOCK_MODE=true
```

---

## 2. Contoh curl Endpoint

### A. Health Check (Tanpa Auth)
```bash
curl -X GET http://localhost:8001/health
```

### B. POST /v1/transcribe
```bash
curl -X POST http://localhost:8001/v1/transcribe \
  -H "X-Internal-Token: dev-internal-token" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "aroll/12/abc.mp4",
    "language": "id"
  }'
```

### C. POST /v1/keywords/extract
```bash
curl -X POST http://localhost:8001/v1/keywords/extract \
  -H "X-Internal-Token: dev-internal-token" \
  -H "X-LLM-Api-Key: AIzaSy..." \
  -H "Content-Type: application/json" \
  -d '{
    "language": "id",
    "sensitivity_level": 3,
    "segments": [
      {
        "start": 0.0,
        "end": 4.2,
        "text": "Anak-anak sedang berlari dan bermain pasir di tepi pantai saat sore hari"
      }
    ]
  }'
```
*Catatan: Bila header `X-LLM-Api-Key` tidak disertakan atau LLM gagal, service otomatis fallback ke NLP lokal dengan `"source": "fallback"`.*

### D. POST /v1/keywords/suggest-alternative
```bash
curl -X POST http://localhost:8001/v1/keywords/suggest-alternative \
  -H "X-Internal-Token: dev-internal-token" \
  -H "X-LLM-Api-Key: AIzaSy..." \
  -H "Content-Type: application/json" \
  -d '{
    "language": "id",
    "segment_text": "Anak-anak sedang berlari dan bermain pasir di tepi pantai",
    "previous_keyword": "pantai"
  }'
```

### E. POST /v1/query/normalize
```bash
curl -X POST http://localhost:8001/v1/query/normalize \
  -H "X-Internal-Token: dev-internal-token" \
  -H "X-LLM-Api-Key: AIzaSy..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "anak bermain di pantai",
    "language": "id"
  }'
```
