from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

print("Loading AI Model (This takes a few seconds the first time)...")
# 1. Load the Translator. This is a tiny, free AI model that turns text into numbers.
model = SentenceTransformer('all-MiniLM-L6-v2')

# 2. Our Fake Database of Past RFP Answers
past_answers = [
    "We use AWS for all cloud hosting and infrastructure.",
    "Our data is encrypted at rest using AES-256.",
    "Customer support is available 24/7 via phone and email.",
    "We are fully SOC 2 Type II compliant."
]

print("Translating past answers into math (Vectors)...")
# 3. Convert sentences to Vectors (lists of floating-point numbers)
answer_vectors = model.encode(past_answers)

# 4. Create the FAISS Index (The Mathematical Room)
# We tell FAISS how many dimensions our room has (this model uses 384 dimensions)
dimension = answer_vectors.shape[1] 
index = faiss.IndexFlatL2(dimension)

# Put our translated answers into the room
index.add(answer_vectors) 

print("--- FAISS DATABASE READY ---\n")

# 5. The New RFP Question!
question = "Where are your servers located?"

# Translate the question into a coordinate
question_vector = model.encode([question])

# 6. Search the Room! (k=1 means 'Find the 1 closest match')
distances, indices = index.search(question_vector, k=1)

# Get the winning answer's index number
winning_index = indices[0][0]

print(f"RFP Question: '{question}'")
print(f"Best Match Found: '{past_answers[winning_index]}'")