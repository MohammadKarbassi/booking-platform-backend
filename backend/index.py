"""Vercel entry point: Vercel's FastAPI support serves the ASGI `app` found in this file, every route as-is."""
from app.main import app  # noqa: F401
