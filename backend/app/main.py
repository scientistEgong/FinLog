from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS, CURRENCY_CODE
from app.database import engine, ensure_data_dir, get_db
from app.init_db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_data_dir()
    init_db(engine)
    yield


app = FastAPI(title=f"{APP_NAME} API", version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))  # proves the database connection works
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION, "currency": CURRENCY_CODE}
