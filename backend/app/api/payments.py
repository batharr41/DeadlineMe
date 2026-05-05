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


@router.post("/create-payment-sheet")
async def create_payment_sheet(
    data: PaymentIntentCreate,
    user: dict = Depends(get_current_user),
):
    """Create a Stripe PaymentIntent and return paymentIntent client secret for payment sheet."""
    try:
        db = get_supabase()
        profile = db.table("profiles").select("stripe_customer_id, email").eq("id", user["id"]).single().execute()
        customer_id = profile.data.get("stripe_customer_id") if profile.data else None

        if not customer_id:
            customer = stripe.Customer.create(
                email=user["email"],
                metadata={"user_id": user["id"]}
            )
            customer_id = customer.id
            db.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user["id"]).execute()

        amount_cents = data.amount * 100
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            customer=customer_id,
            capture_method="manual",
            metadata={"user_id": user["id"], "type": "deadline_stake"},
        )
        return {
            "paymentIntent": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": data.amount,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subscribe")
async def create_subscription(user: dict = Depends(get_current_user)):
    """Create a Stripe subscription for Pro tier ($2.99/mo)."""
    db = get_supabase()

    profile = db.table("profiles").select("stripe_customer_id, email, is_pro").eq("id", user["id"]).single().execute()

    if profile.data and profile.data.get("is_pro"):
        raise HTTPException(status_code=400, detail="Already a Pro member")

    customer_id = profile.data.get("stripe_customer_id") if profile.data else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=user["email"],
            metadata={"user_id": user["id"]}
        )
        customer_id = customer.id
        db.table("profiles").update({"stripe_customer_id": customer_id}).eq("id", user["id"]).execute()

    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": settings.stripe_pro_price_id}],
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            metadata={"user_id": user["id"]},
        )

        return {
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel-subscription")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel Pro subscription at period end."""
    db = get_supabase()

    profile = db.table("profiles").select("stripe_customer_id").eq("id", user["id"]).single().execute()
    customer_id = profile.data.get("stripe_customer_id") if profile.data else None

    if not customer_id:
        raise HTTPException(status_code=400, detail="No subscription found")

    try:
        subs = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
        if not subs.data:
            raise HTTPException(status_code=400, detail="No active subscription")

        stripe.Subscription.modify(subs.data[0].id, cancel_at_period_end=True)
        return {"status": "cancels_at_period_end"}
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

    db = get_supabase()

    if event["type"] == "payment_intent.succeeded":
        pass  # Stake capture handled via stakes API

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        user_id = intent["metadata"].get("user_id")
        if user_id:
            db.table("stakes").update({"status": "failed"}).eq(
                "stripe_payment_intent_id", intent["id"]
            ).execute()

    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]
        db.table("profiles").update({"is_pro": True}).eq("stripe_customer_id", customer_id).execute()

    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"]["customer"]
        db.table("profiles").update({"is_pro": False}).eq("stripe_customer_id", customer_id).execute()

    return {"status": "ok"}
