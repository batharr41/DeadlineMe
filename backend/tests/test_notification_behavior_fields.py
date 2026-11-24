"""Regression test for the expo-notifications NotificationBehavior migration.

expo-notifications 0.31.0 added ``shouldShowBanner`` and ``shouldShowList`` to
``NotificationBehavior`` and deprecated ``shouldShowAlert``. The foreground
notification handler must therefore return the two new fields and must not
reference the deprecated one.

This is a static check of the existing notification service so that it runs
without the React Native/Expo runtime, which is not available in this
repository's test environment.
"""

import json
import re
from pathlib import Path

MOBILE_ROOT = Path(__file__).resolve().parents[2] / "mobile"
NOTIFICATIONS_SERVICE = MOBILE_ROOT / "src" / "services" / "notifications.js"
PACKAGE_JSON = MOBILE_ROOT / "package.json"

# First version that introduced shouldShowBanner/shouldShowList and deprecated
# shouldShowAlert.
MIN_SUPPORTED_VERSION = (0, 31, 0)


def _parse_version(spec: str):
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", spec or "")
    if not match:
        raise AssertionError(f"could not parse version from {spec!r}")
    return tuple(int(part) for part in match.groups())


def _notification_behavior() -> str:
    source = NOTIFICATIONS_SERVICE.read_text(encoding="utf-8")
    match = re.search(
        r"handleNotification\s*:\s*(?:async\s*)?\(\s*\)\s*=>\s*\(\s*\{(.*?)\}\s*\)",
        source,
        re.DOTALL,
    )
    assert match, "notification handler does not return a NotificationBehavior object"
    return match.group(1)


def test_handler_uses_banner_and_list_fields():
    behavior = _notification_behavior()

    assert re.search(r"shouldShowBanner\s*:\s*true", behavior), (
        "handleNotification should return shouldShowBanner"
    )
    assert re.search(r"shouldShowList\s*:\s*true", behavior), (
        "handleNotification should return shouldShowList"
    )


def test_handler_does_not_use_deprecated_alert_field():
    behavior = _notification_behavior()

    assert "shouldShowAlert" not in behavior, (
        "handleNotification still uses the deprecated shouldShowAlert field"
    )


def test_expo_notifications_version_supports_new_fields():
    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    spec = package["dependencies"]["expo-notifications"]

    assert _parse_version(spec) >= MIN_SUPPORTED_VERSION, (
        f"expo-notifications {spec} predates shouldShowBanner/shouldShowList"
    )
