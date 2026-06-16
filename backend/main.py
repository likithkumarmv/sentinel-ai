from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from database import engine, Base
from routes.interview import router as interview_router
from routes.analysis import router as analysis_router
from routes.scorecard import router as scorecard_router
from routes.transcription import router as transcription_router
from routes.detection import router as detection_router
from routes.evaluation import router as evaluation_router
from routes.mentor import router as mentor_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Sentinel AI", description="Multi-Agent Interview Simulator", version="1.0.0")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    
    # Run dynamic SQLite migrations for new columns
    from sqlalchemy import text
    from database import SessionLocal
    db = SessionLocal()
    try:
        cursor = db.execute(text("PRAGMA table_info(interview_sessions)"))
        columns = [row[1] for row in cursor.fetchall()]
        
        if "local_inference" not in columns:
            print("[*] Migration: Adding local_inference column to interview_sessions")
            db.execute(text("ALTER TABLE interview_sessions ADD COLUMN local_inference BOOLEAN DEFAULT 0"))
            
        if "personality_style" not in columns:
            print("[*] Migration: Adding personality_style column to interview_sessions")
            db.execute(text("ALTER TABLE interview_sessions ADD COLUMN personality_style VARCHAR(50) DEFAULT 'Standard Brutal'"))
            
        if "scorecard_json" not in columns:
            print("[*] Migration: Adding scorecard_json column to interview_sessions")
            db.execute(text("ALTER TABLE interview_sessions ADD COLUMN scorecard_json TEXT"))
            
        db.commit()
        print("[+] SQLite migrations completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[-] Migration error: {e}")
    finally:
        db.close()
        
    print("[+] Sentinel AI Backend Started!")
    print("[i] API Docs: http://localhost:8000/docs")
    print("[*] LLM Provider: Groq Cloud")
    print("[*] LLM Model: " + os.getenv("GROQ_MODEL", "llama3-8b-8192"))

app.include_router(interview_router, prefix="/api/interview", tags=["Interview"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(scorecard_router, prefix="/api/scorecard", tags=["Scorecard"])
app.include_router(transcription_router, prefix="/api/transcription", tags=["Transcription"])
app.include_router(detection_router, prefix="/api/detection", tags=["Detection"])
app.include_router(evaluation_router, prefix="/api/evaluation", tags=["Evaluation"])
app.include_router(mentor_router, prefix="/api/mentor", tags=["Mentor"])

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Sentinel AI backend is running."}

@app.get("/")
async def root():
    return {"message": "Sentinel AI backend is running.", "status": "operational"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
