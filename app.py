from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from liquidity_model import BankSimulationEngine, SOLUTIONS
from email_alert import CrisisEmailAlert

app = FastAPI()

# Global state engine
engine = BankSimulationEngine()
email_service = CrisisEmailAlert()

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
    email_service.reset_alerts()
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

    # ── Check and send email alerts ──
    # Build a simplified record for the email checker using the model's forecasts
    lcr = record.get("LCR", 999)
    lstm_survival = record.get("LSTM_Survival", 365)
    prophet_survival = record.get("Prophet_Survival", 365)

    # Use the more conservative (lower) of the two survival forecasts
    predicted_survival = min(
        lstm_survival if lstm_survival is not None else 365,
        prophet_survival if prophet_survival is not None else 365,
    )

    email_record = {
        **record,
        "Predicted_Survival_Days": predicted_survival,
    }
    email_result = email_service.check_and_alert(email_record)

    return {
        "record": record,
        "has_failed": engine.has_failed,
        "alerts": alerts,
        "email_alerts": email_result,
        "active_solutions": [
            {"id": s["id"], "title": s["title"], "remaining": s["remaining"]}
            for s in engine.active_solutions
        ],
    }

from pydantic import BaseModel

class ReportPayload(BaseModel):
    image_data: str

@app.post("/api/send-insolvency-report")
def send_insolvency_report_api(payload: ReportPayload):
    success = email_service.send_insolvency_report(payload.image_data)
    if success:
        return {"status": "success", "message": "Report sent"}
    else:
        return {"status": "error", "message": "Failed to send report"}

@app.get("/")
def read_root():
    return {"message": "Bank Liquidity Real-Time API is running!"}
