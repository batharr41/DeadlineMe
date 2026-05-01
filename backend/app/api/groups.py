from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_supabase
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


# --- Schemas ---

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=200)


class GroupJoin(BaseModel):
    invite_code: str


# --- Helpers ---

def _emit_event(db, group_id: str, user_id: str, event_type: str, stake_id: str = None, payload: dict = {}):
    """Insert a group event (fire-and-forget, don't raise on failure)."""
    try:
        db.table("group_events").insert({
            "group_id": group_id,
            "user_id": user_id,
            "stake_id": stake_id,
            "event_type": event_type,
            "payload": payload,
        }).execute()
    except Exception:
        pass


# --- Endpoints ---

@router.post("")
async def create_group(
    data: GroupCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new group. Creator is auto-added as admin via DB trigger."""
    db = get_supabase()

    result = db.table("groups").insert({
        "name": data.name,
        "description": data.description,
        "created_by": user["id"],
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create group")

    group = result.data[0]

    _emit_event(db, group["id"], user["id"], "member_joined",
                payload={"display_name": user["email"].split("@")[0]})

    return group


@router.post("/join")
async def join_group(
    data: GroupJoin,
    user: dict = Depends(get_current_user),
):
    """Join a group by invite code."""
    db = get_supabase()

    group_result = db.table("groups").select("*").eq("invite_code", data.invite_code.upper()).single().execute()
    if not group_result.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    group = group_result.data

    existing = db.table("group_members").select("id").eq("group_id", group["id"]).eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already a member of this group")

    db.table("group_members").insert({
        "group_id": group["id"],
        "user_id": user["id"],
        "role": "member",
    }).execute()

    _emit_event(db, group["id"], user["id"], "member_joined",
                payload={"display_name": user["email"].split("@")[0]})

    return {"message": "Joined group", "group": group}


@router.get("")
async def get_my_groups(user: dict = Depends(get_current_user)):
    """Get all groups the current user belongs to."""
    db = get_supabase()

    memberships = db.table("group_members").select("group_id").eq("user_id", user["id"]).execute()
    if not memberships.data:
        return {"groups": []}

    group_ids = [m["group_id"] for m in memberships.data]
    groups = db.table("groups").select("*").in_("id", group_ids).order("created_at", desc=True).execute()

    return {"groups": groups.data or []}


@router.get("/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    """Get group details + members. Must be a member."""
    db = get_supabase()

    membership = db.table("group_members").select("role").eq("group_id", group_id).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    group = db.table("groups").select("*").eq("id", group_id).single().execute()
    if not group.data:
        raise HTTPException(status_code=404, detail="Group not found")

    members_raw = db.table("group_members").select("user_id, role, joined_at").eq("group_id", group_id).execute()
    member_ids = [m["user_id"] for m in (members_raw.data or [])]

    profiles = db.table("profiles").select("id, display_name, streak, stakes_completed, stakes_failed").in_("id", member_ids).execute()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    members = []
    for m in (members_raw.data or []):
        profile = profile_map.get(m["user_id"], {})
        members.append({
            "user_id": m["user_id"],
            "role": m["role"],
            "joined_at": m["joined_at"],
            "display_name": profile.get("display_name", "Unknown"),
            "streak": profile.get("streak", 0),
            "stakes_completed": profile.get("stakes_completed", 0),
            "stakes_failed": profile.get("stakes_failed", 0),
        })

    return {**group.data, "members": members, "my_role": membership.data[0]["role"]}


@router.get("/{group_id}/feed")
async def get_group_feed(group_id: str, user: dict = Depends(get_current_user), limit: int = 30):
    """Get the activity feed for a group."""
    db = get_supabase()

    membership = db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user["id"]).execute()
    if not membership.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    events = (
        db.table("group_events")
        .select("*, profiles(display_name), stakes(title, stake_amount, status)")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return {"events": events.data or []}


@router.delete("/{group_id}/leave")
async def leave_group(group_id: str, user: dict = Depends(get_current_user)):
    """Leave a group."""
    db = get_supabase()

    admins = db.table("group_members").select("user_id").eq("group_id", group_id).eq("role", "admin").execute()
    if admins.data and len(admins.data) == 1 and admins.data[0]["user_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Transfer admin role before leaving")

    db.table("group_members").delete().eq("group_id", group_id).eq("user_id", user["id"]).execute()

    return {"message": "Left group"}
