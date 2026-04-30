import base64
import json
import logging
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key)

_OPENAI_CONFIGURED = (
    settings.openai_api_key
    and not settings.openai_api_key.startswith("sk-placeholder")
    and len(settings.openai_api_key) > 20
)


async def verify_proof(
    image_bytes: bytes,
    goal_title: str,
    goal_description: str,
    goal_category: str,
) -> dict:
    """
    Use OpenAI Vision to verify if the uploaded proof image
    demonstrates completion of the stated goal.

    Returns:
        dict with 'verified' (bool), 'confidence' (float), 'reasoning' (str)
    """

    # Dev mode fallback if no real key
    if not _OPENAI_CONFIGURED:
        logger.info("[DEV MODE] Auto-approving proof — no OpenAI key configured")
        return {
            "verified": True,
            "confidence": 1.0,
            "reasoning": "Dev mode — auto-approved. Configure OPENAI_API_KEY for real verification.",
        }

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = f"""You are a fair but strict AI accountability verifier for an app called DeadlineMe.

A user committed to the following goal and has uploaded a photo as proof of completion.

GOAL: {goal_title}
DESCRIPTION: {goal_description or 'No additional description provided'}
CATEGORY: {goal_category}

Your job is to determine if the uploaded image provides reasonable evidence that the user completed their stated goal.

Guidelines:
- If the image clearly shows the goal was completed, verify it (verified: true)
- If the image is somewhat related but ambiguous, lean toward verifying but note the ambiguity
- If the image is completely unrelated, clearly fake, or shows no evidence of completion, reject it
- Screenshots of completed work, apps showing results, photos of finished tasks are all valid
- A photo doesn't need to be perfect — just reasonable proof
- Do NOT verify if the image is a blank screen, random photo with no connection to the goal, or obviously staged

Be fair. People are real money on the line. Don't be too harsh, but don't be a pushover either.

Respond ONLY in this exact JSON format with no markdown, no backticks, no extra text:
{{"verified": true, "confidence": 0.95, "reasoning": "One clear sentence explaining your decision."}}"""

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
                                "detail": "low",  # Cheaper, still accurate for most proofs
                            },
                        },
                    ],
                }
            ],
            max_tokens=150,
            temperature=0.2,  # Low temperature = more consistent decisions
        )

        result_text = response.choices[0].message.content.strip()
        logger.info(f"OpenAI verification response: {result_text}")

        result = json.loads(result_text)

        return {
            "verified": bool(result.get("verified", False)),
            "confidence": float(result.get("confidence", 0.0)),
            "reasoning": str(result.get("reasoning", "Unable to determine")),
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response: {e}")
        return {
            "verified": False,
            "confidence": 0.0,
            "reasoning": "Verification failed — please try uploading a clearer image.",
        }

    except Exception as e:
        logger.error(f"OpenAI verification error: {e}")
        return {
            "verified": False,
            "confidence": 0.0,
            "reasoning": "Verification temporarily unavailable. Your stake is safe — try again shortly.",
        }
