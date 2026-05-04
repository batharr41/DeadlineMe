from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import UserStats, UserUpdate
import re

router = APIRouter()


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    db = get_supabase()
    profile = db.table("profiles").select("*").eq("id", user["id"]).single().execute()
    if not profile.data:
        new_profile = {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["email"].split("@")[0],
            "streak": 0, "total_staked": 0, "total_saved": 0, "total_lost": 0,
        }
        db.table("profiles").insert(new_profile).execute()
        return new_profile
    return profile.data


@router.patch("/me")
async def update_profile(data: UserUpdate, user: dict = Depends(get_current_user)):
    db = get_supabase()
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        return {"message": "Nothing to update"}

    # Validate username if provided
    if "username" in update_data:
        username = update_data["username"]
        if not re.match(r'^[a-z0-9_.]{3,20}$', username):
            raise HTTPException(status_code=400, detail="Invalid username format")
        # Check uniqueness
        existing = db.table("profiles").select("id").eq("username", username).execute()
        if existing.data and existing.data[0]["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="Username already taken")

    result = db.table("profiles").update(update_data).eq("id", user["id"]).execute()
    return result.data[0] if result.data else {"message": "Updated"}


@router.get("/check-username/{username}")
async def check_username(username: str, user: dict = Depends(get_current_user)):
    """Check if a username is available."""
    if not re.match(r'^[a-z0-9_.]{3,20}$', username):
        return {"available": False, "reason": "Invalid format"}
    db = get_supabase()
    existing = db.table("profiles").select("id").eq("username", username).execute()
    taken = bool(existing.data and existing.data[0]["id"] != user["id"])
    return {"available": not taken, "username": username}


@router.get("/me/stats", response_model=UserStats)
async def get_stats(user: dict = Depends(get_current_user)):
    db = get_supabase()
    stakes = db.table("stakes").select("stake_amount, status").eq("user_id", user["id"]).execute()
    all_stakes = stakes.data or []
    active = [s for s in all_stakes if s["status"] == "active"]
    completed = [s for s in all_stakes if s["status"] == "completed"]
    failed = [s for s in all_stakes if s["status"] == "failed"]
    total_decided = len(completed) + len(failed)
    success_rate = (len(completed) / total_decided * 100) if total_decided > 0 else 0
    return {
        "at_stake": sum(s["stake_amount"] for s in active),
        "saved": sum(s["stake_amount"] for s in completed),
        "lost": sum(s["stake_amount"] for s in failed),
        "active_count": len(active),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "success_rate": round(success_rate, 1),
        "current_streak": 0,
    }
