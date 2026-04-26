import stripe
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key

PLATFORM_FEE_PERCENT = 0.05  # 5%

# Dev mode detection
_STRIPE_CONFIGURED = (
    settings.stripe_secret_key
    and not settings.stripe_secret_key.startswith("sk_placeholder")
    and len(settings.stripe_secret_key) > 20
)


def _is_dev_intent(payment_intent_id: str) -> bool:
    return payment_intent_id.startswith("pi_dev_")


async def create_stake_payment(amount: int, user_id: str, user_email: str) -> dict:
    """
    Create a Stripe PaymentIntent with manual capture.
    Funds are authorized but not captured until the deadline resolves.
    """
    if not _STRIPE_CONFIGURED:
        logger.info(f"[DEV MODE] Fake payment intent for ${amount}")
        return {
            "client_secret": f"pi_dev_{user_id[:8]}_secret_fake",
            "payment_intent_id": f"pi_dev_{user_id[:8]}_{amount}",
            "amount": amount,
        }

    amount_cents = amount * 100

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        capture_method="manual",  # Authorize only — don't charge yet
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


async def capture_stake(payment_intent_id: str) -> dict:
    """
    Capture the authorized payment (user failed their deadline).
    """
    if _is_dev_intent(payment_intent_id):
        logger.info(f"[DEV MODE] Fake capture for {payment_intent_id}")
        return {"status": "succeeded", "amount_captured": 0}

    try:
        intent = stripe.PaymentIntent.capture(payment_intent_id)
        return {
            "status": intent.status,
            "amount_captured": intent.amount_received,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe capture error: {e}")
        return {"status": "error", "message": str(e)}


async def refund_stake(payment_intent_id: str) -> dict:
    """
    Cancel or refund the payment (user completed their goal).
    """
    if _is_dev_intent(payment_intent_id):
        logger.info(f"[DEV MODE] Fake refund for {payment_intent_id}")
        return {"status": "cancelled", "refunded": True}

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent.status == "requires_capture":
            stripe.PaymentIntent.cancel(payment_intent_id)
            return {"status": "cancelled", "refunded": True}

        if intent.status == "succeeded":
            refund = stripe.Refund.create(payment_intent=payment_intent_id)
            return {"status": "refunded", "refund_id": refund.id}

        # Already cancelled or in unexpected state
        return {"status": intent.status, "refunded": False}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe refund error: {e}")
        return {"status": "error", "message": str(e)}


async def partial_refund_stake(payment_intent_id: str, refund_percent: float) -> dict:
    """
    Partial refund for emergency exit (e.g. 50% back).
    """
    if _is_dev_intent(payment_intent_id):
        logger.info(f"[DEV MODE] Fake partial refund ({refund_percent*100}%) for {payment_intent_id}")
        return {"status": "refunded", "refunded": True}

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent.status == "requires_capture":
            # Not yet captured — capture first, then refund portion
            captured = stripe.PaymentIntent.capture(payment_intent_id)
            refund_amount = int(captured.amount_received * refund_percent)
            refund = stripe.Refund.create(
                payment_intent=payment_intent_id,
                amount=refund_amount,
            )
            return {"status": "partial_refund", "refund_id": refund.id}

        return {"status": intent.status, "refunded": False}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe partial refund error: {e}")
        return {"status": "error", "message": str(e)}


async def process_failed_stake(payment_intent_id: str, anti_charity_id: str) -> dict:
    """
    Process a failed stake: capture funds for charity.
    """
    capture_result = await capture_stake(payment_intent_id)
    return {
        "captured": True,
        "anti_charity_id": anti_charity_id,
        **capture_result,
    }
