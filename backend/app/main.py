"""SparkUpCloud API — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, contact, content, learning_paths, mock_exam, onboarding, payments, progress, study, tutor
from app.config import settings

# Public-facing API identity. Hard-coded so the title shown in the OpenAPI
# spec / docs / root response is always "SparkUpCloud API" — not whatever
# any `.env` happens to set.
API_NAME = "SparkUpCloud API"
API_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=API_NAME,
    version=API_VERSION,
    description="SparkUpCloud — AI-powered cloud certification exam prep platform.",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Public health/info endpoint."""
    return {
        "name": API_NAME,
        "version": API_VERSION,
        "docs": "/docs",
        "status": "ok",
    }

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
    return {"status": "ok", "name": API_NAME, "version": API_VERSION}
