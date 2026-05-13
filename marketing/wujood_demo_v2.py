#!/usr/bin/env python3
"""
Wujood Web Agency — 30-second Demo Video v2  (BRIGHT rebuild)
1920×1080 @ 30fps | Desert Rose palette
Scenes:
  1  0–6s   WUJOOD logo reveal with light rays
  2  6–12s  Phone mockup building itself, rose-glowing screen
  3 12–18s  Arabic + English side-by-side feature text
  4 18–24s  Stats counter — 48h / 2000 QAR / 300 QAR
  5 24–30s  CTA getwujood.com with rose glow
"""

import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display
from moviepy import VideoClip, concatenate_videoclips

# ── Palette ───────────────────────────────────────────────────────────────────
ROSE       = (212, 165, 165)   # #d4a5a5   hero accent
CLAY       = (184, 125, 109)   # #b87d6d   secondary
SAND       = (232, 213, 196)   # #e8d5c4   bright text
BURGUNDY   = (93,  46,  70)    # #5d2e46   deep accent
BG         = (14,  8,   12)    # #0e080c   true black
# Warm mid-tones for rich backgrounds
BG_WARM    = (38,  18,  28)    # dark burgundy base
BG_MID     = (62,  28,  46)    # mid burgundy
WHITE      = (255, 255, 255)
WA_GREEN   = (37, 211, 102)

W, H = 1920, 1080
FPS  = 30

# ── Fonts ─────────────────────────────────────────────────────────────────────
F_ARABIC = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf"
F_BOLD   = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
F_REG    = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

def fnt(path, size):
    return ImageFont.truetype(path, max(8, int(size)))


# ── Math ──────────────────────────────────────────────────────────────────────
def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def ease_out(t, exp=3):
    return 1 - (1 - clamp(t)) ** exp

def ease_in_out(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)

def prog(t, start, end):
    return clamp((t - start) / max(end - start, 1e-9))

def lerp(a, b, t):
    t = clamp(t)
    return a + (b - a) * t


# ── Color ─────────────────────────────────────────────────────────────────────
def blend(a, b, alpha):
    alpha = clamp(alpha)
    return tuple(int(a[i] + (b[i] - a[i]) * alpha) for i in range(3))

def bright(color, factor):
    """Brighten a color by factor (>1 = brighter, capped at 255)."""
    return tuple(min(255, int(c * factor)) for c in color)

def mix(*color_alpha_pairs):
    """Mix N (color, alpha) pairs additively over BG_WARM."""
    r, g, b = BG_WARM
    for color, alpha in color_alpha_pairs:
        alpha = clamp(alpha)
        r = min(255, r + int(color[0] * alpha))
        g = min(255, g + int(color[1] * alpha))
        b = min(255, b + int(color[2] * alpha))
    return (r, g, b)


# ── Drawing ───────────────────────────────────────────────────────────────────
def new_frame():
    img = Image.new("RGB", (W, H), BG_WARM)
    return img, ImageDraw.Draw(img)


def fill_gradient(img, top_col, bot_col):
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / H
        arr[y, :] = [int(top_col[c] + (bot_col[c] - top_col[c]) * t) for c in range(3)]
    img.paste(Image.fromarray(arr))


def radial_gradient(img, cx, cy, r_max, center_col, edge_col):
    """Faster radial gradient via numpy."""
    arr = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    dist = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.6) ** 2)
    t = np.clip(dist / r_max, 0, 1)
    for c in range(3):
        arr[:, :, c] = center_col[c] * (1 - t) + edge_col[c] * t
    img.paste(Image.fromarray(arr.astype(np.uint8)))


def glow_additive(img, cx, cy, r_max, color, strength=0.6, steps=40):
    """Additive glow via numpy."""
    arr = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    dist = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.5) ** 2)
    falloff = np.clip(1 - dist / r_max, 0, 1) ** 2.5
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + color[c] * falloff * strength, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))


def text_cx(draw, text, fnt_obj, y, color, xcenter=W // 2):
    bb = draw.textbbox((0, 0), text, font=fnt_obj)
    x  = xcenter - (bb[2] - bb[0]) // 2
    draw.text((x, y), text, font=fnt_obj, fill=color)
    return bb[2] - bb[0]


def rrect(draw, x0, y0, x1, y1, r=16, fill=None, outline=None, lw=2):
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r,
                            fill=fill, outline=outline, width=lw)


