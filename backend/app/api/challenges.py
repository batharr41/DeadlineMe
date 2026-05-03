from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_supabase
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

router = APIRouter()


class ChallengeCreate(BaseModel):
    group_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = "other"
    deadline: datetime
    min_stake: int = Field(5, ge=1, le=500)


class ChallengeJoin(BaseModel):
    stake_amount: int = Field(..., ge=1, le=500)


@router.post("")
async def create_challenge(
    data: ChallengeCreate,
    user: dict = Depends(get_current_user),
):
    """Create a group challenge."""
    db = get_supabase()

    # Must be a group member
    membership = db.table("group_members").select("id").eq("group_id", data.group_id).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = db.table("group_challenges").insert({
        "group_id": data.group_id,
        "created_by": user["id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "deadline": data.deadline.isoformat(),
        "min_stake": data.min_stake,
        "status": "active",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create challenge")

    challenge = result.data[0]

    # Emit group event
    try:
        db.table("group_events").insert({
            "group_id": data.group_id,
            "user_id": user["id"],
            "event_type": "stake_created",
            "payload": {
                "title": f"🏆 Challenge: {data.title}",
                "is_challenge": True,
                "challenge_id": challenge["id"],
            },
        }).execute()
    except Exception:
        pass

    return challenge


@router.get("/group/{group_id}")
async def get_group_challenges(group_id: str, user: dict = Depends(get_current_user)):
    """Get all challenges for a group."""
    db = get_supabase()

    membership = db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    challenges = db.table("group_challenges").select("*").eq("group_id", group_id).order("created_at", desc=True).execute()

    result = []
    for c in (challenges.data or []):
        participants = db.table("challenge_participants").select("user_id, stake_amount, status").eq("challenge_id", c["id"]).execute()
        participant_ids = [p["user_id"] for p in (participants.data or [])]
        result.append({
            **c,
            "participants": participants.data or [],
            "participant_count": len(participant_ids),
            "user_joined": user["id"] in participant_ids,
        })

    return {"challenges": result}


@router.get("/{challenge_id}")
async def get_challenge(challenge_id: str, user: dict = Depends(get_current_user)):
    """Get a single challenge with participants."""
    db = get_supabase()

    challenge = db.table("group_challenges").select("*").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Verify membership
    membership = db.table("group_members").select("id").eq("group_id", challenge.data["group_id"]).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    participants_raw = db.table("challenge_participants").select("*").eq("challenge_id", challenge_id).execute()
    participant_ids = [p["user_id"] for p in (participants_raw.data or [])]

    profiles = db.table("profiles").select("id, display_name, streak").in_("id", participant_ids).execute()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    participants = []
    for p in (participants_raw.data or []):
        profile = profile_map.get(p["user_id"], {})
        participants.append({
            **p,
            "display_name": profile.get("display_name", "Unknown"),
            "streak": profile.get("streak", 0),
        })

    total_staked = sum(p["stake_amount"] for p in (participants_raw.data or []))

    return {
        **challenge.data,
        "participants": participants,
        "participant_count": len(participants),
        "total_staked": total_staked,
        "user_joined": user["id"] in participant_ids,
    }


@router.post("/{challenge_id}/join")
async def join_challenge(
    challenge_id: str,
    data: ChallengeJoin,
    user: dict = Depends(get_current_user),
):
    """Join a challenge by staking."""
    db = get_supabase()

    challenge = db.table("group_challenges").select("*").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if challenge.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Challenge is no longer active")

    if data.stake_amount < challenge.data["min_stake"]:
        raise HTTPException(status_code=400, detail=f"Minimum stake is ${challenge.data['min_stake']}")

    # Check already joined
    existing = db.table("challenge_participants").select("id").eq("challenge_id", challenge_id).eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already joined this challenge")

    # Create a regular stake linked to this challenge
    from app.services.stripe_service import create_stake_payment
    payment = await create_stake_payment(
        amount=data.stake_amount,
        user_id=user["id"],
        user_email=user["email"],
    )

    stake_result = db.table("stakes").insert({
        "user_id": user["id"],
        "title": challenge.data["title"],
        "description": f"Group challenge: {challenge.data.get('description', '')}",
        "category": challenge.data["category"],
        "stake_amount": data.stake_amount,
        "deadline": challenge.data["deadline"],
        "anti_charity_id": "humanitarian",
        "anti_charity_name": "Doctors Without Borders",
        "status": "active",
        "stripe_payment_intent_id": payment["payment_intent_id"],
    }).execute()

    stake_id = stake_result.data[0]["id"] if stake_result.data else None

    # Add participant
    db.table("challenge_participants").insert({
        "challenge_id": challenge_id,
        "user_id": user["id"],
        "stake_id": stake_id,
        "stake_amount": data.stake_amount,
        "status": "active",
    }).execute()

    return {
        "message": "Joined challenge",
        "client_secret": payment["client_secret"],
        "payment_intent_id": payment["payment_intent_id"],
        "stake_id": stake_id,
    }
