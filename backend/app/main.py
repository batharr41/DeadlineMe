from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.api import stakes, payments, users
from app.core.config import settings
from app.services.deadline_checker import check_expired_stakes

logger = logging.getLogger("uvicorn.error")

# How often to scan for expired stakes (seconds)
DEADLINE_CHECK_INTERVAL = 60


async def deadline_checker_loop():
    """Background task that runs check_expired_stakes every minute."""
    logger.info(f"🕒 Deadline checker started — running every {DEADLINE_CHECK_INTERVAL}s")
    while True:
        try:
            await check_expired_stakes()
        except Exception as e:
            logger.exception(f"Deadline checker error: {e}")
        await asyncio.sleep(DEADLINE_CHECK_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background deadline checker on startup
    task = asyncio.create_task(deadline_checker_loop())
    yield
    # Cancel it on shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="DeadlineMe API",
    description="AI-powered accountability app that charges you real money when you miss deadlines.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(stakes.router, prefix="/api/stakes", tags=["Stakes"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])


@app.get("/")
async def root():
    return {"app": "DeadlineMe", "version": "1.0.0", "status": "running 🔥"}


@app.get("/health")
async def health():
    return {"status": "ok"}