def diamond(draw, cx, cy, size, color):
    draw.polygon([(cx, cy - size), (cx + size, cy),
                  (cx, cy + size), (cx - size, cy)], fill=color)


def ar(text):
    return get_display(arabic_reshaper.reshape(text))


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 1 — Logo reveal + light rays  (0–6 s)
# ═══════════════════════════════════════════════════════════════════════════════
def scene1(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    # Rich warm background gradient
    p_bg = ease_out(prog(t, 0, 2.0))
    top_c = blend(BG_WARM, BG_MID, 0.7 * p_bg)
    bot_c = blend(BG_WARM, BURGUNDY, 0.4 * p_bg)
    fill_gradient(img, top_c, bot_c)

    # Central rose glow (strong)
    gp = ease_out(prog(t, 0.0, 1.8))
    if gp > 0:
        glow_additive(img, cx, cy, int(700 * gp), ROSE, strength=0.55 * gp)
        glow_additive(img, cx, cy, int(350 * gp), SAND, strength=0.30 * gp)
    draw = ImageDraw.Draw(img)

    # Light rays
    ray_p = ease_out(prog(t, 0.15, 1.8))
    n_rays = 32
    for i in range(n_rays):
        angle  = (i / n_rays) * math.pi * 2
        length = int(860 * ray_p * (0.55 + 0.45 * math.sin(i * 2.1)))
        lw     = max(1, 5 - i % 4)
        a_val  = 0.22 * ray_p * (0.45 + 0.55 * math.sin(i * 1.9 + t * 0.5))
        col    = blend(BG_MID, SAND if i % 2 == 0 else ROSE, a_val)
        x2 = cx + int(length * math.cos(angle))
        y2 = cy + int(length * math.sin(angle))
        draw.line([(cx, cy), (x2, y2)], fill=col, width=lw)

    # Spinning dot ring
    dot_p = ease_out(prog(t, 0.7, 2.2))
    if dot_p > 0:
        for i in range(28):
            angle = (i / 28) * 2 * math.pi + t * 0.22
            rr    = 400 + 45 * math.sin(i * 1.4 + t * 0.6)
            dx    = cx + rr * math.cos(angle)
            dy    = cy + rr * math.sin(angle) * 0.32
            da    = dot_p * (0.5 + 0.45 * math.sin(i * 1.2 + t))
            col   = blend(BG_MID, ROSE if i % 3 != 0 else CLAY, da)
            dr    = 6 + 3 * math.sin(t * 1.4 + i)
            draw.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=col)

    # WUJOOD letters — large, bright
    logo_p = ease_out(prog(t, 0.5, 1.8))
    if logo_p > 0:
        letters  = "WUJOOD"
        f_big    = fnt(F_BOLD, 138)
        letter_w = 96
        total_w  = (len(letters) - 1) * letter_w
        x0_logo  = cx - total_w // 2 - 30

        for idx, ch in enumerate(letters):
            lp  = ease_out(prog(t, 0.5 + idx * 0.06, 1.8))
            # Drop shadow
            draw.text((x0_logo + idx * letter_w + 4, cy - 82 + 4), ch,
                       font=f_big, fill=blend(BG, BURGUNDY, lp * 0.7))
            # Main — SAND at full brightness
            col = blend(BG_WARM, SAND, lp)
            draw.text((x0_logo + idx * letter_w, cy - 82), ch,
                       font=f_big, fill=col)

    # Arabic وجود
    ar_p = ease_out(prog(t, 1.2, 2.4))
    if ar_p > 0:
        f_ar  = fnt(F_ARABIC, 64)
        ar_col = blend(BG_MID, ROSE, ar_p)
        text_cx(draw, ar("وجود"), f_ar, cy + 82, ar_col)

    # Horizontal rule
    hr_p = ease_out(prog(t, 1.6, 2.4))
    if hr_p > 0:
        rl = int(460 * hr_p)
        draw.rectangle([cx - rl, cy + 158, cx + rl, cy + 162],
                       fill=blend(BG_MID, CLAY, hr_p))

    # Tagline
    tag_p = ease_out(prog(t, 2.0, 3.0))
    if tag_p > 0:
        f_tag = fnt(F_REG, 30)
        tag_col = blend(BG_MID, ROSE, tag_p)
        text_cx(draw, "Web Agency  ·  " + ar("وكالة ويب"), f_tag, cy + 174, tag_col)

    # URL pill
    url_p = ease_out(prog(t, 2.8, 4.0))
    if url_p > 0:
        pw, ph = 400, 58
        px, py = cx - pw // 2, cy + 232
        rrect(draw, px, py, px + pw, py + ph, r=29,
              fill=blend(BG_MID, BURGUNDY, url_p),
              outline=blend(BG_MID, ROSE, url_p), lw=2)
        text_cx(draw, "getwujood.com", fnt(F_BOLD, 24),
                py + 14, blend(BG_MID, SAND, url_p))

    # Fade in from BG
    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 2 — Phone mockup  (6–12 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
PH_W, PH_H = 330, 600
PH_X = (W - PH_W) // 2
PH_Y = (H - PH_H) // 2 - 20

def phone_screen_content(draw, sx, sy, sw, sh, p):
    # Nav bar
    s1 = ease_out(prog(p, 0.05, 0.40))
    if s1 > 0:
        nav_col = blend(BG_MID, BURGUNDY, s1 * 0.85)
        draw.rectangle([sx, sy, sx + sw, sy + 52], fill=nav_col)
        draw.text((sx + 14, sy + 14), "WUJOOD",
                  font=fnt(F_BOLD, 16), fill=blend(BG_MID, SAND, s1))
        for ni, nx in enumerate([sx + sw - 54, sx + sw - 36, sx + sw - 18]):
            a = s1 * (0.6 + 0.4 * (ni == 0))
            draw.ellipse([nx, sy + 20, nx + 10, sy + 30],
                         fill=blend(BG_MID, ROSE, a))

    # Hero text
    s2 = ease_out(prog(p, 0.35, 0.66))
    if s2 > 0:
        draw.text((sx + 14, sy + 66), "Your Website",
                  font=fnt(F_BOLD, 20), fill=blend(BG_MID, SAND, s2))
        draw.text((sx + 14, sy + 94), "in 48 Hours",
                  font=fnt(F_BOLD, 20), fill=blend(BG_MID, ROSE, s2))
        draw.text((sx + 14, sy + 122), ar("موقعك في 48 ساعة"),
                  font=fnt(F_ARABIC, 14), fill=blend(BG_MID, CLAY, s2))
        rrect(draw, sx + 14, sy + 148, sx + 134, sy + 176, r=10,
              fill=blend(BG_MID, BURGUNDY, s2),
              outline=blend(BG_MID, ROSE, s2), lw=1)
        draw.text((sx + 24, sy + 155), "Get Started",
                  font=fnt(F_BOLD, 12), fill=blend(BG_MID, SAND, s2))

    # Service cards
    s3 = ease_out(prog(p, 0.60, 1.0))
    if s3 > 0:
        services = [ar("تصميم احترافي"), ar("سريع وآمن"), ar("دعم دائم")]
        for idx, svc in enumerate(services):
            yy  = sy + 192 + idx * 66
            sp  = ease_out(prog(p, 0.60 + idx * 0.09, 0.96 + idx * 0.04))
            if sp > 0:
                rrect(draw, sx + 10, yy, sx + sw - 10, yy + 54, r=10,
                      fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.2), sp * 0.8),
                      outline=blend(BG_MID, ROSE, sp * 0.6), lw=1)
                # Diamond icon
                diamond(draw, sx + 30, yy + 27, 9, blend(BG_MID, ROSE, sp))
                draw.text((sx + 48, yy + 16), svc,
                          font=fnt(F_ARABIC, 13), fill=blend(BG_MID, SAND, sp))


