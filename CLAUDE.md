# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Three-service monorepo under `axes-ai-platform/`:

- **`frontend/`** — Angular 17 SPA (`http://localhost:4200`)
- **`backend-api/`** — C# .NET 8 Web API (`https://localhost:5001`)
- **`ai-microservice/`** — Python FastAPI (`http://127.0.0.1:8000`)

**Request flow:** Angular → .NET backend (JWT-auth gateway) → Python microservice (AI/RAG).

The .NET backend uses a **fire-and-forget background task** (`Task.Run`) to call the Python `/api/extract` endpoint after saving an initial `"Processing"` record to SQL. When AI completes, it updates the record and pushes a SignalR event (`ExtractionComplete`) to Angular via `ProjectHub`.

FAISS vector index is **in-memory only** — uploading training PDFs via `/api/train` is lost on Python server restart.

## Data Models

SQL Server (`SmartRfpDb`) via EF Core:
- `AppUser` — Id, Username, Email, PasswordHash, Role (`"BidManager"` default)
- `RfpProject` — Id, ProjectTitle, OriginalFileName, Priority, Department, UploadDate, Status (`Processing`/`Completed`/`Failed`), AiConfidenceScore, ExtractedJson, UploadedById (FK)

JWT claims embed `NameIdentifier` (user ID), `Name`, and `Role`.

## Running the Stack

All three services must run simultaneously.

**AI Microservice:**
```bash
cd axes-ai-platform/ai-microservice
python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn google-genai PyPDF2 sentence-transformers faiss-cpu numpy pydantic python-dotenv
# Create .env with: GEMINI_API_KEY=your_key
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
# Wait for: "--- Vector Database Ready! ---"
```

**Backend API:**
```bash
cd axes-ai-platform/backend-api
dotnet run
```

**Frontend:**
```bash
cd axes-ai-platform/frontend
npm install
ng serve -o
```

## Database Migrations

```bash
cd axes-ai-platform/backend-api
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

## Key Config

- JWT secret: `appsettings.json` → `AppSettings:Token`
- DB: SQL Server Express, database `SmartRfpDb`, Windows auth (`Trusted_Connection=True`)
- CORS: both .NET and Python hardcode `http://localhost:4200` — Python must run on exactly `127.0.0.1:8000`
- Uploaded PDFs stored in `backend-api/Uploads/`

## AI Confidence Score Rubric

Score starts at 100, penalties: −20 missing budget, −20 missing deadline, −15 vague scope, −10 poor formatting. Triage thresholds: ≥90 auto-approved, 70–89 needs review, <70 critical/manual.
