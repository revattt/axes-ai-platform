# 🚀 Axes AI - Enterprise RFP Extraction & RAG Platform

Welcome to the **Axes AI** repository! This is a full-stack Enterprise SaaS platform designed to automate Request for Proposal (RFP) ingestion, perform Human-in-the-Loop (HITL) data triage, and provide hallucination-free AI responses using a local FAISS Vector Database (RAG).

## 📂 Repository Structure (Monorepo)
This platform is decoupled into three distinct layers:
* `frontend/` - Angular 17 SPA (UI, Tailwind CSS, State Management)
* `backend-api/` - C# .NET Core API (Authentication, SQL Persistence, Routing)
* `ai-microservice/` - Python FastAPI (Gemini 2.5 Flash LLM interface, FAISS Vector DB, PyPDF2)

---

## 🛠️ Prerequisites
Before pulling this repository, ensure your local machine has the following installed:
1. **[Node.js](https://nodejs.org/)** (v18 or higher)
2. **[Angular CLI](https://angular.io/cli)** (Run `npm install -g @angular/cli` in your terminal)
3. **[Python](https://www.python.org/downloads/)** (v3.10 or higher)
4. **[.NET 8.0 SDK](https://dotnet.microsoft.com/download)** (For the C# Backend)

---

## 💻 Step-by-Step Launch Guide

To run the full architecture, you will need to open **three separate terminal windows** and boot up each layer simultaneously.

### Step 1: Start the AI Microservice (Python)
This service handles all PDF extraction, semantic chunking, vector embeddings, and LLM communication.

1. Open Terminal 1 and navigate to the microservice folder:
   ```bash
   cd ai-microservice
   ```
2. Create and activate a fresh Virtual Environment (crucial for isolating AI dependencies):
   * **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   * **Mac/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install the required Machine Learning and Server libraries:
   ```bash
   pip install fastapi uvicorn google-genai PyPDF2 sentence-transformers faiss-cpu numpy pydantic python-dotenv
   ```
4. **Security Setup:** Create a new file named `.env` inside the `ai-microservice` folder and add your Gemini API key:
   ```text
   GEMINI_API_KEY=your_api_key_here
   ```
5. Boot up the FastAPI server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Wait until the terminal prints: `--- Vector Database Ready! ---`*

### Step 2: Start the Backend Gateway (C# .NET)
This service acts as the secure traffic controller and handles database persistence.

1. Open Terminal 2 and navigate to the C# folder:
   ```bash
   cd backend-api
   ```
2. Boot up the server:
   ```bash
   dotnet run
   ```
   *Ensure this starts successfully. Check the terminal output to see which port it binds to (typically `https://localhost:5001` or `http://localhost:5000`).*

### Step 3: Start the Enterprise Dashboard (Angular)
This is the client-facing user interface.

1. Open Terminal 3 and navigate to the Angular folder:
   ```bash
   cd frontend
   ```
2. Install all Node modules (this fetches the frontend dependencies ignored by GitHub):
   ```bash
   npm install
   ```
3. Launch the application:
   ```bash
   ng serve -o
   ```
   *Your default browser will automatically open and navigate to `http://localhost:4200`.*

---

## ⚠️ Important Notes for Testers & Developers
* **API Keys:** The Google Gemini API key is managed via a hidden `.env` file and is explicitly ignored by source control. **Never commit your `.env` file to GitHub.**
* **CORS Errors:** If the Angular UI fails to fetch data, ensure the Python server is running on exactly `127.0.0.1:8000` and the Angular app is on `localhost:4200`. Cross-Origin Resource Sharing (CORS) is strictly enforced.
* **Dynamic KB Training:** When you upload a PDF to the Knowledge Base via the UI, the semantic vectors are saved to the system's RAM via FAISS. If you terminate the Python server, you will need to re-upload the document for the AI to retain those specific facts.

---

## 🌐 Production-Ready Configuration (No hardcoded localhost)

### Backend (`backend-api`)

This project is configured to use **Supabase Postgres** by default.

Set these environment variables before running:

```bash
export SUPABASE_DB_CONNECTION="Host=<host>;Port=5432;Database=postgres;Username=postgres;Password=<password>;SSL Mode=Require;Trust Server Certificate=true"
export ASPNETCORE_URLS="http://0.0.0.0:5093"
```

Optional app settings:
- `AllowedOrigins` in `backend-api/appsettings.json` controls CORS origins.
- `AiService:BaseUrl` in `backend-api/appsettings.json` controls where the backend calls `/api/extract`.

### Frontend (`frontend`)

Frontend base URLs are environment-driven:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production build)

Update `environment.prod.ts` with your deployed backend/AI URLs before shipping.

---

## 🐳 One-command Docker run (no manual base URL edits)

All services can now run together via Docker with reverse-proxy routing:
- Frontend served at `http://localhost:4200`
- Browser calls backend as `/api/...`
- Browser calls AI service as `/ai/...`
- No per-machine frontend base URL edits required

### 1) Create env file

```bash
cp .env.example .env
```

Edit `.env` with:
- `SUPABASE_DB_CONNECTION`
- `GEMINI_API_KEY`
- `ALLOWED_ORIGINS` (keep `http://localhost:4200` for local)

### 2) Start everything

```bash
docker compose up --build
```

### 3) Open app

Visit `http://localhost:4200`.
