#!/usr/bin/env python3
"""
Turn a failed Gradle log into GitHub Actions annotations.

Raw Artifact/log download is often unavailable (corporate proxies, API
redirects to a different host). Annotations, however, are always readable
through the REST API:

    gh api /repos/{owner}/{repo}/commits/{sha}/check-runs
    gh api /repos/{owner}/{repo}/check-runs/{id}/annotations

Usage:
    python3 scripts/gradle-error-annotate.py <gradle.log>
"""

import os
import sys

MAX_CHUNK = 3000
MAX_LINES = 100

KEYS = (
    "What went wrong",
    "FAILURE:",
    "error:",
    "Caused by",
    "A problem occurred",
    "Could not",
    "Execution failed",
    "Unsupported",
    "not found",
    "> ",
)


def main() -> int:
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        print("::error::gradle log not found — cannot report the failure")
        return 1

    with open(sys.argv[1], errors="replace") as fh:
        lines = fh.read().splitlines()

    picked = [ln for ln in lines if any(k in ln for k in KEYS)]
    blob = "\n".join(picked[:MAX_LINES]) if picked else "\n".join(lines[-MAX_LINES:])
    blob = blob[:24000]

    for i in range(0, len(blob), MAX_CHUNK):
        chunk = (
            blob[i:i + MAX_CHUNK]
            .replace("%", "%25")
            .replace("\r", "")
            .replace("\n", "%0A")
        )
        print("::error::" + chunk)

    return 0


if __name__ == "__main__":
    sys.exit(main())
