#!/usr/bin/env python3
"""
Wujood Web Agency — 30-second Demo Video v2 (final)
1920×1080 @ 30fps | Desert Rose palette
Scenes:
  1  0–6s   WUJOOD logo reveal with light rays
  2  6–12s  Phone mockup building itself, rose-glowing screen
  3 12–18s  Arabic + English side-by-side feature text
  4 18–24s  Stats counter — 48h / 2000 QAR
  5 24–30s  CTA getwujood.com + +974 7727 7292 + WhatsApp
"""

import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from arabic_reshaper import ArabicReshaper as _ArabicReshaper
from bidi.algorithm import get_display
from moviepy import VideoClip, concatenate_videoclips

# ── Arabic fix (applied to EVERY Arabic string without exception) ─────────────
_reshaper = _ArabicReshaper(configuration={
    'delete_harakat': True,
    'support_ligatures': True,
    'RIAL SIGN': True,
    'support_zero_width_joiner': True,
})

def fix_arabic(text: str) -> str:
    """Reshape + bidi-reorder Arabic text for correct left-to-right PIL rendering."""
    return get_display(_reshaper.reshape(text))

# Short alias used throughout
ar = fix_arabic

# ── Palette ───────────────────────────────────────────────────────────────────
ROSE       = (212, 165, 165)   # #d4a5a5
CLAY       = (184, 125, 109)   # #b87d6d
SAND       = (232, 213, 196)   # #e8d5c4
BURGUNDY   = (93,  46,  70)    # #5d2e46
BG         = (14,  8,   12)    # #0e080c
BG_WARM    = (38,  18,  28)    # warm dark base
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


# ── Color ─────────────────────────────────────────────────────────────────────
def blend(a, b, alpha):
    alpha = clamp(alpha)
    return tuple(int(a[i] + (b[i] - a[i]) * alpha) for i in range(3))


# ── Drawing helpers ───────────────────────────────────────────────────────────
def new_frame():
    img = Image.new("RGB", (W, H), BG_WARM)
    return img, ImageDraw.Draw(img)


def fill_gradient(img, top_col, bot_col):
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / H
        arr[y, :] = [int(top_col[c] + (bot_col[c] - top_col[c]) * t) for c in range(3)]
    img.paste(Image.fromarray(arr))


def glow_additive(img, cx, cy, r_max, color, strength=0.6):
    """Soft radial additive glow via numpy."""
    if r_max <= 0:
        return
    arr = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    dist     = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.5) ** 2)
    falloff  = np.clip(1 - dist / r_max, 0, 1) ** 2.5
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + color[c] * falloff * strength, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))