def scene2(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 1.5))
    top_c = blend(BG_WARM, BG_MID, 0.8 * p_bg)
    bot_c = blend(BG_WARM, BURGUNDY, 0.5 * p_bg)
    fill_gradient(img, top_c, bot_c)

    # Background rose glow centred on phone
    bgp = ease_out(prog(t, 0.3, 2.0))
    if bgp > 0:
        glow_additive(img, cx, cy, 620, ROSE, strength=0.38 * bgp)
        glow_additive(img, cx, cy, 300, CLAY, strength=0.20 * bgp)

    draw = ImageDraw.Draw(img)

    # Sparkle field
    for i in range(28):
        angle = (i / 28) * 2 * math.pi + t * 0.18
        r     = 520 + 70 * math.sin(i * 1.7 + t * 0.35)
        dx    = cx + r * math.cos(angle)
        dy    = cy + r * math.sin(angle) * 0.38
        da    = 0.25 * (0.5 + 0.5 * math.sin(t * 0.9 + i))
        dr    = 3 + 2 * math.sin(i + t)
        draw.ellipse([dx - dr, dy - dr, dx + dr, dy + dr],
                     fill=blend(BG_MID, ROSE, da))

    # Phone shell
    phone_p = ease_out(prog(t, 0, 1.2))
    x0, y0 = PH_X, PH_Y
    x1, y1 = PH_X + PH_W, PH_Y + PH_H

    if phone_p > 0:
        shell_fill = blend(BG_MID, BURGUNDY, phone_p * 0.9)
        rrect(draw, x0, y0, x1, y1, r=38,
              fill=shell_fill, outline=blend(BG_MID, ROSE, phone_p), lw=3)
        # Screen area
        sx, sy = x0 + 14, y0 + 32
        sw, sh = PH_W - 28, PH_H - 58
        screen_bg = blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), 0.65)
        rrect(draw, sx, sy, sx + sw, sy + sh, r=10, fill=screen_bg)
        # Notch
        nw = 74
        rrect(draw, cx - nw // 2, y0 - 2, cx + nw // 2, y0 + 22, r=8, fill=BG)
        # Home bar
        draw.rounded_rectangle(
            [cx - 38, y1 - 20, cx + 38, y1 - 10],
            radius=4, fill=blend(BG_MID, SAND, phone_p * 0.6))
        # Screen content
        if phone_p > 0.2:
            phone_screen_content(draw, sx, sy, sw, sh, min(1.0, phone_p * 3))

    # Left label
    lp = ease_out(prog(t, 1.0, 2.4))
    if lp > 0:
        lx = PH_X - 380
        for yi, (txt, col) in enumerate([
            ("Beautiful.", SAND), ("Fast.", ROSE), ("Affordable.", CLAY)]):
            draw.text((lx, H // 2 - 80 + yi * 52), txt,
                      font=fnt(F_BOLD, 42), fill=blend(BG_MID, col, lp))
        draw.rectangle([lx, H // 2 + 90, lx + int(260 * lp), H // 2 + 94],
                       fill=blend(BG_MID, ROSE, lp))

    # Right Arabic label
    rp = ease_out(prog(t, 1.8, 3.2))
    if rp > 0:
        rx = PH_X + PH_W + 46
        for yi, (txt, col) in enumerate([
            (ar("جميل"), SAND), (ar("سريع"), ROSE), (ar("بأسعار معقولة"), CLAY)]):
            fsz = 42 if yi < 2 else 30
            draw.text((rx, H // 2 - 80 + yi * 52), txt,
                      font=fnt(F_ARABIC, fsz), fill=blend(BG_MID, col, rp))

    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 3 — Arabic + English side-by-side  (12–18 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
FEATURES_S3 = [
    ("Professional Design",  ar("تصميم احترافي")),
    ("Mobile Responsive",    ar("متوافق مع الجوال")),
    ("Fast Delivery · 48h",  ar("تسليم سريع · 48 ساعة")),
    ("SEO Optimised",        ar("محسّن لمحركات البحث")),
]

def scene3(t):
    img, draw = new_frame()
    cx = W // 2

    p_bg = ease_out(prog(t, 0, 1.4))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID, 0.9 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.55 * p_bg))
    gp = ease_out(prog(t, 0, 2.0))
    if gp > 0:
        glow_additive(img, cx, H // 2, 700, ROSE, strength=0.22 * gp)
    draw = ImageDraw.Draw(img)

    # Divider
    div_p = ease_out(prog(t, 0.3, 1.2))
    if div_p > 0:
        dh = int(600 * div_p)
        draw.rectangle([cx - 2, (H - dh) // 2, cx + 2, (H + dh) // 2],
                       fill=blend(BG_MID, ROSE, div_p * 0.7))

    # Column headers
    hdr_p = ease_out(prog(t, 0.6, 1.6))
    if hdr_p > 0:
        draw.text((cx - 480, 72), "English",
                  font=fnt(F_BOLD, 40), fill=blend(BG_MID, SAND, hdr_p))
        text_cx(draw, ar("العربية"), fnt(F_ARABIC, 40), 72,
                blend(BG_MID, SAND, hdr_p), xcenter=cx + 260)
        rl = int(180 * hdr_p)
        draw.rectangle([cx - 480, 122, cx - 480 + rl, 126],
                       fill=blend(BG_MID, CLAY, hdr_p))
        draw.rectangle([cx + 150, 122, cx + 150 + rl, 126],
                       fill=blend(BG_MID, CLAY, hdr_p))

    # Feature rows
    card_h  = 116
    start_y = 180
    stagger = 0.55

    for idx, (en_text, ar_text) in enumerate(FEATURES_S3):
        cp = ease_out(prog(t, 0.9 + idx * stagger, 2.3 + idx * stagger))
        if cp <= 0:
            continue

        y  = start_y + idx * (card_h + 22)
        y2 = y + card_h

        # EN card
        rrect(draw, cx - 548, y, cx - 30, y2, r=14,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), cp * 0.80),
              outline=blend(BG_MID, ROSE, cp * 0.6), lw=2)
        diamond(draw, cx - 520, y + card_h // 2, 13,
                blend(BG_MID, ROSE, cp))
        draw.text((cx - 492, y + 20), en_text,
                  font=fnt(F_BOLD, 28), fill=blend(BG_MID, SAND, cp))

        # AR card
        rrect(draw, cx + 30, y, cx + 548, y2, r=14,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), cp * 0.80),
              outline=blend(BG_MID, ROSE, cp * 0.6), lw=2)
        # Right-align Arabic
        ar_fnt  = fnt(F_ARABIC, 28)
        ar_bbox = draw.textbbox((0, 0), ar_text, font=ar_fnt)
        ar_w    = ar_bbox[2] - ar_bbox[0]
        draw.text((cx + 528 - ar_w, y + 20), ar_text,
                  font=ar_fnt, fill=blend(BG_MID, SAND, cp))

        # Connector dot
        draw.ellipse([cx - 8, y + card_h // 2 - 8,
                      cx + 8, y + card_h // 2 + 8],
                     fill=blend(BG_MID, ROSE, cp))

    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 4 — Stats counter  (18–24 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
STATS = [
    ("48",   "h",    "Hours to Launch",  ar("ساعة للإطلاق")),
    ("2000", " QAR", "Full Website",     ar("موقع كامل")),
    ("300",  " QAR", "Landing Page",     ar("صفحة هبوط")),
]

def count_up(val, p):
    try:
        n = int(val)
        return str(int(n * ease_out(clamp(p), exp=2)))
    except ValueError:
        return val


def scene4(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 1.5))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID, 0.9 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.55 * p_bg))
    gp = ease_out(prog(t, 0, 2.0))
    if gp > 0:
        glow_additive(img, cx, cy, 680, ROSE, strength=0.30 * gp)
        glow_additive(img, cx, cy, 380, CLAY, strength=0.18 * gp)
    draw = ImageDraw.Draw(img)

    # Heading
    hdr_p = ease_out(prog(t, 0.2, 1.4))
    if hdr_p > 0:
        text_cx(draw, "Transparent Pricing",
                fnt(F_BOLD, 56), 72, blend(BG_MID, SAND, hdr_p))
        text_cx(draw, ar("أسعار شفافة"),
                fnt(F_ARABIC, 44), 144, blend(BG_MID, ROSE, hdr_p * 0.95))
        rl = int(340 * hdr_p)
        draw.rectangle([cx - rl, 202, cx + rl, 206],
                       fill=blend(BG_MID, CLAY, hdr_p))

    # Cards
    card_w, card_h = 480, 270
    gap            = 48
    total_w        = 3 * card_w + 2 * gap
    sx_base        = cx - total_w // 2
    stagger        = 0.55

    for idx, (val, unit, en_label, ar_label) in enumerate(STATS):
        cp    = ease_out(prog(t, 0.8 + idx * stagger, 2.2 + idx * stagger))
        num_p = prog(t, 0.8 + idx * stagger, 3.2 + idx * stagger)
        if cp <= 0:
            continue

        cx_c = sx_base + idx * (card_w + gap) + card_w // 2
        cy_c = cy + 52

        rrect(draw, cx_c - card_w // 2, cy_c - card_h // 2,
              cx_c + card_w // 2, cy_c + card_h // 2, r=26,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.10), cp * 0.88),
              outline=blend(BG_MID, ROSE, cp), lw=2)

        # Accent bar top
        draw.rectangle([cx_c - card_w // 2 + 18, cy_c - card_h // 2 + 12,
                         cx_c - card_w // 2 + 18 + int((card_w - 36) * cp),
                         cy_c - card_h // 2 + 18],
                       fill=blend(BG_MID, ROSE, cp))

        # Number
        num_str = count_up(val, num_p)
        f_num   = fnt(F_BOLD, 88)
        f_unit  = fnt(F_BOLD, 32)
        num_bb  = draw.textbbox((0, 0), num_str, font=f_num)
        unt_bb  = draw.textbbox((0, 0), unit,    font=f_unit)
        combo_w = (num_bb[2] - num_bb[0]) + (unt_bb[2] - unt_bb[0]) + 6
        xn = cx_c - combo_w // 2
        draw.text((xn, cy_c - 66), num_str, font=f_num,
                  fill=blend(BG_MID, SAND, cp))
        draw.text((xn + num_bb[2] - num_bb[0] + 6, cy_c - 30), unit,
                  font=f_unit, fill=blend(BG_MID, ROSE, cp))

        # EN label
        text_cx(draw, en_label, fnt(F_BOLD, 20),
                cy_c + 42, blend(BG_MID, SAND, cp * 0.9), xcenter=cx_c)
        # AR label
        text_cx(draw, ar_label, fnt(F_ARABIC, 20),
                cy_c + 76, blend(BG_MID, CLAY, cp * 0.9), xcenter=cx_c)

        # Bottom diamond
        diamond(draw, cx_c, cy_c + card_h // 2 - 22, 9,
                blend(BG_MID, ROSE, cp))

    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 5 — CTA getwujood.com  (24–30 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
def scene5(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 1.8))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID, 0.9 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.60 * p_bg))

    # Pulsing rose glow
    appear = ease_out(prog(t, 0.8, 2.2))
    pulse1 = (math.sin(t * 2.2) + 1) / 2
    pulse2 = (math.sin(t * 2.2 + 1.1) + 1) / 2
    if appear > 0:
        glow_additive(img, cx, cy + 40, int(580 + 90 * pulse1), ROSE,
                      strength=0.50 * appear)
        glow_additive(img, cx, cy + 40, int(340 + 55 * pulse2), CLAY,
                      strength=0.28 * appear)
        glow_additive(img, cx, cy + 40, 200, SAND,
                      strength=0.12 * appear)
    draw = ImageDraw.Draw(img)

    # Animated ellipse rings
    ring_p = ease_out(prog(t, 0.5, 2.0))
    for ri in range(5):
        rr    = int((240 + ri * 90) * ring_p)
        r_a   = (0.18 - ri * 0.03) * ring_p * (0.55 + 0.45 * math.sin(t + ri))
        draw.ellipse([cx - rr, cy + 40 - int(rr * 0.42),
                      cx + rr, cy + 40 + int(rr * 0.42)],
                     outline=blend(BG_MID, ROSE, r_a), width=2)

    # WUJOOD + Arabic header
    logo_p = ease_out(prog(t, 0.2, 1.4))
    if logo_p > 0:
        text_cx(draw, "WUJOOD", fnt(F_BOLD, 70),
                cy - 276, blend(BG_MID, SAND, logo_p))
        text_cx(draw, ar("وجود"), fnt(F_ARABIC, 48),
                cy - 196, blend(BG_MID, ROSE, logo_p * 0.9))

    # Horizontal rule
    hr_p = ease_out(prog(t, 1.0, 1.8))
    if hr_p > 0:
        rl = int(440 * hr_p)
        draw.rectangle([cx - rl, cy - 136, cx + rl, cy - 132],
                       fill=blend(BG_MID, CLAY, hr_p))

    # Headline
    hl_p = ease_out(prog(t, 1.2, 2.2))
    if hl_p > 0:
        text_cx(draw, "Your website. Live in 48 hours.",
                fnt(F_BOLD, 46), cy - 112, blend(BG_MID, SAND, hl_p))
        text_cx(draw, ar("موقعك. جاهز خلال 48 ساعة."),
                fnt(F_ARABIC, 36), cy - 54, blend(BG_MID, ROSE, hl_p * 0.9))

    # Big URL pill — hero element with animated glow border
    url_p = ease_out(prog(t, 1.8, 3.0))
    if url_p > 0:
        pw, ph = 700, 92
        px, py = cx - pw // 2, cy + 14

        # Multi-layer glow border
        for bw in range(10, 0, -3):
            ba = url_p * (0.55 + 0.35 * pulse1) * (1 - bw / 12)
            rrect(draw, px - bw, py - bw, px + pw + bw, py + ph + bw,
                  r=46 + bw, outline=blend(BG_MID, ROSE, ba), lw=1)

        rrect(draw, px, py, px + pw, py + ph, r=46,
              fill=blend(BG_MID, BURGUNDY, url_p * 0.95),
              outline=blend(BG_MID, ROSE, url_p), lw=3)

        text_cx(draw, "getwujood.com", fnt(F_BOLD, 48),
                py + 22, blend(BG_MID, SAND, url_p))

    # WhatsApp row
    wa_p = ease_out(prog(t, 2.8, 4.0))
    if wa_p > 0:
        wix, wiy = cx - 220, cy + 162
        wr = 22
        draw.ellipse([wix - wr, wiy - wr, wix + wr, wiy + wr],
                     fill=blend(BG_MID, WA_GREEN, wa_p))
        # Simple phone symbol — two nested circles
        draw.ellipse([wix - 9, wiy - 9, wix + 9, wiy + 9],
                     outline=blend(BG_MID, WHITE, wa_p), width=2)

        draw.text((wix + 36, wiy - 20), "WhatsApp  +974 XXXX XXXX",
                  font=fnt(F_BOLD, 28), fill=blend(BG_MID, SAND, wa_p))
        draw.text((wix + 36, wiy + 12), ar("تواصل معنا عبر واتساب"),
                  font=fnt(F_ARABIC, 22), fill=blend(BG_MID, ROSE, wa_p * 0.9))

    # Fine print
    sp = ease_out(prog(t, 3.8, 4.8))
    if sp > 0:
        text_cx(draw, "No hidden fees  ·  Full ownership  ·  " + ar("بدون رسوم خفية"),
                fnt(F_REG, 22), cy + 240, blend(BG_MID, CLAY, sp * 0.9))

    # Fade in / out
    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)

    fo = ease_in_out(prog(t, 5.3, 6.0))
    if fo > 0:
        img = Image.blend(img, Image.new("RGB", (W, H), BG), fo)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# Assemble & export
# ═══════════════════════════════════════════════════════════════════════════════
SCENES = [
    (scene1, 6.0),
    (scene2, 6.0),
    (scene3, 6.0),
    (scene4, 6.0),
    (scene5, 6.0),
]

if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "wujood_demo_v2.mp4")
    print("Building Wujood Demo v2 (bright) …")
    clips = [VideoClip(lambda t, fn=fn: fn(t), duration=dur).with_fps(FPS)
             for fn, dur in SCENES]
    total = sum(d for _, d in SCENES)
    print(f"  5 scenes | {total}s | {W}×{H} @ {FPS}fps")
    concatenate_videoclips(clips).write_videofile(
        out_path, fps=FPS, codec="libx264", audio=False,
        preset="medium",
        ffmpeg_params=["-crf", "16", "-pix_fmt", "yuv420p"],
        logger="bar",
    )
    print(f"\n✓  {out_path}")
