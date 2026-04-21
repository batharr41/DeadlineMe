from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.deps import get_current_user, get_supabase
from app.core.config import settings
from app.schemas.schemas import PaymentIntentCreate, PaymentIntentResponse
import stripe

stripe.api_key = settings.stripe_secret_key
router = APIRouter()


@router.post("/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    data: PaymentIntentCreate,
    user: dict = Depends(get_current_user),
):
    """Create a Stripe PaymentIntent to hold stake funds."""
    try:
        # Amount in cents (Stripe uses smallest currency unit)
        amount_cents = data.amount * 100

        # Platform fee: 5% of stake
        platform_fee = int(amount_cents * 0.05)

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            metadata={
                "user_id": user["id"],
                "type": "stake",
            },
            capture_method="manual",  # Authorize but don't capture yet
        )

        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": data.amount,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    """Get payment history for the current user."""
    db = get_supabase()

    result = (
        db.table("stakes")
        .select("id, title, stake_amount, status, created_at, completed_at")
        .eq("user_id", user["id"])
        .in_("status", ["completed", "failed"])
        .order("created_at", desc=True)
        .execute()
    )

    return {"payments": result.data or []}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # Handle relevant events
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        # Payment captured — stake funds secured
        pass

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        # Payment failed — mark stake as inactive
        user_id = intent["metadata"].get("user_id")
        if user_id:
            db = get_supabase()
            db.table("stakes").update({"status": "failed"}).eq(
                "stripe_payment_intent_id", intent["id"]
            ).execute()

    return {"status": "ok"}
