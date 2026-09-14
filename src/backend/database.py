"""SQLAlchemy database engine and session configuration."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path
import os

_BACKEND = Path(__file__).resolve().parent
_SRC = _BACKEND.parent
_ROOT = _SRC.parent
for env_path in (_ROOT / ".env", _SRC / ".env", _BACKEND / ".env"):
    load_dotenv(env_path, override=False)

_DEFAULT_PG = "postgresql://postgres:postgres@localhost:5432/harborlens"
_SQLITE_FALLBACK = "sqlite:///" + str(_BACKEND / "harborlens.db").replace("\\", "/")

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_PG)


def _sqlalchemy_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        url = "postgresql+psycopg2://" + url[len("postgresql://") :]
    return url


_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    _sqlalchemy_url(DATABASE_URL),
    pool_pre_ping=True,
    connect_args=_connect_args,
    pool_recycle=300,
)

_explicit = bool(os.getenv("DATABASE_URL"))
if DATABASE_URL.startswith("postgresql") and not _explicit:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        DATABASE_URL = os.getenv("DATABASE_URL_FALLBACK", _SQLITE_FALLBACK)
        _connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
        engine = create_engine(_sqlalchemy_url(DATABASE_URL), pool_pre_ping=True, connect_args=_connect_args)
        print("[harborlens] local Postgres unreachable — using SQLite fallback")
elif DATABASE_URL.startswith("postgresql"):
    print("[harborlens] using configured PostgreSQL (Neon/remote)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
