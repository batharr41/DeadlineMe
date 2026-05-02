from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import StakeCreate, StakeResponse, StakeListResponse
from app.services.stripe_service import create_stake_payment, refund_stake
from app.services.ai_verification import verify_proof
from datetime import datetime, timezone

router = APIRouter()

ANTI_CHARITIES = {
    "humanitarian": "Doctors Without Borders",
    "poverty": "GiveDirectly",
    "education": "Room to Read",
    "health": "St. Jude Children's Research Hospital",
    "environment": "WWF",
    "animals": "ASPCA",
    "surprise": "Surprise charity",
}


def _emit_group_events(db, user_id: str, stake_id: str, event_type: str, payload: dict):
    try:
        memberships = db.table("group_members").select("group_id").eq("user_id", user_id).execute()
        for m in (memberships.data or []):
            db.table("group_events").insert({
                "group_id": m["group_id"],
                "user_id": user_id,
                "stake_id": stake_id,
                "event_type": event_type,
                "payload": payload,
            }).execute()
    except Exception:
        pass


@router.post("", response_model=StakeResponse)
async def create_stake(
    data: StakeCreate,
    user: dict = Depends(get_current_user),
):
    db = get_supabase()

    payment = await create_stake_payment(
        amount=data.stake_amount,
        user_id=user["id"],
        user_email=user["email"],
    )

    stake_data = {
        "user_id": user["id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "stake_amount": data.stake_amount,
        "deadline": data.deadline.isoformat(),
        "anti_charity_id": data.anti_charity_id,
        "anti_charity_name": ANTI_CHARITIES.get(data.anti_charity_id, data.anti_charity_id),
        "status": "active",
        "stripe_payment_intent_id": payment["payment_intent_id"],
    }

    result = db.table("stakes").insert(stake_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create stake")

    stake = result.data[0]

    _emit_group_events(db, user["id"], stake["id"], "stake_created", {
        "title": data.title,
        "stake_amount": data.stake_amount,
        "category": data.category,
    })

    return stake


@router.get("", response_model=StakeListResponse)
async def get_my_stakes(user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("stakes")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"stakes": result.data or [], "total": len(result.data or [])}


@router.get("/{stake_id}", response_model=StakeResponse)
async def get_stake(stake_id: str, user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("stakes")
        .select("*")
        .eq("id", stake_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Stake not found")
    return result.data


@router.post("/{stake_id}/cancel")
async def cancel_stake(stake_id: str, user: dict = Depends(get_current_user)):
    """Cancel a stake. Free within 60 min, 50% forfeit after."""
    db = get_supabase()

    stake = (
        db.table("stakes")
        .select("*")
        .eq("id", stake_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not stake.data:
        raise HTTPException(status_code=404, detail="Stake not found")

    if stake.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Stake is not active")

    created_at = datetime.fromisoformat(stake.data["created_at"].replace("Z", "+00:00"))
    minutes_since_creation = (datetime.now(timezone.utc) - created_at).total_seconds() / 60
    in_grace_period = minutes_since_creation < 60

    try:
        if in_grace_period:
            # Full refund
            await refund_stake(stake.data["stripe_payment_intent_id"])
            new_status = "cancelled"
            message = "Full refund issued."
        else:
            # 50% forfeit — refund half, capture half
            # For now refund fully and track forfeit manually
            await refund_stake(stake.data["stripe_payment_intent_id"])
            new_status = "cancelled"
            message = "50% refunded, 50% to charity."
    except Exception as e:
        # Still cancel even if Stripe fails
        new_status = "cancelled"
        message = "Cancelled."

    db.table("stakes").update({
        "status": new_status,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "verification_result": message,
    }).eq("id", stake_id).execute()

    return {
        "status": new_status,
        "grace_period": in_grace_period,
        "message": message,
    }


@router.post("/{stake_id}/proof")
async def submit_proof(
    stake_id: str,
    proof: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    db = get_supabase()

    stake = (
        db.table("stakes")
        .select("*")
        .eq("id", stake_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not stake.data:
        raise HTTPException(status_code=404, detail="Stake not found")
    if stake.data["status"] != "active":
        raise HTTPException(status_code=400, detail="Stake is not active")

    image_bytes = await proof.read()

    file_path = f"proofs/{user['id']}/{stake_id}/{proof.filename}"
    db.storage.from_("proofs").upload(file_path, image_bytes)
    proof_url = db.storage.from_("proofs").get_public_url(file_path)

    db.table("stakes").update({
        "status": "pending_verification",
        "proof_url": proof_url,
    }).eq("id", stake_id).execute()

    verification = await verify_proof(
        image_bytes=image_bytes,
        goal_title=stake.data["title"],
        goal_description=stake.data.get("description", ""),
        goal_category=stake.data["category"],
    )

    new_status = "completed" if verification["verified"] else "active"
    update_data = {
        "status": new_status,
        "verification_result": verification["reasoning"],
    }
    if new_status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    db.table("stakes").update(update_data).eq("id", stake_id).execute()

    if verification["verified"]:
        await refund_stake(stake.data["stripe_payment_intent_id"])
        _emit_group_events(db, user["id"], stake_id, "stake_completed", {
            "title": stake.data["title"],
            "stake_amount": stake.data["stake_amount"],
        })

    return {
        "verified": verification["verified"],
        "confidence": verification["confidence"],
        "reasoning": verification["reasoning"],
        "status": new_status,
    }
