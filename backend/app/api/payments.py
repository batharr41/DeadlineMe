from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.deps import get_current_user, get_supabase
from app.core.config import settings
from app.schemas.schemas import PaymentIntentCreate, PaymentIntentResponse
import stripe
import logging

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key
router = APIRouter()

_STRIPE_CONFIGURED = (
    settings.stripe_secret_key
    and not settings.stripe_secret_key.startswith("sk_placeholder")
    and len(settings.stripe_secret_key) > 20
)


@router.post("/create-payment-sheet")
async def create_payment_sheet(
    data: PaymentIntentCreate,
    user: dict = Depends(get_current_user),
):
    """
    Create a Stripe PaymentIntent and return everything the
    mobile Stripe SDK needs to show a payment sheet.
    """
    if not _STRIPE_CONFIGURED:
        return {
            "paymentIntent": f"pi_dev_fake_secret",
            "publishableKey": settings.stripe_publishable_key or "pk_test_dev",
            "amount": data.amount,
            "payment_intent_id": f"pi_dev_fake_{data.amount}",
        }

    try:
        amount_cents = data.amount * 100

        # Get or create Stripe customer
        db = get_supabase()
        profile = db.table("profiles").select("stripe_customer_id, email").eq("id", user["id"]).single().execute()

        customer_id = None
        if profile.data:
            customer_id = profile.data.get("stripe_customer_id")
            if not customer_id:
                customer = stripe.Customer.create(email=profile.data.get("email") or user["email"])
                customer_id = customer.id
                db.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user["id"]).execute()

        # Create ephemeral key for the customer
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer_id,
            stripe_version="2024-06-20",
        )

        # Create PaymentIntent with manual capture
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            customer=customer_id,
            capture_method="manual",
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": user["id"],
                "user_email": user["email"],
                "type": "deadline_stake",
            },
            description=f"DeadlineMe stake - ${data.amount}",
        )

        return {
            "paymentIntent": intent.client_secret,
            "ephemeralKey": ephemeral_key.secret,
            "customer": customer_id,
            "publishableKey": settings.stripe_publishable_key,
            "payment_intent_id": intent.id,
            "amount": data.amount,
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    data: PaymentIntentCreate,
    user: dict = Depends(get_current_user),
):
    """Legacy endpoint — create a PaymentIntent directly."""
    try:
        amount_cents = data.amount * 100
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            metadata={"user_id": user["id"], "type": "stake"},
            capture_method="manual",
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

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        logger.info(f"Payment succeeded: {intent['id']}")

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        user_id = intent["metadata"].get("user_id")
        if user_id:
            db = get_supabase()
            db.table("stakes").update({"status": "failed"}).eq(
                "stripe_payment_intent_id", intent["id"]
            ).execute()

    return {"status": "ok"}
