from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import stakes, payments, users, groups
from app.core.config import settings

app = FastAPI(
    title="DeadlineMe API",
    description="AI-powered accountability app that charges you real money when you miss deadlines.",
    version="1.0.0",
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
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])


@app.get("/")
async def root():
    return {"app": "DeadlineMe", "version": "1.0.0", "status": "running 🔥"}


@app.get("/health")
async def health():
    return {"status": "ok"}
