#!/usr/bin/env python3
"""
Guard against Android resource names that AAPT rejects.

Android resource names live in the same namespace as generated R fields, so
they may not collide with Java keywords. `<color name="void">` fails the build
with "void is not a valid resource name (reserved Java keyword)" — after the
whole toolchain has already downloaded. Cheaper to catch here.

    python3 scripts/check-android-res.py
"""

import glob
import os
import re
import sys

RESERVED = {
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "const", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "goto", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "native", "new",
    "package", "private", "protected", "public", "record", "return", "sealed",
    "short", "static", "strictfp", "super", "switch", "synchronized", "this",
    "throw", "throws", "transient", "try", "var", "void", "volatile", "while",
    "true", "false", "null", "yield", "permits",
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")


def main() -> int:
    if not os.path.isdir(RES):
        print("  (no android res/ directory — skipping)")
        return 0

    problems = []

    for path in glob.glob(os.path.join(RES, "**", "*.xml"), recursive=True):
        with open(path, errors="replace") as fh:
            body = fh.read()

        for match in re.finditer(r'<(?:color|string|dimen|integer|style|bool)\s[^>]*?name="([^"]+)"', body):
            name = match.group(1)
            # style names may be dotted (AppTheme.NoActionBar)
            leaf = name.split(".")[-1]
            if leaf in RESERVED:
                problems.append(
                    f"{os.path.relpath(path, ROOT)}: '{name}' is a reserved Java keyword"
                )

    if problems:
        print("  \\u2717 invalid Android resource names:")
        for p in problems:
            print("      " + p)
        return 1

    print("  \\u2713 Android resource names are valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
