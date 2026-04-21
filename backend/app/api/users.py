from fastapi import APIRouter, Depends
from datetime import datetime
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import UserStats, UserUpdate

router = APIRouter()


def calculate_streak(stakes: list[dict]) -> int:
    """
    Calculate consecutive completed stakes, most recent first.

    Rules:
    - 'completed' stakes add to the streak
    - 'failed' stakes or emergency exits break the streak
    - Grace-window cancels (status='cancelled' AND verification_result contains 'grace')
      are neutral — they don't affect the streak either way
    - 'active' or 'pending_verification' stakes are neutral (no decision yet)

    We walk through stakes in reverse-chronological order (newest first) and
    count completions until we hit something that breaks the streak.
    """
    # Sort stakes by completion time (most recent first), falling back to creation time
    decided = [
        s for s in stakes
        if s["status"] in ("completed", "failed", "cancelled")
    ]
    decided.sort(
        key=lambda s: s.get("completed_at") or s.get("created_at") or "",
        reverse=True,
    )

    streak = 0
    for s in decided:
        status = s["status"]
        if status == "completed":
            streak += 1
        elif status == "cancelled":
            # Free grace-window cancel → neutral, skip
            result = (s.get("verification_result") or "").lower()
            if "grace" in result:
                continue
            # Emergency exit (forfeit) → breaks streak
            break
        elif status == "failed":
            break

    return streak


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user profile with stats."""
    db = get_supabase()

    profile = (
        db.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )

    if not profile.data:
        new_profile = {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["email"].split("@")[0],
            "streak": 0,
            "total_staked": 0,
            "total_saved": 0,
            "total_lost": 0,
        }
        db.table("profiles").insert(new_profile).execute()
        return new_profile

    return profile.data


@router.patch("/me")
async def update_profile(
    data: UserUpdate,
    user: dict = Depends(get_current_user),
):
    """Update user profile."""
    db = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        return {"message": "Nothing to update"}

    result = (
        db.table("profiles")
        .update(update_data)
        .eq("id", user["id"])
        .execute()
    )

    return result.data[0] if result.data else {"message": "Updated"}


@router.get("/me/stats", response_model=UserStats)
async def get_stats(user: dict = Depends(get_current_user)):
    """Get user accountability stats."""
    db = get_supabase()

    stakes_result = (
        db.table("stakes")
        .select("stake_amount, status, created_at, completed_at, verification_result")
        .eq("user_id", user["id"])
        .execute()
    )

    all_stakes = stakes_result.data or []

    active = [s for s in all_stakes if s["status"] in ("active", "pending_verification")]
    completed = [s for s in all_stakes if s["status"] == "completed"]
    failed = [s for s in all_stakes if s["status"] == "failed"]

    total_decided = len(completed) + len(failed)
    success_rate = (len(completed) / total_decided * 100) if total_decided > 0 else 0

    current_streak = calculate_streak(all_stakes)

    return {
        "at_stake": sum(s["stake_amount"] for s in active),
        "saved": sum(s["stake_amount"] for s in completed),
        "lost": sum(s["stake_amount"] for s in failed),
        "active_count": len(active),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "success_rate": round(success_rate, 1),
        "current_streak": current_streak,
    }