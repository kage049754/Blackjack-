#!/usr/bin/env python3
"""
Emit a file's contents as GitHub Actions annotations.

Raw log/artifact download redirects to a blob host that some networks (and
sandboxed agents) cannot reach. Annotations are served by the REST API
instead, so they remain readable everywhere:

    gh api /repos/{owner}/{repo}/commits/{sha}/check-runs
    gh api /repos/{owner}/{repo}/check-runs/{id}/annotations

Usage:
    python3 scripts/annotate-file.py <file> [error|notice|warning] [title]
"""

import os
import sys

MAX_CHUNK = 3000


def main() -> int:
    if len(sys.argv) < 2 or not os.path.exists(sys.argv[1]):
        print("::error::file not found — cannot report")
        return 1

    level = sys.argv[2] if len(sys.argv) > 2 else "notice"
    if level not in ("error", "warning", "notice"):
        level = "notice"

    title = sys.argv[3] if len(sys.argv) > 3 else ""

    with open(sys.argv[1], errors="replace") as fh:
        blob = fh.read()[:24000]

    prefix = f"::{level}"
    if title:
        safe_title = title.replace("\n", " ").replace(":", " ")
        prefix += f" title={safe_title}"
    prefix += "::"

    for i in range(0, len(blob), MAX_CHUNK):
        chunk = (
            blob[i:i + MAX_CHUNK]
            .replace("%", "%25")
            .replace("\r", "")
            .replace("\n", "%0A")
        )
        print(prefix + chunk)

    return 0


if __name__ == "__main__":
    sys.exit(main())
