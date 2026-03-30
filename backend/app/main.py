"""CertPrep API — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, content, onboarding, progress, study
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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
