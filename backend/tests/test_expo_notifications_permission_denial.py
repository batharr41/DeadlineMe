"""Regression test for expo-notifications 58.1.10 permission-denial handling.

expo-notifications 58.1.10 changes ``requestPermissionsAsync`` so that denying
the notification prompt on an iOS app running on an Apple Silicon Mac
("Designed for iPad") resolves with a denied permission status instead of
rejecting with ``ERR_PERMISSIONS_REQUEST_NOTIFICATIONS``.

The notification service must therefore read the resolved status (rather than
relying on a rejected promise), and the dependency pin must include that fix.

This is a static check of the existing service so that it runs without the
React Native/Expo runtime, which is not available in this repository's test
environment.
"""

import json
import re
from pathlib import Path

MOBILE_ROOT = Path(__file__).resolve().parents[2] / "mobile"
NOTIFICATIONS_SERVICE = MOBILE_ROOT / "src" / "services" / "notifications.js"
PACKAGE_JSON = MOBILE_ROOT / "package.json"
PACKAGE_LOCK = MOBILE_ROOT / "package-lock.json"

# First version where iOS permission denial resolves with the denied status.
MIN_FIXED_VERSION = (58, 1, 10)


def _parse_version(spec: str):
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", spec or "")
    if not match:
        raise AssertionError(f"could not parse version from {spec!r}")
    return tuple(int(part) for part in match.groups())


def test_permission_denial_fix_is_pinned_and_status_is_consumed():
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    spec = package["dependencies"]["expo-notifications"]
    assert _parse_version(spec) >= MIN_FIXED_VERSION, (
        f"expo-notifications {spec} predates the permission-denial fix"
    )

    lock = json.loads(PACKAGE_LOCK.read_text(encoding="utf-8"))
    locked_version = lock["packages"]["node_modules/expo-notifications"]["version"]
    assert _parse_version(locked_version) >= MIN_FIXED_VERSION, (
        f"lockfile still resolves expo-notifications {locked_version}"
    )

    source = NOTIFICATIONS_SERVICE.read_text(encoding="utf-8")
    assert re.search(
        r"const\s*\{\s*status\s*\}\s*=\s*await\s+"
        r"Notifications\.requestPermissionsAsync\s*\(\s*\)",
        source,
    ), "requestNotificationPermission should consume the resolved permission status"
    assert re.search(
        r"return\s+finalStatus\s*===\s*['\"]granted['\"]",
        source,
    ), "requestNotificationPermission should treat only the granted status as success"