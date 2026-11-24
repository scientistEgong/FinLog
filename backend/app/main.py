"""Assemble the FastAPI application and connect HTTP requests to app services."""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS, CURRENCY_CODE
from app.database import ensure_data_dir, get_db, init_db
from app.routers import categories, settings, transactions
from app.services.errors import ConflictError, DomainValidationError, NotFoundError


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Prepare storage and missing tables; startup never seeds financial records.
    ensure_data_dir()
    init_db()
    yield


app = FastAPI(title=f"{APP_NAME} API", version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def _not_found(_request: Request, exc: NotFoundError):
    # Keep service-layer errors independent of HTTP while returning consistent status codes.
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
async def _conflict(_request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(DomainValidationError)
async def _invalid(_request: Request, exc: DomainValidationError):
    # Match FastAPI's validation envelope so the client can attach messages to fields.
    loc = ["body", exc.field] if exc.field else ["body"]
    return JSONResponse(status_code=422, content={"detail": [{"loc": loc, "msg": str(exc)}]})


app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(settings.router)


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))  # proves the database connection works
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION, "currency": CURRENCY_CODE}
