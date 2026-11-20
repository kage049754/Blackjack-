#!/usr/bin/env python3
"""
Generate every icon The Last Hand needs, procedurally.

    python3 scripts/make_icons.py

Writes to assets/icons/ and (optionally) the Android mipmap folders.
Draws at 4x and downsamples for clean antialiasing. No external art, so the
whole icon set is reproducible from this file alone.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VOID = (7, 7, 10)
VOID_2 = (13, 11, 12)
BONE = (230, 220, 201)
BLOOD = (142, 27, 24)
GOLD = (176, 141, 79)
AMBER = (232, 176, 99)

SS = 4  # supersample factor


def radial_bg(size, inner=(30, 20, 19), outer=VOID):
    """Soft candlelit radial gradient."""
    img = Image.new("RGB", (size, size), outer)
    px = img.load()
    cx = cy = (size - 1) / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / maxd
            t = min(1.0, d ** 1.35)
            r = int(inner[0] + (outer[0] - inner[0]) * t)
            g = int(inner[1] + (outer[1] - inner[1]) * t)
            b = int(inner[2] + (outer[2] - inner[2]) * t)
            px[x, y] = (r, g, b)
    return img


GLYPH_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _glyph_font_path():
    for p in GLYPH_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def spade_mask(size, scale=1.0, cy_shift=0.0):
    """Render the real U+2660 glyph, cropped tight and centred.

    Using an actual typeface beats plotting curves by hand: the spade keeps
    proper cusps where the lobes meet the stem instead of merging into a blob.
    """
    path = _glyph_font_path()
    if not path:
        raise RuntimeError("No glyph font found; cannot draw the spade.")

    pad = size
    box = size * 3
    font = ImageFont.truetype(path, size)
    tmp = Image.new("L", (box, box), 0)
    d = ImageDraw.Draw(tmp)
    d.text((box // 2, box // 2), "\u2660", font=font, fill=255, anchor="mm")

    bbox = tmp.getbbox()
    if not bbox:
        raise RuntimeError("Glyph rendered empty.")

    glyph = tmp.crop(bbox)
    gw, gh = glyph.size

    target_h = size * scale
    target_w = gw * (target_h / gh)
    glyph = glyph.resize((max(1, int(round(target_w))), max(1, int(round(target_h)))),
                         Image.LANCZOS)

    out = Image.new("L", (size, size), 0)
    out.paste(glyph,
              (int((size - target_w) / 2),
               int((size - target_h) / 2 + size * cy_shift)))
    return out


def make_emblem(size, scale=0.62, rings=True):
    """Transparent emblem: engraved rings + glowing bone spade.

    Used for the splash screen, where the icon must sit on the void without a
    visible square edge.
    """
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rings:
        inset = 0.055 * W
        d.ellipse([inset, inset, W - inset, W - inset],
                  outline=GOLD + (160,), width=max(2, int(W * 0.007)))
        inset2 = inset + W * 0.024
        d.ellipse([inset2, inset2, W - inset2, W - inset2],
                  outline=GOLD + (55,), width=max(1, int(W * 0.003)))

    m = spade_mask(W, scale=scale, cy_shift=0.0)

    glow = m.filter(ImageFilter.GaussianBlur(W * 0.030))
    img.paste(Image.new("RGBA", (W, W), AMBER + (95,)), (0, 0), glow)
    img.paste(Image.new("RGBA", (W, W), BONE + (255,)), (0, 0), m)

    return img.resize((size, size), Image.LANCZOS)


def make_icon(size, maskable=False):
    """Full icon: candlelit field, engraved ring, bone spade, blood glint."""
    W = size * SS
    img = radial_bg(W).convert("RGBA")
    d = ImageDraw.Draw(img)

    # engraved rings
    inset = 0.085 * W if not maskable else 0.16 * W
    d.ellipse([inset, inset, W - inset, W - inset],
              outline=GOLD + (150,), width=max(2, int(W * 0.006)))
    inset2 = inset + W * 0.022
    d.ellipse([inset2, inset2, W - inset2, W - inset2],
              outline=GOLD + (60,), width=max(1, int(W * 0.003)))

    # spade, scaled down when maskable so it survives the circular crop
    scale = 0.44 if maskable else 0.52
    m = spade_mask(W, scale=scale, cy_shift=-0.01)

    glow = m.filter(ImageFilter.GaussianBlur(W * 0.028))
    img.paste(Image.new("RGBA", (W, W), AMBER + (85,)), (0, 0), glow)

    spade_layer = Image.new("RGBA", (W, W), BONE + (255,))
    img.paste(spade_layer, (0, 0), m)

    # a single blood glint at the shoulder — the "one wrong card" tell
    if not maskable:
        r = W * 0.016
        cx, cy = W / 2.0, W / 2.0
        d.ellipse([cx - r, cy + W * 0.012 - r, cx + r, cy + W * 0.012 + r],
                  fill=BLOOD + (240,))

    # vignette
    vig = Image.new("L", (W, W), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.12, -W * 0.12, W * 1.12, W * 1.12], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(W * 0.10))
    black = Image.new("RGBA", (W, W), (0, 0, 0, 255))
    inv = Image.eval(vig, lambda v: 255 - v)
    img.paste(black, (0, 0), inv.point(lambda v: int(v * 0.55)))

    out = img.resize((size, size), Image.LANCZOS)

    if not maskable:
        # rounded corners for the PWA/desktop icon
        rad = int(size * 0.19)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                               radius=rad, fill=255)
        out.putalpha(mask)

    return out



def rect_gradient(w, h, inner=(32, 21, 20), outer=VOID):
    """Radial candlelight on a rectangular canvas."""
    img = Image.new("RGB", (w, h), outer)
    px = img.load()
    cx, cy = w / 2.0, h / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(h):
        for x in range(0, w):
            d = math.hypot(x - cx, y - cy) / maxd
            t = min(1.0, d ** 1.4)
            px[x, y] = (
                int(inner[0] + (outer[0] - inner[0]) * t),
                int(inner[1] + (outer[1] - inner[1]) * t),
                int(inner[2] + (outer[2] - inner[2]) * t),
            )
    return img


def make_splash(w, h):
    """Void field with the emblem centred — no white flash on launch."""
    img = rect_gradient(w, h).convert("RGBA")

    emblem_px = int(min(w, h) * 0.46)
    emblem = make_emblem(emblem_px, scale=0.56)
    img.paste(emblem, ((w - emblem_px) // 2, (h - emblem_px) // 2), emblem)

    return img.convert("RGB")


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("  wrote", os.path.relpath(path, ROOT))


def main():
    print("Generating icons…")
    icons = os.path.join(ROOT, "assets", "icons")

    save(make_icon(192), os.path.join(icons, "icon-192.png"))
    save(make_icon(512), os.path.join(icons, "icon-512.png"))
    save(make_icon(180), os.path.join(icons, "apple-touch-icon-180.png"))
    save(make_icon(512, maskable=True), os.path.join(icons, "icon-maskable-512.png"))
    save(make_icon(32), os.path.join(icons, "favicon-32.png"))

    # Android launcher icons
    android_res = os.path.join(ROOT, "android", "app", "src", "main", "res")
    if os.path.isdir(android_res):
        densities = {
            "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96,
            "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192,
        }
        for folder, px in densities.items():
            full = make_icon(px)
            save(full, os.path.join(android_res, folder, "ic_launcher.png"))
            save(full, os.path.join(android_res, folder, "ic_launcher_round.png"))
            save(full, os.path.join(android_res, folder, "ic_launcher_foreground.png"))
        # splash screens must match Capacitor's expected dimensions exactly
        splashes = {
            ("drawable", "splash.png"): (480, 320),
            ("drawable-land-mdpi", "splash.png"): (480, 320),
            ("drawable-land-hdpi", "splash.png"): (800, 480),
            ("drawable-land-xhdpi", "splash.png"): (1280, 720),
            ("drawable-land-xxhdpi", "splash.png"): (1600, 960),
            ("drawable-land-xxxhdpi", "splash.png"): (1920, 1280),
            ("drawable-port-mdpi", "splash.png"): (320, 480),
            ("drawable-port-hdpi", "splash.png"): (480, 800),
            ("drawable-port-xhdpi", "splash.png"): (720, 1280),
            ("drawable-port-xxhdpi", "splash.png"): (960, 1600),
            ("drawable-port-xxxhdpi", "splash.png"): (1280, 1920),
        }
        for (folder, name), (w, h) in splashes.items():
            save(make_splash(w, h), os.path.join(android_res, folder, name))
    else:
        print("  (no android/ folder yet — skipped launcher icons)")

    print("Done.")


if __name__ == "__main__":
    main()
