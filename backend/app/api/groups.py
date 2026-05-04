from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_supabase
from pydantic import BaseModel
from typing import Optional
import secrets
import string

router = APIRouter()


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class JoinGroup(BaseModel):
    invite_code: str


class TransferAdmin(BaseModel):
    new_admin_user_id: str


def _get_member_role(db, group_id: str, user_id: str) -> Optional[str]:
    result = db.table("group_members").select("role").eq("group_id", group_id).eq("user_id", user_id).execute()
    if result.data:
        return result.data[0]["role"]
    return None


@router.get("")
async def get_my_groups(user: dict = Depends(get_current_user)):
    db = get_supabase()
    memberships = db.table("group_members").select("group_id, role").eq("user_id", user["id"]).execute()
    if not memberships.data:
        return {"groups": []}

    group_ids = [m["group_id"] for m in memberships.data]
    role_map = {m["group_id"]: m["role"] for m in memberships.data}

    groups = db.table("groups").select("*").in_("id", group_ids).execute()

    result = []
    for g in (groups.data or []):
        member_count = db.table("group_members").select("id", count="exact").eq("group_id", g["id"]).execute()
        result.append({
            **g,
            "member_count": member_count.count or 1,
            "user_role": role_map.get(g["id"], "member"),
        })

    return {"groups": result}


@router.post("")
async def create_group(data: GroupCreate, user: dict = Depends(get_current_user)):
    db = get_supabase()

    group_result = db.table("groups").insert({
        "name": data.name,
        "description": data.description,
        "created_by": user["id"],
    }).execute()

    if not group_result.data:
        raise HTTPException(status_code=500, detail="Failed to create group")

    group = group_result.data[0]

    db.table("group_members").insert({
        "group_id": group["id"],
        "user_id": user["id"],
        "role": "admin",
    }).execute()

    return {**group, "user_role": "admin"}


@router.post("/join")
async def join_group(data: JoinGroup, user: dict = Depends(get_current_user)):
    db = get_supabase()

    group = db.table("groups").select("*").eq("invite_code", data.invite_code.upper().strip()).single().execute()
    if not group.data:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    existing = db.table("group_members").select("id").eq("group_id", group.data["id"]).eq("user_id", user["id"]).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already a member")

    db.table("group_members").insert({
        "group_id": group.data["id"],
        "user_id": user["id"],
        "role": "member",
    }).execute()

    try:
        db.table("group_events").insert({
            "group_id": group.data["id"],
            "user_id": user["id"],
            "event_type": "member_joined",
            "payload": {"display_name": user["email"].split("@")[0]},
        }).execute()
    except Exception:
        pass

    return {**group.data, "user_role": "member"}


@router.get("/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    role = _get_member_role(db, group_id, user["id"])
    if not role:
        raise HTTPException(status_code=403, detail="Not a member")

    group = db.table("groups").select("*").eq("id", group_id).single().execute()
    if not group.data:
        raise HTTPException(status_code=404, detail="Group not found")

    members_raw = db.table("group_members").select("*").eq("group_id", group_id).execute()
    member_ids = [m["user_id"] for m in (members_raw.data or [])]

    profiles = db.table("profiles").select("id, display_name, username, streak, stakes_completed, stakes_failed").in_("id", member_ids).execute() if member_ids else type('obj', (object,), {'data': []})()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    members = []
    for m in (members_raw.data or []):
        profile = profile_map.get(m["user_id"], {})
        total = (profile.get("stakes_completed") or 0) + (profile.get("stakes_failed") or 0)
        hit = profile.get("stakes_completed") or 0
        members.append({
            "user_id": m["user_id"],
            "role": m["role"],
            "joined_at": m["joined_at"],
            "display_name": profile.get("username") or profile.get("display_name") or "Unknown",
            "streak": profile.get("streak") or 0,
            "hit": hit,
            "miss": profile.get("stakes_failed") or 0,
            "total": total,
        })

    return {
        **group.data,
        "members": members,
        "member_count": len(members),
        "user_role": role,
    }


@router.get("/{group_id}/feed")
async def get_group_feed(group_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    role = _get_member_role(db, group_id, user["id"])
    if not role:
        raise HTTPException(status_code=403, detail="Not a member")

    events = db.table("group_events").select("*").eq("group_id", group_id).order("created_at", desc=True).limit(50).execute()

    enriched = []
    for e in (events.data or []):
        profile = db.table("profiles").select("display_name, username").eq("id", e["user_id"]).single().execute()
        display = "Unknown"
        if profile.data:
            display = profile.data.get("username") or profile.data.get("display_name") or "Unknown"
        enriched.append({**e, "display_name": display})

    return {"events": enriched}


@router.delete("/{group_id}/leave")
async def leave_group(group_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    role = _get_member_role(db, group_id, user["id"])
    if not role:
        raise HTTPException(status_code=404, detail="Not a member")

    # Admin cannot leave if they're the only admin — must transfer first
    if role == "admin":
        other_admins = db.table("group_members").select("id").eq("group_id", group_id).eq("role", "admin").neq("user_id", user["id"]).execute()
        other_members = db.table("group_members").select("id").eq("group_id", group_id).neq("user_id", user["id"]).execute()

        if not other_admins.data and other_members.data:
            raise HTTPException(
                status_code=400,
                detail="Transfer admin to another member before leaving"
            )

    db.table("group_members").delete().eq("group_id", group_id).eq("user_id", user["id"]).execute()

    # If no members left, delete the group
    remaining = db.table("group_members").select("id").eq("group_id", group_id).execute()
    if not remaining.data:
        db.table("groups").delete().eq("id", group_id).execute()

    return {"message": "Left group"}


@router.delete("/{group_id}/members/{member_user_id}")
async def remove_member(group_id: str, member_user_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    # Only admin can remove members
    role = _get_member_role(db, group_id, user["id"])
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    if member_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Use leave group to remove yourself")

    db.table("group_members").delete().eq("group_id", group_id).eq("user_id", member_user_id).execute()

    return {"message": "Member removed"}


@router.delete("/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()

    role = _get_member_role(db, group_id, user["id"])
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # Cascade: delete events, members, challenges, then group
    db.table("group_events").delete().eq("group_id", group_id).execute()
    db.table("challenge_participants").delete().in_(
        "challenge_id",
        [c["id"] for c in (db.table("group_challenges").select("id").eq("group_id", group_id).execute().data or [])]
    ).execute()
    db.table("group_challenges").delete().eq("group_id", group_id).execute()
    db.table("group_members").delete().eq("group_id", group_id).execute()
    db.table("groups").delete().eq("id", group_id).execute()

    return {"message": "Group deleted"}


@router.post("/{group_id}/transfer-admin")
async def transfer_admin(group_id: str, data: TransferAdmin, user: dict = Depends(get_current_user)):
    db = get_supabase()

    role = _get_member_role(db, group_id, user["id"])
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    target = _get_member_role(db, group_id, data.new_admin_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not in group")

    # Promote new admin
    db.table("group_members").update({"role": "admin"}).eq("group_id", group_id).eq("user_id", data.new_admin_user_id).execute()
    # Demote current admin
    db.table("group_members").update({"role": "member"}).eq("group_id", group_id).eq("user_id", user["id"]).execute()

    return {"message": "Admin transferred"}
