
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf, auth, ai

app = FastAPI(title="EduAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf.router, prefix="/pdf", tags=["PDF"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(ai.router, prefix="/ai", tags=["AI Study Assistant"])

@app.get("/")
def root():
    return {"message": "Welcome to EduAI", "status": "running"}

@app.get("/about")
def about():
    return {"project": "EduAI", "creator": "Vraj Patel", "version": "1.0.0"}
