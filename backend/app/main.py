"""SparkUpCloud API — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, contact, content, learning_paths, mock_exam, onboarding, payments, progress, study, tutor
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix=f"/api/{settings.api_version}")
app.include_router(onboarding.router, prefix=f"/api/{settings.api_version}")
app.include_router(study.router, prefix=f"/api/{settings.api_version}")
app.include_router(progress.router, prefix=f"/api/{settings.api_version}")
app.include_router(content.router, prefix=f"/api/{settings.api_version}")
app.include_router(admin.router, prefix=f"/api/{settings.api_version}")
app.include_router(contact.router, prefix=f"/api/{settings.api_version}")
app.include_router(payments.router, prefix=f"/api/{settings.api_version}")
app.include_router(mock_exam.router, prefix=f"/api/{settings.api_version}")
app.include_router(tutor.router, prefix=f"/api/{settings.api_version}")
app.include_router(learning_paths.router, prefix=f"/api/{settings.api_version}")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
