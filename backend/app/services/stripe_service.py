import stripe
from app.core.config import settings

# Only initialize Stripe if we have a real-looking key
_STRIPE_CONFIGURED = (
    settings.stripe_secret_key
    and settings.stripe_secret_key.startswith("sk_")
    and "..." not in settings.stripe_secret_key
    and len(settings.stripe_secret_key) > 20
)

if _STRIPE_CONFIGURED:
    stripe.api_key = settings.stripe_secret_key

PLATFORM_FEE_PERCENT = 0.05  # 5%


def _is_dev_intent(payment_intent_id: str | None) -> bool:
    return not payment_intent_id or payment_intent_id.startswith("pi_dev_")


async def create_stake_payment(amount: int, user_id: str, user_email: str) -> dict:
    """
    Create a Stripe PaymentIntent with manual capture.
    Funds are authorized but not captured until the deadline resolves.

    If Stripe isn't configured (dev mode), returns a placeholder so the rest
    of the flow still works end-to-end.
    """
    if not _STRIPE_CONFIGURED:
        return {
            "client_secret": f"dev_secret_{user_id[:8]}",
            "payment_intent_id": f"pi_dev_{user_id[:8]}_{amount}",
            "amount": amount,
        }

    amount_cents = amount * 100
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        capture_method="manual",
        metadata={
            "user_id": user_id,
            "user_email": user_email,
            "type": "deadline_stake",
        },
        description=f"DeadlineMe stake - ${amount}",
    )

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "amount": amount,
    }


async def capture_stake(payment_intent_id: str, amount: int | None = None) -> dict:
    """Capture the authorized payment, optionally only a portion (dollars)."""
    if not _STRIPE_CONFIGURED or _is_dev_intent(payment_intent_id):
        return {"status": "captured_dev", "amount_captured": (amount or 0) * 100}

    if amount is not None:
        intent = stripe.PaymentIntent.capture(
            payment_intent_id,
            amount_to_capture=amount * 100,
        )
    else:
        intent = stripe.PaymentIntent.capture(payment_intent_id)

    return {
        "status": intent.status,
        "amount_captured": intent.amount_received,
    }


async def refund_stake(payment_intent_id: str) -> dict:
    """Cancel or refund (user completed the goal or cancelled in grace window)."""
    if not _STRIPE_CONFIGURED or _is_dev_intent(payment_intent_id):
        return {"status": "cancelled_dev", "refunded": True}

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "requires_capture":
            stripe.PaymentIntent.cancel(payment_intent_id)
            return {"status": "cancelled", "refunded": True}

        refund = stripe.Refund.create(payment_intent=payment_intent_id)
        return {"status": "refunded", "refund_id": refund.id}
    except stripe.error.StripeError as e:
        return {"status": "error", "message": str(e)}


async def cancel_stake_with_forfeit(
    payment_intent_id: str,
    full_amount: int,
    forfeit_amount: int,
) -> dict:
    """
    Emergency exit: capture the forfeit portion, release the rest.
    All amounts in dollars.
    """
    if not _STRIPE_CONFIGURED or _is_dev_intent(payment_intent_id):
        return {
            "status": "partial_capture_dev",
            "forfeited": forfeit_amount,
            "refunded": full_amount - forfeit_amount,
        }

    try:
        intent = stripe.PaymentIntent.capture(
            payment_intent_id,
            amount_to_capture=forfeit_amount * 100,
        )
        return {
            "status": intent.status,
            "forfeited": forfeit_amount,
            "refunded": full_amount - forfeit_amount,
        }
    except stripe.error.StripeError as e:
        return {"status": "error", "message": str(e)}


async def process_failed_stake(payment_intent_id: str, anti_charity_id: str) -> dict:
    """Capture full stake on deadline miss."""
    capture_result = await capture_stake(payment_intent_id)
    return {
        "captured": True,
        "anti_charity_id": anti_charity_id,
        **capture_result,
    }