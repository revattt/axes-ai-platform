# 🚀 Axes AI - Enterprise RFP Extraction & RAG Platform

Welcome to the **Axes AI** repository! This is a full-stack Enterprise SaaS platform designed to automate Request for Proposal (RFP) ingestion, perform Human-in-the-Loop (HITL) data triage, and provide hallucination-free AI responses using a local FAISS Vector Database (RAG).

## 📂 Repository Structure (Monorepo)
This platform is decoupled into three distinct layers:
* `frontend/` - Angular 17 SPA (UI & State Management)
* `backend-api/` - C# .NET Core API (Authentication, SQL Persistence, Routing)
* `ai-microservice/` - Python FastAPI (Gemini LLM interface, FAISS Vector DB, PyPDF2)

---

## 🛠️ Prerequisites
Before pulling this repository, ensure your machine has the following installed:
1. **[Node.js](https://nodejs.org/)** (v18 or higher)
2. **[Angular CLI](https://angular.io/cli)** (Run `npm install -g @angular/cli` in your terminal)
3. **[Python](https://www.python.org/downloads/)** (v3.10 or higher)
4. **[.NET 8.0 SDK](https://dotnet.microsoft.com/download)** (For the C# Backend)

---

## 💻 Step-by-Step Launch Guide

You will need to open **three separate terminal windows** to run the three layers of this architecture simultaneously.

### Step 1: Start the AI Microservice (Python)
This service handles all PDF extraction, vector embeddings, and LLM communication.

1. Open Terminal 1 and navigate to the microservice folder:
   ```bash
   cd ai-microservice

Create and activate a fresh Virtual Environment (crucial for installing AI packages):

Windows:

Create and activate a fresh Virtual Environment (crucial for installing AI packages):

Windows:
python -m venv venv
venv\Scripts\activate

Mac/Linux:
python3 -m venv venv
source venv/bin/activate
Install the required Machine Learning and Server libraries:

Install the required Machine Learning and Server libraries:
pip install fastapi uvicorn google-genai PyPDF2 sentence-transformers faiss-cpu numpy pydantic
Boot up the server:

Boot up the server:
python main.py
Wait until the terminal prints: --- Vector Database Ready! ---

Step 2: Start the Backend Gateway (C# .NET)
This service handles security and database persistence.

Open Terminal 2 and navigate to the C# folder:
cd backend-api

Boot up the server:
dotnet run

Step 3: Start the Enterprise Dashboard (Angular)
This is the front-end user interface.

Open Terminal 3 and navigate to the Angular folder:
cd frontend

Install all Node modules (this fetches the dependencies ignored by GitHub):
npm install

Launch the application:
ng serve --o