def text_cx(draw, text, fnt_obj, y, color, xcenter=W // 2):
    """Draw text horizontally centred at xcenter."""
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


# ── Pre-shaped Arabic strings (shaped once at module load) ────────────────────
# Scene 1
AR_WUJOOD_LOGO   = ar("وجود")
AR_WEB_AGENCY    = ar("وكالة ويب")

# Scene 2
AR_PHONE_HERO    = ar("موقعك في 48 ساعة")
AR_SVC_DESIGN    = ar("تصميم احترافي")
AR_SVC_FAST      = ar("سريع وآمن")
AR_SVC_SUPPORT   = ar("دعم دائم")
AR_BEAUTIFUL     = ar("جميل")
AR_FAST          = ar("سريع")
AR_AFFORDABLE    = ar("بأسعار معقولة")

# Scene 3
AR_ARABIC_HDR    = ar("العربية")
FEATURES_S3 = [
    ("Professional Design",  ar("تصميم احترافي")),
    ("Mobile Responsive",    ar("متوافق مع الجوال")),
    ("Fast Delivery · 48h",  ar("تسليم سريع · 48 ساعة")),
    ("SEO Optimised",        ar("محسّن لمحركات البحث")),
]

# Scene 4
AR_PRICING_HDR   = ar("أسعار شفافة")
STATS = [
    # (display_value, unit_suffix, english_label, arabic_label)
    ("48",   "h",    "Hours to Launch",  ar("ساعة للإطلاق")),
    ("2000", " QAR", "Full Website",     ar("موقع كامل")),
]

# Scene 5
AR_WUJOOD_CTA    = ar("وجود")
AR_HEADLINE_CTA  = ar("موقعك. جاهز خلال 48 ساعة.")
AR_WA_TEXT       = ar("تواصل معنا عبر واتساب")
AR_FINE_PRINT    = ar("بدون رسوم خفية · ملكية كاملة")


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 1 — Logo reveal + light rays  (0–6 s)
# ═══════════════════════════════════════════════════════════════════════════════
def scene1(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 2.0))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID,    0.7 * p_bg),
                  blend(BG_WARM, BURGUNDY,  0.4 * p_bg))

    gp = ease_out(prog(t, 0.0, 1.8))
    if gp > 0:
        glow_additive(img, cx, cy, int(700 * gp), ROSE, strength=0.55 * gp)
        glow_additive(img, cx, cy, int(350 * gp), SAND, strength=0.30 * gp)
    draw = ImageDraw.Draw(img)

    # Light rays
    ray_p = ease_out(prog(t, 0.15, 1.8))
    for i in range(32):
        angle  = (i / 32) * math.pi * 2
        length = int(860 * ray_p * (0.55 + 0.45 * math.sin(i * 2.1)))
        a_val  = 0.22 * ray_p * (0.45 + 0.55 * math.sin(i * 1.9 + t * 0.5))
        col    = blend(BG_MID, SAND if i % 2 == 0 else ROSE, a_val)
        draw.line([(cx, cy),
                   (cx + int(length * math.cos(angle)),
                    cy + int(length * math.sin(angle)))],
                  fill=col, width=max(1, 5 - i % 4))

    # Spinning dot ring
    dot_p = ease_out(prog(t, 0.7, 2.2))
    if dot_p > 0:
        for i in range(28):
            angle = (i / 28) * 2 * math.pi + t * 0.22
            rr    = 400 + 45 * math.sin(i * 1.4 + t * 0.6)
            dx    = cx + rr * math.cos(angle)
            dy    = cy + rr * math.sin(angle) * 0.32
            da    = dot_p * (0.5 + 0.45 * math.sin(i * 1.2 + t))
            dr    = 6 + 3 * math.sin(t * 1.4 + i)
            draw.ellipse([dx - dr, dy - dr, dx + dr, dy + dr],
                         fill=blend(BG_MID, ROSE if i % 3 != 0 else CLAY, da))

    # WUJOOD — letter-by-letter stagger
    logo_p = ease_out(prog(t, 0.5, 1.8))
    if logo_p > 0:
        letters = "WUJOOD"
        f_big   = fnt(F_BOLD, 138)
        lw      = 96
        x0_logo = cx - ((len(letters) - 1) * lw) // 2 - 30
        for idx, ch in enumerate(letters):
            lp = ease_out(prog(t, 0.5 + idx * 0.06, 1.8))
            draw.text((x0_logo + idx * lw + 4, cy - 82 + 4), ch,
                       font=f_big, fill=blend(BG, BURGUNDY, lp * 0.7))
            draw.text((x0_logo + idx * lw,     cy - 82),     ch,
                       font=f_big, fill=blend(BG_WARM, SAND, lp))

    # Arabic وجود  ← fix_arabic applied via AR_WUJOOD_LOGO
    ar_p = ease_out(prog(t, 1.2, 2.4))
    if ar_p > 0:
        text_cx(draw, AR_WUJOOD_LOGO, fnt(F_ARABIC, 64),
                cy + 82, blend(BG_MID, ROSE, ar_p))

    # Horizontal rule
    hr_p = ease_out(prog(t, 1.6, 2.4))
    if hr_p > 0:
        rl = int(460 * hr_p)
        draw.rectangle([cx - rl, cy + 158, cx + rl, cy + 162],
                       fill=blend(BG_MID, CLAY, hr_p))

    # Tagline  — fix_arabic applied to Arabic portion
    tag_p = ease_out(prog(t, 2.0, 3.0))
    if tag_p > 0:
        text_cx(draw,
                "Web Agency  ·  " + AR_WEB_AGENCY,
                fnt(F_REG, 30), cy + 174, blend(BG_MID, ROSE, tag_p))

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
        draw.rectangle([sx, sy, sx + sw, sy + 52],
                       fill=blend(BG_MID, BURGUNDY, s1 * 0.85))
        draw.text((sx + 14, sy + 14), "WUJOOD",
                  font=fnt(F_BOLD, 16), fill=blend(BG_MID, SAND, s1))
        for ni, nx in enumerate([sx + sw - 54, sx + sw - 36, sx + sw - 18]):
            draw.ellipse([nx, sy + 20, nx + 10, sy + 30],
                         fill=blend(BG_MID, ROSE, s1 * (0.6 + 0.4 * (ni == 0))))

    # Hero text  — fix_arabic applied via AR_PHONE_HERO
    s2 = ease_out(prog(p, 0.35, 0.66))
    if s2 > 0:
        draw.text((sx + 14, sy + 66),  "Your Website",
                  font=fnt(F_BOLD, 20), fill=blend(BG_MID, SAND, s2))
        draw.text((sx + 14, sy + 94),  "in 48 Hours",
                  font=fnt(F_BOLD, 20), fill=blend(BG_MID, ROSE, s2))
        draw.text((sx + 14, sy + 122), AR_PHONE_HERO,        # ← fix_arabic
                  font=fnt(F_ARABIC, 14), fill=blend(BG_MID, CLAY, s2))
        rrect(draw, sx + 14, sy + 148, sx + 134, sy + 176, r=10,
              fill=blend(BG_MID, BURGUNDY, s2),
              outline=blend(BG_MID, ROSE, s2), lw=1)
        draw.text((sx + 24, sy + 155), "Get Started",
                  font=fnt(F_BOLD, 12), fill=blend(BG_MID, SAND, s2))

    # Service cards  — fix_arabic applied via AR_SVC_* constants
    s3 = ease_out(prog(p, 0.60, 1.0))
    if s3 > 0:
        services = [AR_SVC_DESIGN, AR_SVC_FAST, AR_SVC_SUPPORT]  # ← fix_arabic
        for idx, svc in enumerate(services):
            yy  = sy + 192 + idx * 66
            sp  = ease_out(prog(p, 0.60 + idx * 0.09, 0.96 + idx * 0.04))
            if sp > 0:
                rrect(draw, sx + 10, yy, sx + sw - 10, yy + 54, r=10,
                      fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.2), sp * 0.8),
                      outline=blend(BG_MID, ROSE, sp * 0.6), lw=1)
                diamond(draw, sx + 30, yy + 27, 9, blend(BG_MID, ROSE, sp))
                draw.text((sx + 48, yy + 16), svc,
                          font=fnt(F_ARABIC, 13), fill=blend(BG_MID, SAND, sp))


