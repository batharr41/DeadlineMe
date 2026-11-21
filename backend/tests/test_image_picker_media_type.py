"""Regression test for the expo-image-picker MediaType migration.

expo-image-picker deprecates the ``MediaTypeOptions`` enum in favour of the
``MediaType`` string union. The picker's ``mediaTypes`` option must therefore
be passed as an array of media type strings (for example ``['images']``) and
the deprecated enum must no longer be referenced.

This is a static check of the existing screen so that it runs without the
React Native/Expo runtime, which is not available in this repository's test
environment.
"""

import re
from pathlib import Path

PROOF_SCREEN = (
    Path(__file__).resolve().parents[2]
    / "mobile"
    / "src"
    / "screens"
    / "ProofScreen.js"
)


def _uses_images_media_type(source: str, picker: str) -> bool:
    return bool(
        re.search(
            rf"{picker}\s*\(\s*\{{[^}}]*mediaTypes\s*:\s*\[\s*['\"]images['\"]\s*\]",
            source,
            re.DOTALL,
        )
    )


def test_pickers_use_media_type_string_array():
    source = PROOF_SCREEN.read_text(encoding="utf-8")

    assert "MediaTypeOptions" not in source, (
        "ProofScreen still references the deprecated MediaTypeOptions enum"
    )

    assert _uses_images_media_type(source, "launchImageLibraryAsync"), (
        "launchImageLibraryAsync should pass mediaTypes: ['images']"
    )
    assert _uses_images_media_type(source, "launchCameraAsync"), (
        "launchCameraAsync should pass mediaTypes: ['images']"
    )