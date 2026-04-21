"""
Deadline Checker Service

Scans for expired active stakes and processes them as failures:
1. Captures the payment (funds go toward the charity)
2. Updates stake status to 'failed'
3. Updates user stats

Runs every 60 seconds as a background task inside FastAPI.
"""

from datetime import datetime, timezone
import logging

from app.core.deps import get_supabase
from app.services.stripe_service import process_failed_stake

logger = logging.getLogger("uvicorn.error")


async def check_expired_stakes():
    """Find all active stakes past their deadline and process them as failures."""
    db = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    expired = (
        db.table("stakes")
        .select("*")
        .eq("status", "active")
        .lt("deadline", now_iso)
        .execute()
    )

    if not expired.data:
        return []

    results = []
    for stake in expired.data:
        try:
            # Capture funds (goes to charity in production)
            await process_failed_stake(
                payment_intent_id=stake.get("stripe_payment_intent_id"),
                anti_charity_id=stake.get("anti_charity_id"),
            )

            # Update stake status
            db.table("stakes").update({
                "status": "failed",
                "completed_at": now_iso,
                "verification_result": "Deadline expired without proof of completion.",
            }).eq("id", stake["id"]).execute()

            # Update user stats (best-effort — don't block if this fails)
            try:
                profile = (
                    db.table("profiles")
                    .select("total_lost, stakes_failed")
                    .eq("id", stake["user_id"])
                    .single()
                    .execute()
                )
                if profile.data:
                    db.table("profiles").update({
                        "total_lost": (profile.data.get("total_lost") or 0) + stake["stake_amount"],
                        "stakes_failed": (profile.data.get("stakes_failed") or 0) + 1,
                    }).eq("id", stake["user_id"]).execute()
            except Exception as stats_err:
                logger.warning(f"  Stats update failed for user {stake['user_id']}: {stats_err}")

            results.append({
                "stake_id": stake["id"],
                "user_id": stake["user_id"],
                "amount": stake["stake_amount"],
                "status": "failed",
            })

            logger.info(
                f"  ❌ Stake '{stake['title']}' expired. "
                f"${stake['stake_amount']} → {stake.get('anti_charity_name', 'charity')}"
            )

        except Exception as e:
            logger.exception(f"  ⚠️ Error processing stake {stake['id']}: {e}")
            results.append({"stake_id": stake["id"], "error": str(e)})

    logger.info(f"✅ Processed {len(results)} expired stakes at {now_iso}")
    return results


if __name__ == "__main__":
    import asyncio
    asyncio.run(check_expired_stakes())