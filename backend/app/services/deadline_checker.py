"""
Deadline Checker Service

Runs as an asyncio background task every 60s (via main.py lifespan).
Checks for expired stakes and processes them (capture payment, update status).
"""

from datetime import datetime, timezone
from app.core.deps import get_supabase
from app.services.stripe_service import process_failed_stake


async def check_expired_stakes():
    """
    Find all active stakes past their deadline and process them as failures.
    Status is always updated to failed regardless of Stripe outcome.
    """
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    # Find expired active stakes
    expired = (
        db.table("stakes")
        .select("*")
        .eq("status", "active")
        .lt("deadline", now)
        .execute()
    )

    if not expired.data:
        print(f"[{now}] No expired stakes found.")
        return []

    results = []
    for stake in expired.data:
        stripe_ok = False
        try:
            # Attempt to capture payment — best effort
            await process_failed_stake(
                payment_intent_id=stake["stripe_payment_intent_id"],
                anti_charity_id=stake["anti_charity_id"],
            )
            stripe_ok = True
        except Exception as e:
            # Stripe failed (intent expired, already cancelled, dev mode, etc.)
            # Still mark the stake as failed below
            print(f"  ⚠️ Stripe capture failed for stake {stake['id']}: {e}")

        try:
            # Always mark failed regardless of Stripe outcome
            db.table("stakes").update({
                "status": "failed",
                "completed_at": now,
                "verification_result": "Deadline expired without proof of completion.",
            }).eq("id", stake["id"]).execute()

            # Update user lost stats
            try:
                db.rpc("increment_field", {
                    "row_id": stake["user_id"],
                    "field_name": "total_lost",
                    "amount": stake["stake_amount"],
                }).execute()
            except Exception as e:
                print(f"  ⚠️ Stats update failed for {stake['id']}: {e}")

            # Emit group events
            try:
                memberships = db.table("group_members").select("group_id").eq("user_id", stake["user_id"]).execute()
                for m in (memberships.data or []):
                    db.table("group_events").insert({
                        "group_id": m["group_id"],
                        "user_id": stake["user_id"],
                        "stake_id": stake["id"],
                        "event_type": "stake_failed",
                        "payload": {
                            "title": stake["title"],
                            "stake_amount": stake["stake_amount"],
                        },
                    }).execute()
            except Exception as e:
                print(f"  ⚠️ Group event failed for {stake['id']}: {e}")

            results.append({
                "stake_id": stake["id"],
                "user_id": stake["user_id"],
                "amount": stake["stake_amount"],
                "status": "failed",
                "stripe_captured": stripe_ok,
            })

            print(f"  ❌ Stake '{stake['title']}' expired. ${stake['stake_amount']} — stripe captured: {stripe_ok}")

        except Exception as e:
            print(f"  ⚠️ Failed to update stake {stake['id']}: {e}")
            results.append({"stake_id": stake["id"], "error": str(e)})

    print(f"[{now}] Processed {len(results)} expired stakes.")
    return results


if __name__ == "__main__":
    import asyncio
    asyncio.run(check_expired_stakes())
