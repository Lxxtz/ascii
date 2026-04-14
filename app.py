from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from liquidity_model import BankSimulationEngine

app = FastAPI()

# Global state engine
engine = BankSimulationEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/start")
def start_simulation():
    engine.reset()
    return {"status": "started", "history": engine.history}

@app.post("/api/trigger-crisis")
def trigger_crisis():
    engine.trigger_crisis()
    return {"status": "crisis_triggered"}

@app.get("/api/step")
def step_simulation():
    # Execute exactly one daily tick
    record = engine.step()
    # Massively highly optimized API payload sending only O(1) bytes every tick
    return {"record": record, "has_failed": engine.has_failed}

@app.get("/")
def read_root():
    return {"message": "Bank Liquidity Real-Time API is running!"}
