import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import stakes, payments, users, groups
from app.core.config import settings


async def deadline_checker_loop():
    """Run deadline checker every 60 seconds in the background."""
    from app.services.deadline_checker import check_expired_stakes
    while True:
        try:
            await check_expired_stakes()
        except Exception as e:
            print(f"[deadline_checker_loop] Error: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background deadline checker on startup
    task = asyncio.create_task(deadline_checker_loop())
    print("✅ Deadline checker started.")
    yield
    # Shutdown
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(stakes.router, prefix="/api/stakes", tags=["Stakes"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])


@app.get("/")
async def root():
    return {"app": "DeadlineMe", "version": "1.0.0", "status": "running 🔥"}


@app.get("/health")
async def health():
    return {"status": "ok"}
