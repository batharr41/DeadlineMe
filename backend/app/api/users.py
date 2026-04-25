from fastapi import APIRouter, Depends
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import UserStats, UserUpdate

router = APIRouter()


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


@router.get("/me/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """Get user accountability stats with category breakdown and recent history."""
    db = get_supabase()

    stakes_result = (
        db.table("stakes")
        .select("id, title, category, stake_amount, status, created_at, deadline, completed_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    all_stakes = stakes_result.data or []

    active = [s for s in all_stakes if s["status"] == "active"]
    completed = [s for s in all_stakes if s["status"] == "completed"]
    failed = [s for s in all_stakes if s["status"] == "failed"]
    decided = completed + failed

    total_decided = len(decided)
    success_rate = round(len(completed) / total_decided * 100, 1) if total_decided > 0 else 0

    # Category breakdown
    categories = set(s["category"] for s in all_stakes if s["category"])
    category_breakdown = []
    for cat in categories:
        cat_decided = [s for s in decided if s["category"] == cat]
        cat_completed = [s for s in completed if s["category"] == cat]
        if not cat_decided:
            continue
        category_breakdown.append({
            "category": cat,
            "completed": len(cat_completed),
            "total": len(cat_decided),
        })
    category_breakdown.sort(key=lambda x: x["completed"] / x["total"], reverse=True)

    # Recent history (last 10 non-active)
    recent = [s for s in all_stakes if s["status"] != "active"][:10]

    # Streak — from profile
    profile = db.table("profiles").select("streak").eq("id", user["id"]).single().execute()
    current_streak = profile.data.get("streak", 0) if profile.data else 0

    return {
        "at_stake": sum(s["stake_amount"] for s in active),
        "saved": sum(s["stake_amount"] for s in completed),
        "lost": sum(s["stake_amount"] for s in failed),
        "active_count": len(active),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "success_rate": success_rate,
        "current_streak": current_streak,
        "category_breakdown": category_breakdown,
        "recent_history": recent,
    }
