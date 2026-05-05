from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import StakeCreate, StakeResponse, StakeListResponse
from app.services.stripe_service import create_stake_payment
from app.services.ai_verification import verify_proof
from datetime import datetime, timezone

router = APIRouter()

ANTI_CHARITIES = {
    "oppose1": "A cause you disagree with",
    "oppose2": "Your rival sports team fan club",
    "oppose3": "Pineapple pizza advocacy fund",
    "random": "Random stranger's coffee fund",
}


@router.post("", response_model=StakeResponse)
async def create_stake(
    data: StakeCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new stake with payment hold."""
    db = get_supabase()

    # --- Free tier gate ---
    profile = db.table("profiles").select("is_pro").eq("id", user["id"]).single().execute()
    is_pro = profile.data.get("is_pro", False) if profile.data else False

    if not is_pro:
        active = (
            db.table("stakes")
            .select("id")
            .eq("user_id", user["id"])
            .eq("status", "active")
            .execute()
        )
        if len(active.data or []) >= 1:
            raise HTTPException(status_code=403, detail="FREE_LIMIT_REACHED")
    # ----------------------

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
        "anti_charity_name": ANTI_CHARITIES.get(data.anti_charity_id, "Unknown"),
        "status": "active",
        "stripe_payment_intent_id": payment["payment_intent_id"],
    }

    result = db.table("stakes").insert(stake_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create stake")

    return result.data[0]


@router.get("", response_model=StakeListResponse)
async def get_my_stakes(user: dict = Depends(get_current_user)):
    """Get all stakes for the current user."""
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
    """Get a single stake by ID."""
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


@router.post("/{stake_id}/proof")
async def submit_proof(
    stake_id: str,
    proof: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Submit proof of completion for AI verification."""
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
        from app.services.stripe_service import refund_stake
        await refund_stake(stake.data["stripe_payment_intent_id"])

    return {
        "verified": verification["verified"],
        "confidence": verification["confidence"],
        "reasoning": verification["reasoning"],
        "status": new_status,
    }
