from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class StakeStatus(str, Enum):
    active = "active"
    completed = "completed"
    failed = "failed"
    pending_verification = "pending_verification"
    cancelled = "cancelled"


class UrgencyLevel(str, Enum):
    urgent = "urgent"
    soon = "soon"
    flexible = "flexible"


# --- Stakes ---

class StakeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str
    stake_amount: int = Field(..., ge=1, le=500)
    deadline: datetime
    anti_charity_id: str
    custom_charity_name: Optional[str] = Field(default=None, max_length=200)


class StakeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    category: str
    stake_amount: int
    deadline: datetime
    anti_charity_id: str
    anti_charity_name: str
    status: StakeStatus
    proof_url: Optional[str]
    verification_result: Optional[str]
    stripe_payment_intent_id: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]


class StakeListResponse(BaseModel):
    stakes: list[StakeResponse]
    total: int


class CancelStakeRequest(BaseModel):
    emergency: bool = False  # informational only — server determines based on time


# --- Payments ---

class PaymentIntentCreate(BaseModel):
    amount: int = Field(..., ge=1, le=500)


class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: int


# --- Users ---

class UserProfile(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    streak: int = 0
    total_staked: int = 0
    total_saved: int = 0
    total_lost: int = 0
    stakes_completed: int = 0
    stakes_failed: int = 0
    created_at: datetime


class UserStats(BaseModel):
    at_stake: int
    saved: int
    lost: int
    active_count: int
    completed_count: int
    failed_count: int
    success_rate: float
    current_streak: int


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


# --- Proof ---

class ProofVerificationResult(BaseModel):
    verified: bool
    confidence: float
    reasoning: str
    stake_id: str