from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import Base, engine
from .routers import accommodations, admin, auth, bookings, catalog, favorites, payments, waitlist


@asynccontextmanager
async def lifespan(_app):
    Base.metadata.create_all(engine)  # shortcut: no Alembic migrations yet; add them before the schema changes
    yield


app = FastAPI(lifespan=lifespan, title="Accommodation Booking API", version="1.0",
              description="Backend for the bootcamp booking platform, built on the 21-table ERD. "
                          "Login: POST /auth/otp/request then /auth/otp/verify, then click **Authorize**.")
for r in (auth, catalog, accommodations, bookings, payments, waitlist, favorites, admin):
    app.include_router(r.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