def scene2(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 1.5))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID,   0.8 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.5 * p_bg))
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

    # Phone
    phone_p = ease_out(prog(t, 0, 1.2))
    x0, y0, x1, y1 = PH_X, PH_Y, PH_X + PH_W, PH_Y + PH_H
    if phone_p > 0:
        rrect(draw, x0, y0, x1, y1, r=38,
              fill=blend(BG_MID, BURGUNDY, phone_p * 0.9),
              outline=blend(BG_MID, ROSE, phone_p), lw=3)
        sx, sy_s = x0 + 14, y0 + 32
        sw_s, sh_s = PH_W - 28, PH_H - 58
        rrect(draw, sx, sy_s, sx + sw_s, sy_s + sh_s, r=10,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), 0.65))
        rrect(draw, cx - 37, y0 - 2, cx + 37, y0 + 22, r=8, fill=BG)
        draw.rounded_rectangle([cx - 38, y1 - 20, cx + 38, y1 - 10],
                                radius=4, fill=blend(BG_MID, SAND, phone_p * 0.6))
        if phone_p > 0.2:
            phone_screen_content(draw, sx, sy_s, sw_s, sh_s, min(1.0, phone_p * 3))

    # Left English labels
    lp = ease_out(prog(t, 1.0, 2.4))
    if lp > 0:
        lx = PH_X - 380
        for yi, (txt, col) in enumerate([("Beautiful.", SAND), ("Fast.", ROSE), ("Affordable.", CLAY)]):
            draw.text((lx, H // 2 - 80 + yi * 52), txt,
                      font=fnt(F_BOLD, 42), fill=blend(BG_MID, col, lp))
        draw.rectangle([lx, H // 2 + 90, lx + int(260 * lp), H // 2 + 94],
                       fill=blend(BG_MID, ROSE, lp))

    # Right Arabic labels — fix_arabic applied via AR_* constants
    rp = ease_out(prog(t, 1.8, 3.2))
    if rp > 0:
        rx = PH_X + PH_W + 46
        for yi, (ar_str, col, fsz) in enumerate([
            (AR_BEAUTIFUL,  SAND, 42),    # ← fix_arabic
            (AR_FAST,       ROSE, 42),    # ← fix_arabic
            (AR_AFFORDABLE, CLAY, 30),    # ← fix_arabic
        ]):
            draw.text((rx, H // 2 - 80 + yi * 52), ar_str,
                      font=fnt(F_ARABIC, fsz), fill=blend(BG_MID, col, rp))

    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 3 — Arabic + English side-by-side  (12–18 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
def scene3(t):
    img, draw = new_frame()
    cx = W // 2

    p_bg = ease_out(prog(t, 0, 1.4))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID,   0.9 * p_bg),
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

    # Column headers — fix_arabic applied via AR_ARABIC_HDR
    hdr_p = ease_out(prog(t, 0.6, 1.6))
    if hdr_p > 0:
        draw.text((cx - 480, 72), "English",
                  font=fnt(F_BOLD, 40), fill=blend(BG_MID, SAND, hdr_p))
        text_cx(draw, AR_ARABIC_HDR, fnt(F_ARABIC, 40), 72,   # ← fix_arabic
                blend(BG_MID, SAND, hdr_p), xcenter=cx + 260)
        rl = int(180 * hdr_p)
        draw.rectangle([cx - 480, 122, cx - 480 + rl, 126],
                       fill=blend(BG_MID, CLAY, hdr_p))
        draw.rectangle([cx + 150, 122, cx + 150 + rl, 126],
                       fill=blend(BG_MID, CLAY, hdr_p))

    # Feature rows — Arabic strings in FEATURES_S3 are all pre-shaped
    card_h  = 116
    start_y = 180
    for idx, (en_text, ar_text) in enumerate(FEATURES_S3):
        cp = ease_out(prog(t, 0.9 + idx * 0.55, 2.3 + idx * 0.55))
        if cp <= 0:
            continue
        y, y2 = start_y + idx * (card_h + 22), start_y + idx * (card_h + 22) + card_h

        # EN card
        rrect(draw, cx - 548, y, cx - 30, y2, r=14,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), cp * 0.80),
              outline=blend(BG_MID, ROSE, cp * 0.6), lw=2)
        diamond(draw, cx - 520, y + card_h // 2, 13, blend(BG_MID, ROSE, cp))
        draw.text((cx - 492, y + 20), en_text,
                  font=fnt(F_BOLD, 28), fill=blend(BG_MID, SAND, cp))

        # AR card — ar_text already fix_arabic'd via FEATURES_S3 definition
        rrect(draw, cx + 30, y, cx + 548, y2, r=14,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.12), cp * 0.80),
              outline=blend(BG_MID, ROSE, cp * 0.6), lw=2)
        ar_fnt  = fnt(F_ARABIC, 28)
        ar_bbox = draw.textbbox((0, 0), ar_text, font=ar_fnt)
        ar_w    = ar_bbox[2] - ar_bbox[0]
        draw.text((cx + 528 - ar_w, y + 20), ar_text,   # ← fix_arabic via constant
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
# 2 cards only: 48h + 2000 QAR
# ═══════════════════════════════════════════════════════════════════════════════
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
                  blend(BG_WARM, BG_MID,   0.9 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.55 * p_bg))
    gp = ease_out(prog(t, 0, 2.0))
    if gp > 0:
        glow_additive(img, cx, cy, 680, ROSE, strength=0.30 * gp)
        glow_additive(img, cx, cy, 380, CLAY, strength=0.18 * gp)
    draw = ImageDraw.Draw(img)

    # Heading — fix_arabic applied via AR_PRICING_HDR
    hdr_p = ease_out(prog(t, 0.2, 1.4))
    if hdr_p > 0:
        text_cx(draw, "Transparent Pricing",
                fnt(F_BOLD, 56), 72, blend(BG_MID, SAND, hdr_p))
        text_cx(draw, AR_PRICING_HDR,           # ← fix_arabic
                fnt(F_ARABIC, 44), 144, blend(BG_MID, ROSE, hdr_p * 0.95))
        rl = int(340 * hdr_p)
        draw.rectangle([cx - rl, 202, cx + rl, 206],
                       fill=blend(BG_MID, CLAY, hdr_p))

    # 2 large stat cards centred
    card_w, card_h = 620, 310
    gap             = 80
    total_w         = 2 * card_w + gap
    sx_base         = cx - total_w // 2

    for idx, (val, unit, en_label, ar_label) in enumerate(STATS):
        cp    = ease_out(prog(t, 0.8 + idx * 0.7, 2.2 + idx * 0.7))
        num_p = prog(t,  0.8 + idx * 0.7, 3.4 + idx * 0.5)
        if cp <= 0:
            continue

        cx_c = sx_base + idx * (card_w + gap) + card_w // 2
        cy_c = cy + 60

        rrect(draw, cx_c - card_w // 2, cy_c - card_h // 2,
              cx_c + card_w // 2, cy_c + card_h // 2, r=28,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.10), cp * 0.88),
              outline=blend(BG_MID, ROSE, cp), lw=2)

        # Top accent bar
        draw.rectangle([cx_c - card_w // 2 + 20,
                         cy_c - card_h // 2 + 14,
                         cx_c - card_w // 2 + 20 + int((card_w - 40) * cp),
                         cy_c - card_h // 2 + 22],
                       fill=blend(BG_MID, ROSE, cp))

        # Count-up number
        num_str = count_up(val, num_p)
        f_num   = fnt(F_BOLD, 110)
        f_unit  = fnt(F_BOLD,  36)
        num_bb  = draw.textbbox((0, 0), num_str, font=f_num)
        unt_bb  = draw.textbbox((0, 0), unit,    font=f_unit)
        combo_w = (num_bb[2] - num_bb[0]) + (unt_bb[2] - unt_bb[0]) + 8
        xn = cx_c - combo_w // 2
        draw.text((xn, cy_c - 78), num_str, font=f_num,
                  fill=blend(BG_MID, SAND, cp))
        draw.text((xn + num_bb[2] - num_bb[0] + 8, cy_c - 34), unit,
                  font=f_unit, fill=blend(BG_MID, ROSE, cp))

        # Labels — ar_label already fix_arabic'd
        text_cx(draw, en_label, fnt(F_BOLD, 24),
                cy_c + 52, blend(BG_MID, SAND, cp * 0.9), xcenter=cx_c)
        text_cx(draw, ar_label, fnt(F_ARABIC, 24),   # ← fix_arabic via STATS
                cy_c + 90, blend(BG_MID, CLAY, cp * 0.9), xcenter=cx_c)

        diamond(draw, cx_c, cy_c + card_h // 2 - 24, 10,
                blend(BG_MID, ROSE, cp))

    fi = ease_in_out(prog(t, 0, 0.28))
    if fi < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, fi)
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 5 — CTA + +974 7727 7292 + WhatsApp  (24–30 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
WA_NUMBER = "+974 7727 7292"

def scene5(t):
    img, draw = new_frame()
    cx, cy = W // 2, H // 2

    p_bg = ease_out(prog(t, 0, 1.8))
    fill_gradient(img,
                  blend(BG_WARM, BG_MID,   0.9 * p_bg),
                  blend(BG_WARM, BURGUNDY, 0.60 * p_bg))

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

    # Pulsing ellipse rings
    ring_p = ease_out(prog(t, 0.5, 2.0))
    for ri in range(5):
        rr  = int((240 + ri * 90) * ring_p)
        r_a = (0.18 - ri * 0.03) * ring_p * (0.55 + 0.45 * math.sin(t + ri))
        draw.ellipse([cx - rr, cy + 40 - int(rr * 0.42),
                      cx + rr, cy + 40 + int(rr * 0.42)],
                     outline=blend(BG_MID, ROSE, r_a), width=2)

    # WUJOOD + Arabic — fix_arabic via AR_WUJOOD_CTA
    logo_p = ease_out(prog(t, 0.2, 1.4))
    if logo_p > 0:
        text_cx(draw, "WUJOOD", fnt(F_BOLD, 70),
                cy - 292, blend(BG_MID, SAND, logo_p))
        text_cx(draw, AR_WUJOOD_CTA, fnt(F_ARABIC, 48),   # ← fix_arabic
                cy - 212, blend(BG_MID, ROSE, logo_p * 0.9))

    # Horizontal rule
    hr_p = ease_out(prog(t, 1.0, 1.8))
    if hr_p > 0:
        rl = int(440 * hr_p)
        draw.rectangle([cx - rl, cy - 150, cx + rl, cy - 146],
                       fill=blend(BG_MID, CLAY, hr_p))

    # Headline EN + AR — fix_arabic via AR_HEADLINE_CTA
    hl_p = ease_out(prog(t, 1.2, 2.2))
    if hl_p > 0:
        text_cx(draw, "Your website. Live in 48 hours.",
                fnt(F_BOLD, 46), cy - 126, blend(BG_MID, SAND, hl_p))
        text_cx(draw, AR_HEADLINE_CTA, fnt(F_ARABIC, 36),   # ← fix_arabic
                cy - 68, blend(BG_MID, ROSE, hl_p * 0.9))

    # URL pill — getwujood.com with pulsing glow border
    url_p = ease_out(prog(t, 1.8, 3.0))
    if url_p > 0:
        pw, ph = 700, 92
        px, py = cx - pw // 2, cy - 8
        for bw in range(10, 0, -3):
            ba = url_p * (0.55 + 0.35 * pulse1) * (1 - bw / 12)
            rrect(draw, px - bw, py - bw, px + pw + bw, py + ph + bw,
                  r=46 + bw, outline=blend(BG_MID, ROSE, ba), lw=1)
        rrect(draw, px, py, px + pw, py + ph, r=46,
              fill=blend(BG_MID, BURGUNDY, url_p * 0.95),
              outline=blend(BG_MID, ROSE, url_p), lw=3)
        text_cx(draw, "getwujood.com", fnt(F_BOLD, 48),
                py + 22, blend(BG_MID, SAND, url_p))

    # ── Phone number +974 7727 7292 — large, prominent, ROSE ──
    num_p = ease_out(prog(t, 2.4, 3.4))
    if num_p > 0:
        text_cx(draw, WA_NUMBER, fnt(F_BOLD, 58),
                cy + 108, blend(BG_MID, ROSE, num_p))

    # WhatsApp icon row — fix_arabic via AR_WA_TEXT
    wa_p = ease_out(prog(t, 3.0, 4.0))
    if wa_p > 0:
        # Green circle icon
        wix, wiy = cx - 230, cy + 186
        wr = 24
        draw.ellipse([wix - wr, wiy - wr, wix + wr, wiy + wr],
                     fill=blend(BG_MID, WA_GREEN, wa_p))
        draw.ellipse([wix - 10, wiy - 10, wix + 10, wiy + 10],
                     outline=blend(BG_MID, WHITE, wa_p), width=2)
        draw.text((wix + 38, wiy - 22), "WhatsApp",
                  font=fnt(F_BOLD, 28), fill=blend(BG_MID, SAND, wa_p))
        draw.text((wix + 38, wiy + 8), AR_WA_TEXT,   # ← fix_arabic
                  font=fnt(F_ARABIC, 22), fill=blend(BG_MID, ROSE, wa_p * 0.9))

    # Fine print — fix_arabic via AR_FINE_PRINT
    sp = ease_out(prog(t, 3.8, 4.8))
    if sp > 0:
        text_cx(draw,
                "No hidden fees  ·  Full ownership  ·  " + AR_FINE_PRINT,  # ← fix_arabic
                fnt(F_REG, 20), cy + 254, blend(BG_MID, CLAY, sp * 0.9))

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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    silent_path = os.path.join(base_dir, "wujood_demo_v2.mp4")
    final_path  = os.path.join(base_dir, "wujood_demo_final.mp4")
    music_path  = os.path.join(base_dir, "music.wav")

    print("Building Wujood Demo v2 (final) …")
    clips = [VideoClip(lambda t, fn=fn: fn(t), duration=dur).with_fps(FPS)
             for fn, dur in SCENES]
    total = sum(d for _, d in SCENES)
    print(f"  5 scenes | {total}s | {W}×{H} @ {FPS}fps")

    concatenate_videoclips(clips).write_videofile(
        silent_path, fps=FPS, codec="libx264", audio=False,
        preset="medium",
        ffmpeg_params=["-crf", "16", "-pix_fmt", "yuv420p"],
        logger="bar",
    )
    print(f"\n✓ Silent video → {silent_path}")

    # Mix music if available
    if os.path.exists(music_path):
        import subprocess
        dur_s = total
        cmd = [
            "ffmpeg", "-y",
            "-i", silent_path,
            "-i", music_path,
            "-filter_complex",
            f"[1:a]afade=t=in:d=1,afade=t=out:st={dur_s - 3}:d=3,volume=0.35[a]",
            "-map", "0:v", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac",
            "-shortest",
            final_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            import shutil; sz = os.path.getsize(final_path) // 1024
            print(f"✓ Final with music → {final_path}  ({sz} KB)")
        else:
            print("FFmpeg music mix failed:", result.stderr[-300:])
            shutil.copy(silent_path, final_path)
    else:
        print(f"No music found at {music_path} — skipping audio mix")
        import shutil; shutil.copy(silent_path, final_path)
