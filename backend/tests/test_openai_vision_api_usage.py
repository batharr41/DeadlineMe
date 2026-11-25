"""Regression test for the OpenAI proof-verification call.

The November 2026 OpenAI spec changes remove/deprecate the Assistants,
Conversations, Evals and Audio Translations surfaces. The proof verifier does
not use any of those APIs: it uses the still-supported Chat Completions
endpoint with an image content part, so this test pins that usage and guards
against moving the call site onto a removed endpoint.

This is a static check of the existing service because the OpenAI SDK is not a
test dependency in this repository's test environment.
"""

import re
from pathlib import Path

SERVICE = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "ai_verification.py"
)


def _source() -> str:
    return SERVICE.read_text(encoding="utf-8")


def test_uses_supported_chat_completions_endpoint():
    source = _source()

    assert re.search(
        r"client\s*\.\s*chat\s*\.\s*completions\s*\.\s*create\s*\(", source
    ), "verify_proof should call the supported client.chat.completions.create endpoint"


def test_does_not_use_removed_or_deprecated_endpoints():
    source = _source().lower()

    for path in (
        "/assistants",
        "/conversations",
        "/evals",
        "/audio/translations",
        "client.assistants",
        "client.beta.assistants",
        "client.beta.threads",
        "client.conversations",
        "client.evals",
        "client.audio.translations",
    ):
        assert path not in source, (
            f"verify_proof should not use the removed OpenAI endpoint {path!r}"
        )


def test_still_sends_the_proof_image_as_a_base64_data_url():
    source = _source()

    assert re.search(r'"type"\s*:\s*"image_url"', source), (
        "the vision request should still send an image_url content part"
    )
    assert re.search(
        r'f"data:image/jpeg;base64,\{base64_image\}"', source
    ), "the proof image should still be sent as a base64 data URL"


def test_still_reads_the_chat_completion_message_content():
    source = _source()

    assert re.search(
        r"response\s*\.\s*choices\s*\[\s*0\s*\]\s*\.\s*message\s*\.\s*content",
        source,
    ), "the verifier should still parse choices[0].message.content"
