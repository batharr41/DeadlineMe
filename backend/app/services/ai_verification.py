import base64
import json
from openai import OpenAI
from app.core.config import settings

# Only initialize OpenAI client if we have a real-looking key
_OPENAI_CONFIGURED = (
    settings.openai_api_key
    and settings.openai_api_key.startswith("sk-")
    and "..." not in settings.openai_api_key
    and len(settings.openai_api_key) > 20
)

client = OpenAI(api_key=settings.openai_api_key) if _OPENAI_CONFIGURED else None


async def verify_proof(
    image_bytes: bytes,
    goal_title: str,
    goal_description: str,
    goal_category: str,
) -> dict:
    """
    Use OpenAI Vision to verify if the uploaded proof image
    demonstrates completion of the stated goal.

    If OpenAI isn't configured (dev mode), auto-approves so the full
    flow can be tested without a key.
    """
    if not _OPENAI_CONFIGURED:
        return {
            "verified": True,
            "confidence": 0.9,
            "reasoning": "[Dev mode] Auto-approved. Configure OPENAI_API_KEY for real AI verification.",
        }

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = f"""You are an AI accountability verifier for an app called DeadlineMe.

A user committed to the following goal and has uploaded a photo as proof of completion.

GOAL: {goal_title}
DESCRIPTION: {goal_description or 'No additional description'}
CATEGORY: {goal_category}

Your job is to determine if the uploaded image provides reasonable evidence
that the user completed their stated goal. Be fair but not a pushover.

Guidelines:
- If the image clearly shows the goal was completed, verify it
- If the image is somewhat related but ambiguous, ask for more context but lean toward verifying
- If the image is completely unrelated or clearly fake, reject it
- Screenshots of completed work, apps showing results, photos of finished tasks are all valid
- A photo doesn't need to be perfect — just reasonable proof

Respond in this exact JSON format (no markdown, no backticks):
{{"verified": true/false, "confidence": 0.0-1.0, "reasoning": "one sentence explanation"}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=200,
            temperature=0.3,
        )

        result_text = response.choices[0].message.content.strip()
        result = json.loads(result_text)

        return {
            "verified": bool(result.get("verified", False)),
            "confidence": float(result.get("confidence", 0.0)),
            "reasoning": str(result.get("reasoning", "Unable to determine")),
        }

    except Exception as e:
        return {
            "verified": False,
            "confidence": 0.0,
            "reasoning": f"Verification error: {str(e)}. Flagged for manual review.",
        }