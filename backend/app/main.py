"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGIN
from app.routes import analyze, analyze_repo, cache_routes, repo
from app.services.cache import _ensure_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _ensure_db()
    yield


app = FastAPI(title="Code Review Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(analyze_repo.router)
app.include_router(repo.router)
app.include_router(cache_routes.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
