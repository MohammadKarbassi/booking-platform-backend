import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool


def _database_url() -> str:
    """Local default, or the hosted one. Neon/Vercel give `postgres://…`; SQLAlchemy wants the psycopg dialect."""
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or \
        "postgresql+psycopg://booking:booking@localhost:5432/booking"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _database_url()
# serverless (Vercel): every invocation may be a fresh process, so don't hold a pool; Neon pools on its side
engine = create_engine(DATABASE_URL, pool_pre_ping=True, **({"poolclass": NullPool} if os.getenv("VERCEL") else {}))
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as db:
        yield db
