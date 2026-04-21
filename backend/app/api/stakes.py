from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.core.deps import get_current_user, get_supabase
from app.schemas.schemas import StakeCreate, StakeResponse, StakeListResponse, CancelStakeRequest
from app.services.stripe_service import create_stake_payment, refund_stake, cancel_stake_with_forfeit
from app.services.ai_verification import verify_proof
from datetime import datetime, timezone
import random

router = APIRouter()

# ============================================
# CHARITY CATEGORIES
# Cause-based buckets. Islamic charities are
# folded into Humanitarian and Poverty Relief.
# ============================================
CHARITY_CATEGORIES = {
    "humanitarian": {
        "name": "Humanitarian Aid",
        "charities": [
            "Doctors Without Borders",
            "American Red Cross",
            "UNICEF",
            "World Food Programme",
            "Direct Relief",
            "Islamic Relief USA",
            "Helping Hand for Relief & Development",
        ],
    },
    "poverty": {
        "name": "Poverty Relief",
        "charities": [
            "GiveDirectly",
            "Oxfam America",
            "Heifer International",
            "Zakat Foundation of America",
            "Penny Appeal USA",
            "LaunchGood",
        ],
    },
    "education": {
        "name": "Education",
        "charities": ["Room to Read", "Khan Academy", "DonorsChoose"],
    },
    "health_medical": {
        "name": "Health & Medical",
        "charities": [
            "St. Jude Children's Research Hospital",
            "American Cancer Society",
            "NAMI (Mental Health)",
        ],
    },
    "environment": {
        "name": "Environment",
        "charities": [
            "World Wildlife Fund",
            "The Nature Conservancy",
            "Ocean Conservancy",
        ],
    },
    "animals": {
        "name": "Animal Welfare",
        "charities": ["ASPCA", "Best Friends Animal Society"],
    },
}

# Window during which user can cancel a stake for free (in minutes)
FREE_CANCEL_WINDOW_MIN = 60
# Fraction forfeited if user emergency-exits after grace window
EMERGENCY_FORFEIT_PCT = 0.5


def pick_charity(category_id: str, custom_name: str | None = None) -> dict:
    """Pick a charity based on the user's chosen category."""
    if category_id == "custom":
        if not custom_name or len(custom_name.strip()) < 2:
            raise HTTPException(
                status_code=400,
                detail="Custom charity name is required when choosing 'custom'.",
            )
        return {
            "category_id": "custom",
            "category_name": "Custom",
            "charity_name": custom_name.strip(),
        }

    if category_id == "any":
        all_charities = []
        for cat_data in CHARITY_CATEGORIES.values():
            all_charities.extend(cat_data["charities"])
        return {
            "category_id": "any",
            "category_name": "Surprise Me",
            "charity_name": random.choice(all_charities),
        }

    cat = CHARITY_CATEGORIES.get(category_id)
    if not cat:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown charity category: {category_id}",
        )

    return {
        "category_id": category_id,
        "category_name": cat["name"],
        "charity_name": random.choice(cat["charities"]),
    }


@router.post("", response_model=StakeResponse)
async def create_stake(
    data: StakeCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new stake with payment hold."""
    db = get_supabase()

    # Validate / pick the charity FIRST so we don't charge the card
    # before knowing the charity assignment is valid
    custom_name = getattr(data, "custom_charity_name", None)
    charity = pick_charity(data.anti_charity_id, custom_name)

    # Create Stripe payment intent (hold funds)
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
        "anti_charity_id": charity["category_id"],
        "anti_charity_name": charity["charity_name"],
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


@router.post("/{stake_id}/cancel")
async def cancel_stake(
    stake_id: str,
    data: CancelStakeRequest,
    user: dict = Depends(get_current_user),
):
    """Cancel an active stake.

    - If within FREE_CANCEL_WINDOW_MIN of creation: full refund
    - Otherwise (emergency exit): EMERGENCY_FORFEIT_PCT goes to charity, rest refunded
    """
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

    # Determine if free window applies
    created_at = datetime.fromisoformat(stake.data["created_at"].replace("Z", "+00:00"))
    minutes_since = (datetime.now(timezone.utc) - created_at).total_seconds() / 60
    in_free_window = minutes_since < FREE_CANCEL_WINDOW_MIN

    payment_intent_id = stake.data.get("stripe_payment_intent_id")
    stake_amount = stake.data["stake_amount"]

    refunded = stake_amount
    forfeited = 0
    new_status = "cancelled"

    try:
        if in_free_window:
            # Full refund — cancel the authorization
            if payment_intent_id:
                await refund_stake(payment_intent_id)
        else:
            # Partial: capture the forfeit portion, refund the rest
            forfeited = round(stake_amount * EMERGENCY_FORFEIT_PCT)
            refunded = stake_amount - forfeited
            new_status = "failed"  # treat emergency exit as a "failure" for stats
            if payment_intent_id:
                await cancel_stake_with_forfeit(
                    payment_intent_id=payment_intent_id,
                    full_amount=stake_amount,
                    forfeit_amount=forfeited,
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {e}")

    # Update stake status
    db.table("stakes").update({
        "status": new_status,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "verification_result": (
            "Cancelled within grace window — full refund."
            if in_free_window
            else f"Emergency exit — ${forfeited} sent to {stake.data.get('anti_charity_name', 'charity')}."
        ),
    }).eq("id", stake_id).execute()

    return {
        "status": new_status,
        "refunded": refunded,
        "forfeited": forfeited,
        "in_free_window": in_free_window,
    }


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
        await refund_stake(stake.data["stripe_payment_intent_id"])

    return {
        "verified": verification["verified"],
        "confidence": verification["confidence"],
        "reasoning": verification["reasoning"],
        "status": new_status,
    }