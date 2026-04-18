import json
import PyPDF2
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel # Added to handle incoming text questions
from dotenv import load_dotenv
from google import genai
import os
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# --- NEW RAG IMPORTS ---
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# ==========================================
# 1. GLOBAL INITIALIZATION
# ==========================================
load_dotenv()
# Initialize the Gemini AI Client
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("CRITICAL ERROR: GEMINI_API_KEY is missing from the .env file!")
client = genai.Client(api_key=GOOGLE_API_KEY)

app = FastAPI(title="Axes AI Extraction Engine")

# ==========================================
# NEW: CORS SECURITY CONFIGURATION
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"], # The VIP List (Your Angular App)
    allow_credentials=True,
    allow_methods=["*"], # Allow POST, GET, PUT, DELETE, etc.
    allow_headers=["*"], # Allow all headers
)

# Initialize the RAG Vector Database
print("Loading Embedding Model and Building FAISS Index (This takes a few seconds)...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Our Mock Enterprise Knowledge Base 
knowledge_base = [
    "We use AWS US-East for all cloud hosting and infrastructure.",
    "Our data is encrypted at rest using AES-256 and in transit via TLS 1.2.",
    "Customer support is available 24/7 via phone and email with a 1-hour SLA.",
    "We are fully SOC 2 Type II and ISO 27001 compliant.",
    "Our standard project deployment timeline is 4 to 6 weeks.",
    "We support SSO integrations with Okta, Azure AD, and Google Workspace."
]

# Convert the text into mathematical coordinates and load them into FAISS
kb_vectors = embedding_model.encode(knowledge_base)
dimension = kb_vectors.shape[1]
faiss_index = faiss.IndexFlatL2(dimension)
faiss_index.add(kb_vectors)
print("--- Vector Database Ready! ---")


# ==========================================
# 2. API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {"status": "AI Microservice is online and ready."}

# --- ENDPOINT 1: THE INGESTION ENGINE (Existing) ---
@app.post("/api/extract")
async def extract_rfp_data(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # Read the PDF File
        pdf_reader = PyPDF2.PdfReader(file.file)
        extracted_text = ""
        
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")

        # The Prompt Engineering
        prompt = f"""
        You are an expert Enterprise IT Presales Architect. 
        Read the following RFP (Request for Proposal) document text and extract the key information.
        
        You MUST return ONLY a raw, valid JSON object. Do not include markdown formatting like ```json.
        
        Use this exact JSON structure:
        {{
            "mandatory_tech_stack": ["item 1", "item 2"],
            "budget_mentioned": "Extract any budget numbers or write 'Not Specified'",
            "submission_deadline": "Extract the deadline date or write 'Not Specified'",
            "compliance_requirements": ["list any ISO, SOC2, or legal compliance mentioned"],
            "ai_confidence_score": 85,
            "risk_assessment": [
                {{"severity": "High", "issue": "Provide specific reason why points were deducted"}},
                {{"severity": "Medium", "issue": "Provide another specific reason"}}
            ]
        }}
        
        CRITICAL INSTRUCTION FOR 'ai_confidence_score':
        Do not grade your ability to read the text. You MUST grade the COMPLETENESS and QUALITY of the RFP data based on the following strict rubric. 

        Start at a base score of 100, and apply the following penalties:
        - DEDUCT 20 POINTS if the Budget is missing, vague, or states "TBD".
        - DEDUCT 20 POINTS if the Submission Deadline is missing or unclear.
        - DEDUCT 15 POINTS if the Scope of Work is severely lacking detail.
        - DEDUCT 10 POINTS if formatting is highly erratic or sections are clearly missing.

        CRITICAL INSTRUCTION FOR 'risk_assessment':
        If the ai_confidence_score is below 100, you MUST populate the 'risk_assessment' array detailing EXACTLY why you deducted points based on the rubric above.
        Use "High" severity for missing budgets, missing deadlines, or severe lack of scope. 
        Use "Medium" severity for vague formatting or missing compliance details. 
        If the score is 100, return an empty array [].

        If the document is poorly designed and missing critical business data, your ai_confidence_score MUST be below 60.

        RFP TEXT:
        {extracted_text}
        """

        # Ask the AI
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        ai_text = response.text.strip()

        # Clean up the response in case the AI added markdown blocks by mistake
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:-3]
        elif ai_text.startswith("```"):
            ai_text = ai_text[3:-3]

        # Convert the AI's text response into an actual JSON object
        structured_data = json.loads(ai_text)

        return structured_data

    except json.JSONDecodeError as e:
        print(f"JSON PARSING FAILED. Raw AI Output was:\n{ai_text}")
        raise HTTPException(status_code=500, detail="Gemini returned invalid JSON format.")
        
    except Exception as e:
        print("=== FATAL PYTHON CRASH ===")
        traceback.print_exc() 
        print("==========================")
        raise HTTPException(status_code=500, detail=f"Python AI Engine Crashed: {str(e)}")


# --- ENDPOINT 2: THE ANSWER LIBRARY (New RAG Engine) ---
class RagRequest(BaseModel):
    question: str

@app.post("/api/ask")
async def answer_rfp_question(request: RagRequest):
    try:
        print(f"Incoming RFP Question: {request.question}")
        
        # 1. Translate the incoming question into math
        question_vector = embedding_model.encode([request.question])
        
        # 2. Search FAISS for the Top 2 closest matches
        distances, indices = faiss_index.search(question_vector, k=2)
        
        # 3. Grab the actual text of those matches
        retrieved_contexts = []
        for idx in indices[0]:
            retrieved_contexts.append(knowledge_base[idx])
            
        context_string = "\n- ".join(retrieved_contexts)
        print(f"Found Contexts: {retrieved_contexts}")
        
        # 4. THE MAGIC: Send the context AND the question to Gemini
        rag_prompt = f"""
        You are an expert Enterprise Sales Engineer writing a proposal response. 
        Answer the client's RFP question using ONLY the provided Knowledge Base context below.
        Be professional, clear, and concise.
        
        If the context does not contain the answer, politely state: "I do not have enough information to answer this based on the current knowledge base."
        Do NOT invent or assume any information outside of the provided context.
        
        RFP QUESTION: {request.question}
        
        KNOWLEDGE BASE CONTEXT:
        - {context_string}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=rag_prompt
        )
        
        # 5. Return the AI's drafted answer AND the raw context it used
        return {
            "generated_answer": response.text.strip(),
            "sources_used": retrieved_contexts
        }

    except Exception as e:
        print("=== RAG SEARCH CRASH ===")
        traceback.print_exc() 
        print("==========================")
        raise HTTPException(status_code=500, detail=f"RAG Engine Crashed: {str(e)}")


@app.post("/api/train")
async def train_knowledge_base(file: UploadFile = File(...)):
    """Upload a company document to permanently teach the AI new facts."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for training.")

    try:
        print(f"Ingesting new training document: {file.filename}")
        
        # 1. Read the PDF
        pdf_reader = PyPDF2.PdfReader(file.file)
        raw_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                raw_text += text + "\n"

        # 2. CHUNKING: Split the massive text into bite-sized paragraphs
        # We split by double newlines, removing empty spaces
        chunks = [chunk.strip() for chunk in raw_text.split('\n\n') if len(chunk.strip()) > 50]
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract readable paragraphs.")

        # 3. EMBEDDING: Convert the new paragraphs into math
        new_vectors = embedding_model.encode(chunks)
        
        # 4. STORAGE: Add the new math to the active FAISS room
        faiss_index.add(new_vectors)
        
        # 5. Add the raw text to our global Knowledge Base array so the AI can read it later
        knowledge_base.extend(chunks)
        
        print(f"Successfully learned {len(chunks)} new facts!")
        
        return {
            "message": "Knowledge Base Upgraded Successfully!",
            "document": file.filename,
            "new_facts_learned": len(chunks),
            "total_knowledge_base_size": len(knowledge_base)
        }

    except Exception as e:
        print("=== TRAINING CRASH ===")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")
        
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)