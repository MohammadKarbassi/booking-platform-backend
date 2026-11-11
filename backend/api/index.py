"""Vercel entry point: the Python runtime serves the ASGI `app` found here (see vercel.json)."""
from app.main import app  # noqa: F401
