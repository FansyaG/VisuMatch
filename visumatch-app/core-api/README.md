# VisuMatch Core API (Backend Service)

Core API VisuMatch adalah service backend utama untuk manajemen proyek, autentikasi, upload A-Roll, orkestrasi pipeline pencocokan AI B-Roll, pencarian b-roll manual (eksternal via Pexels & Pixabay, serta internal asset), timeline editor, dan ekspor timeline (XML/EDL).

## Tech Stack
- **Node.js 20+** & **TypeScript**
- **Fastify** (Web framework berperforma tinggi)
- **Prisma ORM** + **MySQL 8**
- **Zod** untuk validasi schema
- **JWT & bcrypt** untuk auth & role guard
- **Axios** untuk integrasi internal service & provider
- **Vitest** untuk unit & integration test
- **OpenAPI / Swagger** (`/docs`)

---

## 1. Setup & Menjalankan

### Persyaratan
- Node.js >= 20.x
- MySQL 8.x berjalan di localhost:3306

### Langkah Instalasi
```bash
cd core-api

# Install dependencies
npm install

# Konfigurasi environment
cp .env.example .env

# Generate Prisma Client
npx prisma generate

# Sinkronkan schema ke MySQL (atau gunakan prisma db push)
npx prisma db push

# Jalankan Seeder (Akun Admin & Creator bawaan)
npm run prisma:seed
```

### Akun Seeder Bawaan
- **Admin**:
  - Username: `admin`
  - Password: `password123`
- **Creator**:
  - Username: `creator`
  - Password: `password123`

### Menjalankan Server
```bash
# Mode Development (auto-reload)
npm run dev

# Mode Build & Production
npm run build
npm start
```
Dokumentasi OpenAPI Swagger interaktif dapat diakses di:
`http://localhost:3000/docs`

---

## 2. Endpoint API (Prefix `/api/v1`)

### Auth
- `POST /auth/login` - Login username/password -> JWT token
- `GET /auth/me` - Ambil profil pengguna saat ini

### Projects
- `POST /projects` - Buat proyek baru
- `GET /projects` - List proyek (Creator melihat miliknya, Admin melihat semua)
- `GET /projects/:id` - Detail proyek lengkap dengan Transcripts & Timeline EDL
- `DELETE /projects/:id` - Hapus proyek (cascade ke semua relasi & file fisik media)
- `PUT /projects/:id/ai-settings` - Update setting bahasa (`id`/`en`) dan sensitivity level (1-5)

### Upload & Pipeline
- `POST /projects/:id/aroll` - Upload file A-Roll (multipart stream) -> otomatis menjalankan pipeline background:
  1. **Transcribe** -> memanggil ai-service `/v1/transcribe` -> simpan `Transcripts`
  2. **Keywords Extract** -> memanggil ai-service `/v1/keywords/extract` -> simpan `Extracted_Keywords`
  3. **Fetch B-Roll** -> mencari klip stock video dari provider aktif (`pexels` / `pixabay`, memprioritaskan Pexels jika keduanya aktif dengan fallback ke Pixabay) sesuai keyword -> simpan `External_BRoll`
  4. **Sync Timeline** -> sinkronisasi timestamp ke track V2 `Timeline_EDL`
- `GET /projects/:id/pipeline-status` - Polling status pipeline (idle, processing, completed, failed)
- `POST /projects/:id/transcribe` - Trigger transcribe manual
- `POST /projects/:id/keywords/extract` - Trigger ekstraksi keyword manual
- `POST /projects/:id/broll/fetch` - Trigger fetch B-Roll manual
- `POST /projects/:id/timeline/sync` - Trigger sync timeline manual

### Pencarian Manual B-Roll
- `GET /search/broll?q=<teks>&source=all|external|internal&page=1&per_page=12&orientation=landscape`
  - Normalisasi query via ai-service `/v1/query/normalize` (timeout 3 detik dengan fallback otomatis query asli)
  - Pencarian eksternal memakai provider aktif (`pexels` atau `pixabay`, fallback Pixabay jika Pexels kosong/error) & Internal Assets via `Promise.allSettled`
  - Format respon seragam dengan penanganan graceful warning
- `POST /projects/:id/timeline/from-search`
  - Memasukkan hasil pencarian (external/internal) ke Timeline EDL
  - Validasi tumpang tindih (overlap conflict 409) dan batas durasi A-Roll (422)

### Timeline Editing
- `GET /projects/:id/timeline` - Ambil semua klip EDL proyek
- `PATCH /projects/:id/timeline/:edlId` - Ubah posisi `start_pos`, `end_pos`, `track_layer` (dengan deteksi overlap 409)
- `DELETE /timeline/:edlId` - Menghapus satu klip dari timeline EDL (mengembalikan 200 dengan `edl_id`, 404 jika tidak ditemukan, 403 jika bukan pemilik proyek)
- `POST /timeline/:edlId/regenerate` - Regenerasi klip via ai-service alternative keyword & provider aktif (Pexels / Pixabay)
- `POST /timeline/local-asset` - Pasang aset internal langsung ke timeline

### Export
- `POST /projects/:id/export/video` - Balasan 501 `NOT_IMPLEMENTED` pada mode deadline
- `GET /projects/:id/export/timeline?format=xml|edl` - Download timeline format **Final Cut Pro XML** atau **CMX3600 EDL**

### Admin Modul
- `GET/POST/PUT/DELETE /admin/assets` - Manajemen Internal Assets lokal (DELETE ditolak 409 jika aset sedang terpasang di EDL)
- `GET/POST /admin/api-keys` - Konfigurasi API keys (`pexels`, `pixabay`, `gemini`/`openai`). Disimpan terenkripsi AES-256-GCM dan di-mask di response.
  - Untuk `pixabay`: Menguji key dengan request ringan `https://pixabay.com/api/videos/?key=<API_KEY>&q=test&per_page=3`. Status 200 disimpan terenkripsi, 400/401/403 ditolak.
  - Contoh body request:
    ```json
    {
      "provider_name": "pixabay",
      "api_key": "12345678-abcdef0123456789abcdef012",
      "is_active": true
    }
    ```
    atau Pexels:
    ```json
    {
      "provider_name": "pexels",
      "api_key": "YOUR_PEXELS_API_KEY",
      "is_active": true
    }
    ```
- `GET /assets` - Akses read-only internal assets untuk Creator.

---

## 3. Testing
Jalankan test suite menggunakan Vitest:
```bash
npm test
```
