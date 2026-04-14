from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from liquidity_model import run_simulation_api

app = FastAPI()

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/simulate")
def simulate():
    # Runs the generation and metric calculation and returns the data
    data = run_simulation_api()
    return data

@app.get("/")
def read_root():
    return {"message": "Bank Liquidity API is running!"}
