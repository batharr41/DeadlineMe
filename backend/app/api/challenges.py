from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_supabase
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

router = APIRouter()


class ChallengeCreate(BaseModel):
    group_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = "other"
    deadline: datetime
    min_stake: int = Field(5, ge=1, le=500)


class ChallengeJoinWithStake(BaseModel):
    payment_intent_id: str
    stake_amount: int = Field(..., ge=1, le=500)


def _resolve_challenge_status(challenge: dict) -> str:
    """Return real status based on deadline, ignoring stale DB value."""
    deadline = challenge.get("deadline")
    if not deadline:
        return challenge.get("status", "active")
    try:
        dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if dl < datetime.now(timezone.utc):
            return "expired"
    except Exception:
        pass
    return challenge.get("status", "active")


@router.post("")
async def create_challenge(
    data: ChallengeCreate,
    user: dict = Depends(get_current_user),
):
    db = get_supabase()

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

    try:
        db.table("group_events").insert({
            "group_id": data.group_id,
            "user_id": user["id"],
            "event_type": "stake_created",
            "payload": {
                "title": f"🏆 Challenge created: {data.title}",
                "is_challenge": True,
                "challenge_id": challenge["id"],
            },
        }).execute()
    except Exception:
        pass

    return challenge


@router.get("/group/{group_id}")
async def get_group_challenges(group_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    membership = db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    challenges = db.table("group_challenges").select("*").eq("group_id", group_id).order("created_at", desc=True).execute()

    result = []
    for c in (challenges.data or []):
        participants = db.table("challenge_participants").select("user_id, stake_amount, status").eq("challenge_id", c["id"]).execute()
        participant_ids = [p["user_id"] for p in (participants.data or [])]

        # Compute real status based on deadline
        real_status = _resolve_challenge_status(c)

        result.append({
            **c,
            "status": real_status,
            "participants": participants.data or [],
            "participant_count": len(participant_ids),
            "user_joined": user["id"] in participant_ids,
        })

    return {"challenges": result}


@router.get("/{challenge_id}")
async def get_challenge(challenge_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    challenge = db.table("group_challenges").select("*").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    membership = db.table("group_members").select("id").eq("group_id", challenge.data["group_id"]).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    participants_raw = db.table("challenge_participants").select("*").eq("challenge_id", challenge_id).execute()
    participant_ids = [p["user_id"] for p in (participants_raw.data or [])]

    profiles = db.table("profiles").select("id, display_name, streak").in_("id", participant_ids).execute() if participant_ids else type('obj', (object,), {'data': []})()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    # Sync participant status from their actual stakes
    participants = []
    for p in (participants_raw.data or []):
        profile = profile_map.get(p["user_id"], {})
        stake_status = p.get("status", "active")

        # Pull real status from the stake if linked
        if p.get("stake_id"):
            stake = db.table("stakes").select("status").eq("id", p["stake_id"]).single().execute()
            if stake.data:
                stake_status = stake.data["status"]
                # Sync back if changed
                if stake_status != p.get("status"):
                    db.table("challenge_participants").update({"status": stake_status}).eq("id", p["id"]).execute()

        participants.append({
            **p,
            "status": stake_status,
            "display_name": profile.get("display_name", "Unknown"),
            "streak": profile.get("streak", 0),
        })

    total_staked = sum(p["stake_amount"] for p in (participants_raw.data or []))
    real_status = _resolve_challenge_status(challenge.data)

    return {
        **challenge.data,
        "status": real_status,
        "participants": participants,
        "participant_count": len(participants),
        "total_staked": total_staked,
        "user_joined": user["id"] in participant_ids,
    }


@router.post("/{challenge_id}/join")
async def join_challenge(
    challenge_id: str,
    data: ChallengeJoinWithStake,
    user: dict = Depends(get_current_user),
):
    db = get_supabase()

    challenge = db.table("group_challenges").select("*").eq("id", challenge_id).single().execute()
    if not challenge.data:
        raise HTTPException(status_code=404, detail="Challenge not found")

    real_status = _resolve_challenge_status(challenge.data)
    if real_status == "expired":
        raise HTTPException(status_code=400, detail="Challenge has expired")

    existing = db.table("challenge_participants").select("id").eq("challenge_id", challenge_id).eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already joined this challenge")

    # Create a regular stake linked to this challenge
    stake_result = db.table("stakes").insert({
        "user_id": user["id"],
        "title": challenge.data["title"],
        "description": f"Group challenge",
        "category": challenge.data.get("category", "other"),
        "stake_amount": data.stake_amount,
        "deadline": challenge.data["deadline"],
        "anti_charity_id": "humanitarian",
        "anti_charity_name": "Doctors Without Borders",
        "status": "active",
        "stripe_payment_intent_id": data.payment_intent_id,
    }).execute()

    if not stake_result.data:
        raise HTTPException(status_code=500, detail="Failed to create stake")

    stake_id = stake_result.data[0]["id"]

    db.table("challenge_participants").insert({
        "challenge_id": challenge_id,
        "user_id": user["id"],
        "stake_id": stake_id,
        "stake_amount": data.stake_amount,
        "status": "active",
    }).execute()

    # Fix: pass stake_amount not undefined
    try:
        db.table("group_events").insert({
            "group_id": challenge.data["group_id"],
            "user_id": user["id"],
            "stake_id": stake_id,
            "event_type": "stake_created",
            "payload": {
                "title": challenge.data["title"],
                "stake_amount": data.stake_amount,  # was missing before
                "is_challenge": True,
            },
        }).execute()
    except Exception:
        pass

    return {
        "message": "Joined challenge",
        "stake_id": stake_id,
        "challenge_id": challenge_id,
    }
