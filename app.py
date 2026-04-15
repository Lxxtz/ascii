from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from liquidity_model import BankSimulationEngine, SOLUTIONS

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

class SolutionRequest(BaseModel):
    solution_id: str

@app.post("/api/start")
def start_simulation():
    engine.reset()
    return {"status": "started", "history": engine.history}

@app.post("/api/trigger-crisis")
def trigger_crisis():
    engine.trigger_crisis()
    return {"status": "crisis_triggered"}

@app.post("/api/apply-solution")
def apply_solution(req: SolutionRequest):
    success, message = engine.apply_solution(req.solution_id)
    return {
        "success": success,
        "message": message,
        "active_solutions": [
            {"id": s["id"], "title": s["title"], "remaining": s["remaining"]}
            for s in engine.active_solutions
        ],
    }

@app.get("/api/solutions")
def get_solutions():
    """Return the full solutions catalog for the frontend."""
    return {
        "solutions": {
            sid: {"title": s["title"], "description": s["description"], "severity": s["severity"]}
            for sid, s in SOLUTIONS.items()
        }
    }

@app.get("/api/step")
def step_simulation():
    # Execute exactly one daily tick
    record, alerts = engine.step()
    return {
        "record": record,
        "has_failed": engine.has_failed,
        "alerts": alerts,
        "active_solutions": [
            {"id": s["id"], "title": s["title"], "remaining": s["remaining"]}
            for s in engine.active_solutions
        ],
    }

@app.get("/")
def read_root():
    return {"message": "Bank Liquidity Real-Time API is running!"}
