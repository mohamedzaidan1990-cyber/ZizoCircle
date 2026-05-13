#!/usr/bin/env python3
"""
Wujood Web Agency — 30-second Animated Demo Video
Desert Rose palette: #d4a5a5 | #5d2e46 | #e8d5c4 | #0e080c
Segments:
  0–4s   Logo animation
  4–12s  Phone mockup building screen-by-screen
 12–20s  Bilingual Arabic + English feature cards
 20–25s  WhatsApp button pulse
 25–30s  "Live in 48 Hours" title card
"""

import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display
from moviepy import VideoClip, concatenate_videoclips

# ── Palette ───────────────────────────────────────────────────────────────────
ROSE     = (212, 165, 165)
BURGUNDY = (93,  46,  70)
SAND     = (232, 213, 196)
DARK     = (14,  8,   12)

W, H = 1920, 1080
FPS  = 30

# ── Font paths ────────────────────────────────────────────────────────────────
FONT_BOLD    = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_REG     = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_ARABIC  = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"


# ── Helpers ───────────────────────────────────────────────────────────────────
def ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3

def ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def alpha_blend(base_col, over_col, alpha):
    return tuple(int(base_col[i] * (1 - alpha) + over_col[i] * alpha) for i in range(3))

def progress(t, start, end):
    """Normalised progress [0..1] for t in [start, end]."""
    return clamp((t - start) / max(end - start, 1e-6))

def ar(text: str) -> str:
    """Reshape + bidi-reorder Arabic text for PIL rendering."""
    return get_display(arabic_reshaper.reshape(text))

def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)

def center_text(draw, text, fnt, y, color, img_w=W):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = (img_w - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), text, font=fnt, fill=color)

def fade_color(base, target, alpha):
    return alpha_blend(base, target, clamp(alpha))

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                            outline=outline, width=width)


# ── Background helpers ────────────────────────────────────────────────────────
def dark_bg(img: Image.Image):
    img.paste(DARK, [0, 0, W, H])


def draw_particles(draw, t, count=25, radius_base=380, alpha_max=60):
    """Slow-drifting orbital dots for depth."""
    for i in range(count):
        angle  = (i / count) * 2 * math.pi + t * 0.18
        r      = radius_base + 60 * math.sin(t * 0.4 + i * 1.1)
        px     = W // 2 + r * math.cos(angle)
        py     = H // 2 + r * math.sin(angle) * 0.28
        a      = alpha_max * (0.4 + 0.6 * math.sin(t * 0.7 + i))
        col    = fade_color(DARK, BURGUNDY, a / 255)
        dot_r  = 3 + 2 * math.sin(t + i * 0.5)
        draw.ellipse([px - dot_r, py - dot_r, px + dot_r, py + dot_r], fill=col)


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT 1 — Logo animation  (0–4 s)
# ═══════════════════════════════════════════════════════════════════════════════
def seg1_logo(t: float) -> np.ndarray:
    img  = Image.new("RGB", (W, H), DARK)
    draw = ImageDraw.Draw(img)
    draw_particles(draw, t)

    # — glow ring behind logo —
    glow_alpha = clamp(t / 1.2) * 0.25
    for r in range(180, 220, 8):
        col = fade_color(DARK, BURGUNDY, glow_alpha * (1 - (r - 180) / 40))
        draw.ellipse([W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r],
                     outline=col, width=2)

    # — horizontal accent lines —
    line_p = ease_out(progress(t, 0.5, 1.4))
    line_len = int(220 * line_p)
    cy = H // 2 + 80
    draw.line([W // 2 - line_len, cy, W // 2 + line_len, cy], fill=ROSE, width=2)

    # — WUJOOD text —
    logo_p  = ease_out(progress(t, 0.0, 1.0))
    logo_sz = max(10, int(108 * (0.4 + 0.6 * logo_p)))
    f_logo  = font(FONT_BOLD, logo_sz)
    logo_col = fade_color(DARK, SAND, logo_p)
    center_text(draw, "WUJOOD", f_logo, H // 2 - 75, logo_col)

    # — Arabic وجود —
    ar_p    = ease_out(progress(t, 0.4, 1.5))
    if ar_p > 0:
        f_ar  = font(FONT_ARABIC, max(10, int(52 * ar_p)))
        ar_col = fade_color(DARK, ROSE, ar_p)
        center_text(draw, ar("وجود"), f_ar, H // 2 + 30, ar_col)

    # — tagline —
    tag_p = ease_out(progress(t, 1.2, 2.2))
    if tag_p > 0:
        f_tag  = font(FONT_REG, 28)
        tag_col = fade_color(DARK, ROSE, tag_p)
        center_text(draw, "Web Agency  •  " + ar("وكالة ويب"), f_tag, H // 2 + 110, tag_col)

    # — letter-spacing decorative dots —
    dot_p = ease_out(progress(t, 1.8, 2.8))
    for i, offset in enumerate([-260, -130, 0, 130, 260]):
        d_alpha = dot_p * (0.6 + 0.4 * math.sin(t * 2 + i))
        col = fade_color(DARK, BURGUNDY, d_alpha)
        draw.ellipse([W // 2 + offset - 5, cy + 18, W // 2 + offset + 5, cy + 28], fill=col)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT 2 — Phone mockup building screen-by-screen  (4–12 s)
# ═══════════════════════════════════════════════════════════════════════════════
PHONE_W, PHONE_H = 340, 600
PHONE_X = (W - PHONE_W) // 2
PHONE_Y = (H - PHONE_H) // 2

def draw_phone_frame(draw, p):
    """Draw the phone shell with animated draw-in (p = 0..1)."""
    x0, y0 = PHONE_X - 2, PHONE_Y - 2
    x1, y1 = PHONE_X + PHONE_W + 2, PHONE_Y + PHONE_H + 2
    # Outer shell
    col = fade_color(DARK, BURGUNDY, p)
    draw_rounded_rect(draw, [x0, y0, x1, y1], radius=32,
                      fill=col, outline=ROSE, width=3)
    # Notch
    notch_w = 80
    draw_rounded_rect(draw,
                      [W // 2 - notch_w // 2, PHONE_Y - 2,
                       W // 2 + notch_w // 2, PHONE_Y + 22],
                      radius=8, fill=DARK)
    # Home bar
    draw.rounded_rectangle(
        [W // 2 - 40, PHONE_Y + PHONE_H - 18,
         W // 2 + 40, PHONE_Y + PHONE_H - 8],
        radius=4, fill=SAND)


def draw_screen_content(draw, img, screen: int, p: float):
    """Draw website UI inside phone for the given screen number (1-3)."""
    sx, sy = PHONE_X + 12, PHONE_Y + 28   # screen origin
    sw, sh = PHONE_W - 24, PHONE_H - 55   # screen size

    # Screen background
    screen_img = Image.new("RGB", (sw, sh), (20, 12, 18))
    sdraw = ImageDraw.Draw(screen_img)

    if screen == 1:  # Header / hero section
        sdraw.rectangle([0, 0, sw, 56], fill=BURGUNDY)
        f = font(FONT_BOLD, 16)
        sdraw.text((14, 18), "WUJOOD", font=f, fill=SAND)
        # Nav dots
        for nx in [sw - 60, sw - 40, sw - 20]:
            sdraw.ellipse([nx, 22, nx + 8, 30], fill=ROSE)
        # Hero text
        f2 = font(FONT_BOLD, 20)
        sdraw.text((14, 75), "Your Digital", font=f2, fill=SAND)
        sdraw.text((14, 102), "Presence", font=f2, fill=ROSE)
        sdraw.text((14, 128), ar("حضورك الرقمي"), font=font(FONT_ARABIC, 16), fill=SAND)
        # CTA button
        btn_p = min(1.0, p * 2)
        btn_col = alpha_blend((20, 12, 18), BURGUNDY, btn_p)
        draw_rounded_rect(sdraw, [14, 165, 120, 193], radius=8, fill=btn_col, outline=ROSE, width=1)
        if btn_p > 0.5:
            sdraw.text((28, 172), "Get Started", font=font(FONT_BOLD, 12), fill=SAND)

    elif screen == 2:  # Services section
        sdraw.rectangle([0, 0, sw, 40], fill=BURGUNDY)
        sdraw.text((12, 12), "Services", font=font(FONT_BOLD, 14), fill=SAND)
        sdraw.text((sw - 80, 12), ar("خدماتنا"), font=font(FONT_ARABIC, 12), fill=ROSE)
        cards = [
            ("🌐 Web Design",   ar("تصميم مواقع")),
            ("📱 Mobile First", ar("متوافق مع الجوال")),
            ("⚡ 48h Delivery", ar("تسليم خلال 48 ساعة")),
        ]
        for idx, (en, ara) in enumerate(cards):
            yy = 55 + idx * 72
            card_p = clamp(p * 3 - idx * 0.3)
            if card_p > 0:
                cc = alpha_blend((20, 12, 18), (40, 22, 34), card_p)
                draw_rounded_rect(sdraw, [10, yy, sw - 10, yy + 60],
                                  radius=8, fill=cc, outline=BURGUNDY, width=1)
                sdraw.text((18, yy + 8),  en,  font=font(FONT_BOLD, 11), fill=SAND)
                sdraw.text((18, yy + 30), ara, font=font(FONT_ARABIC, 10), fill=ROSE)

    elif screen == 3:  # Portfolio / results
        sdraw.rectangle([0, 0, sw, 40], fill=BURGUNDY)
        sdraw.text((12, 12), "Results", font=font(FONT_BOLD, 14), fill=SAND)
        sdraw.text((sw - 70, 12), ar("نتائجنا"), font=font(FONT_ARABIC, 12), fill=ROSE)
        stats = [("150+", "Clients",   ar("عميل")),
                 ("48h",  "Delivery",  ar("تسليم")),
                 ("99%",  "Satisfied", ar("راضون"))]
        for idx, (num, en, ara) in enumerate(stats):
            xx = 14 + idx * 100
            stat_p = clamp(p * 3 - idx * 0.4)
            if stat_p > 0:
                sdraw.text((xx, 60),  num, font=font(FONT_BOLD, 26),
                           fill=alpha_blend((20, 12, 18), ROSE, stat_p))
                sdraw.text((xx, 94),  en,  font=font(FONT_REG, 10),  fill=SAND)
                sdraw.text((xx, 110), ara, font=font(FONT_ARABIC, 10), fill=ROSE)

    img.paste(screen_img, (sx, sy))


def seg2_phone(t: float) -> np.ndarray:
    img  = Image.new("RGB", (W, H), DARK)
    draw = ImageDraw.Draw(img)
    draw_particles(draw, t, count=15, radius_base=500, alpha_max=35)

    dur = 8.0  # segment duration

    # Phone frame draw-in
    frame_p = ease_out(progress(t, 0.0, 1.0))
    draw_phone_frame(draw, frame_p)

    # Screen 1: 1-3 s
    s1_p = ease_out(progress(t, 1.0, 3.5))
    if s1_p > 0:
        draw_screen_content(draw, img, 1, s1_p)

    # Screen 2 slides over: 3-5.5 s
    s2_p = ease_out(progress(t, 3.5, 5.5))
    if s2_p > 0:
        draw_screen_content(draw, img, 2, s2_p)

    # Screen 3: 5.5-7.5 s
    s3_p = ease_out(progress(t, 5.5, 7.5))
    if s3_p > 0:
        draw_screen_content(draw, img, 3, s3_p)

    # Side labels
    label_p = ease_out(progress(t, 1.5, 2.5))
    if label_p > 0:
        f_lbl = font(FONT_BOLD, 22)
        f_sub = font(FONT_REG, 16)
        lx = PHONE_X - 280
        col = fade_color(DARK, SAND, label_p)
        draw.text((lx, H // 2 - 60), "Responsive", font=f_lbl, fill=col)
        draw.text((lx, H // 2 - 30), "& Beautiful",  font=f_lbl, fill=fade_color(DARK, ROSE, label_p))
        draw.text((lx, H // 2 + 10), ar("جميل ومتجاوب"), font=font(FONT_ARABIC, 18),
                  fill=fade_color(DARK, ROSE, label_p * 0.8))

    rx = PHONE_X + PHONE_W + 30
    r_label_p = ease_out(progress(t, 3.8, 5.0))
    if r_label_p > 0:
        f_r = font(FONT_BOLD, 22)
        col_r = fade_color(DARK, SAND, r_label_p)
        draw.text((rx, H // 2 - 60), "Full Service", font=f_r, fill=col_r)
        draw.text((rx, H // 2 - 30), "Agency",       font=f_r, fill=fade_color(DARK, ROSE, r_label_p))
        draw.text((rx, H // 2 + 10), ar("وكالة متكاملة"), font=font(FONT_ARABIC, 18),
                  fill=fade_color(DARK, ROSE, r_label_p * 0.8))

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT 3 — Bilingual feature cards  (12–20 s)
# ═══════════════════════════════════════════════════════════════════════════════
FEATURES = [
    ("Modern Design",       ar("تصميم عصري"),         "✦"),
    ("Fast & Secure",       ar("سريع وآمن"),           "⚡"),
    ("SEO Optimised",       ar("محسّن لمحركات البحث"), "🔍"),
    ("Mobile Friendly",     ar("متوافق مع الجوال"),   "📱"),
]

def draw_feature_card(draw, img, idx: int, p: float, row: int, col: int):
    card_w, card_h = 420, 180
    margin_x = 100
    margin_y = 160
    x = margin_x + col * (card_w + 60)
    y = margin_y + row * (card_h + 40)

    # Card background
    alpha = clamp(p)
    bg = alpha_blend(DARK, (55, 28, 42), alpha)
    draw_rounded_rect(draw, [x, y, x + card_w, y + card_h],
                      radius=16, fill=bg, outline=fade_color(DARK, BURGUNDY, alpha), width=2)

    if p < 0.1:
        return

    en_text, ar_text, icon = FEATURES[idx]

    # Icon
    f_icon = font(FONT_BOLD, 36)
    draw.text((x + 22, y + 18), icon, font=f_icon, fill=fade_color(DARK, ROSE, p))

    # English
    draw.text((x + 22, y + 68), en_text, font=font(FONT_BOLD, 22),
              fill=fade_color(DARK, SAND, p))

    # Arabic
    draw.text((x + 22, y + 102), ar_text, font=font(FONT_ARABIC, 18),
              fill=fade_color(DARK, ROSE, p))

    # Accent bar
    bar_w = int((card_w - 44) * clamp(p * 1.5 - 0.3))
    draw.rectangle([x + 22, y + card_h - 22, x + 22 + bar_w, y + card_h - 14],
                   fill=fade_color(DARK, BURGUNDY, p))


def seg3_cards(t: float) -> np.ndarray:
    img  = Image.new("RGB", (W, H), DARK)
    draw = ImageDraw.Draw(img)
    draw_particles(draw, t, count=18, radius_base=520, alpha_max=30)

    # Section heading
    head_p = ease_out(progress(t, 0.0, 1.0))
    draw.text((100, 60), "What We Offer",
              font=font(FONT_BOLD, 48), fill=fade_color(DARK, SAND, head_p))
    draw.text((100, 120), ar("ما نقدمه"),
              font=font(FONT_ARABIC, 36), fill=fade_color(DARK, ROSE, head_p * 0.9))

    # Accent line
    line_p = ease_out(progress(t, 0.4, 1.2))
    draw.rectangle([100, 170, 100 + int(320 * line_p), 174], fill=ROSE)

    # Cards: staggered appearance
    stagger = 0.6
    positions = [(0, 0), (0, 1), (1, 0), (1, 1)]
    for idx, (row, col) in enumerate(positions):
        card_start = 0.8 + idx * stagger
        card_p = ease_out(progress(t, card_start, card_start + 1.4))
        draw_feature_card(draw, img, idx, card_p, row, col)

    # Slide-in counter pill
    pill_p = ease_out(progress(t, 5.5, 7.0))
    if pill_p > 0:
        pill_x, pill_y = W - 480, H - 120
        draw_rounded_rect(draw,
                          [pill_x, pill_y, pill_x + 360, pill_y + 64],
                          radius=32, fill=fade_color(DARK, BURGUNDY, pill_p), outline=ROSE, width=2)
        draw.text((pill_x + 28, pill_y + 14),
                  "150+ Happy Clients  |  " + ar("عميل سعيد"),
                  font=font(FONT_BOLD, 18),
                  fill=fade_color(DARK, SAND, pill_p))

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT 4 — WhatsApp button pulse  (20–25 s)
# ═══════════════════════════════════════════════════════════════════════════════
WA_GREEN   = (37, 211, 102)
WA_GREEN_D = (18, 140, 60)

def draw_whatsapp_icon(draw, cx, cy, r, alpha):
    """Draw a recognisable WhatsApp-style icon."""
    col = alpha_blend(DARK, WA_GREEN, alpha)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    # Speech bubble tail
    tc = alpha_blend(DARK, WA_GREEN_D, alpha * 0.6)
    draw.polygon([(cx + r - 8, cy + r - 4),
                  (cx + r + 10, cy + r + 14),
                  (cx + r - 18, cy + r - 2)], fill=tc)
    # Phone handset (simplified)
    hc = alpha_blend(DARK, (255, 255, 255), alpha)
    pr = int(r * 0.38)
    draw.ellipse([cx - pr, cy - pr, cx + pr, cy + pr], outline=hc, width=max(1, r // 8))


def seg4_whatsapp(t: float) -> np.ndarray:
    img  = Image.new("RGB", (W, H), DARK)
    draw = ImageDraw.Draw(img)
    draw_particles(draw, t, count=12, radius_base=450, alpha_max=25)

    appear_p = ease_out(progress(t, 0.0, 1.2))

    # Background card
    card_w, card_h = 740, 380
    cx_card = (W - card_w) // 2
    cy_card = (H - card_h) // 2
    draw_rounded_rect(draw,
                      [cx_card, cy_card, cx_card + card_w, cy_card + card_h],
                      radius=28,
                      fill=alpha_blend(DARK, (40, 24, 34), appear_p),
                      outline=fade_color(DARK, BURGUNDY, appear_p),
                      width=2)

    # Heading
    draw.text((cx_card + 40, cy_card + 36),
              "Ready to Start?",
              font=font(FONT_BOLD, 40),
              fill=fade_color(DARK, SAND, appear_p))
    draw.text((cx_card + 40, cy_card + 88),
              ar("جاهز للبدء؟"),
              font=font(FONT_ARABIC, 30),
              fill=fade_color(DARK, ROSE, appear_p * 0.9))

    # Accent line
    draw.rectangle([cx_card + 40, cy_card + 132,
                    cx_card + 40 + int(300 * appear_p), cy_card + 136],
                   fill=ROSE)

    # Pulsing WhatsApp button
    btn_w, btn_h = 320, 68
    bx = W // 2 - btn_w // 2
    by = cy_card + card_h - 120

    # Outer pulse rings
    pulse_t   = (t * 1.5) % 1.0
    pulse_t2  = ((t * 1.5) + 0.4) % 1.0
    for pt, po in [(pulse_t, 0.6), (pulse_t2, 0.4)]:
        ring_r  = int((btn_w // 2 + 20) + 40 * pt)
        ring_a  = clamp((1 - pt) * po * appear_p)
        ring_col = alpha_blend(DARK, WA_GREEN, ring_a)
        draw.ellipse([W // 2 - ring_r, by + btn_h // 2 - ring_r,
                      W // 2 + ring_r, by + btn_h // 2 + ring_r],
                     outline=ring_col, width=2)

    # Button body
    draw_rounded_rect(draw, [bx, by, bx + btn_w, by + btn_h],
                      radius=34,
                      fill=alpha_blend(DARK, WA_GREEN, appear_p),
                      outline=alpha_blend(DARK, WA_GREEN_D, appear_p),
                      width=2)

    # WhatsApp icon inside button
    icon_cx = bx + 46
    icon_cy = by + btn_h // 2
    draw_whatsapp_icon(draw, icon_cx, icon_cy, 20, appear_p)

    # Button text
    btn_text = "WhatsApp Us"
    bt_col = fade_color(DARK, (255, 255, 255), appear_p)
    draw.text((bx + 82, by + 18), btn_text, font=font(FONT_BOLD, 22), fill=bt_col)

    # Sub-text
    sub_p = ease_out(progress(t, 1.4, 2.4))
    draw.text((cx_card + 40, cy_card + 164),
              ar("تواصل معنا الآن عبر واتساب"),
              font=font(FONT_ARABIC, 20),
              fill=fade_color(DARK, ROSE, sub_p))
    draw.text((cx_card + 40, cy_card + 196),
              "Chat with us now on WhatsApp",
              font=font(FONT_REG, 18),
              fill=fade_color(DARK, SAND, sub_p))

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SEGMENT 5 — "Live in 48 Hours" title card  (25–30 s)
# ═══════════════════════════════════════════════════════════════════════════════
def seg5_title(t: float) -> np.ndarray:
    img  = Image.new("RGB", (W, H), DARK)
    draw = ImageDraw.Draw(img)
    dur  = 5.0

    # Starburst / radial lines emanating from centre
    burst_p = ease_out(progress(t, 0.0, 1.5))
    for i in range(24):
        angle = (i / 24) * 2 * math.pi
        length = int(500 * burst_p)
        x1 = W // 2 + int(60 * math.cos(angle))
        y1 = H // 2 + int(60 * math.sin(angle))
        x2 = W // 2 + int(length * math.cos(angle))
        y2 = H // 2 + int(length * math.sin(angle))
        line_alpha = burst_p * (0.15 + 0.1 * math.sin(i * 1.3))
        draw.line([x1, y1, x2, y2],
                  fill=alpha_blend(DARK, BURGUNDY, line_alpha), width=1)

    draw_particles(draw, t, count=20, radius_base=400, alpha_max=40)

    # — "48" large number —
    num_p  = ease_out(progress(t, 0.2, 1.1))
    num_sz = max(10, int(220 * num_p))
    f_num  = font(FONT_BOLD, num_sz)
    num_col = fade_color(DARK, BURGUNDY, num_p * 0.6)
    bbox = draw.textbbox((0, 0), "48", font=f_num)
    draw.text((W // 2 - (bbox[2] - bbox[0]) // 2,
               H // 2 - (bbox[3] - bbox[1]) // 2 - 20), "48",
              font=f_num, fill=num_col)

    # — "LIVE IN" —
    live_p = ease_out(progress(t, 0.6, 1.6))
    draw.text((W // 2 - 160, H // 2 - 160),
              "LIVE IN",
              font=font(FONT_BOLD, 52),
              fill=fade_color(DARK, SAND, live_p))

    # — "HOURS" —
    hours_p = ease_out(progress(t, 0.9, 1.9))
    draw.text((W // 2 - 78, H // 2 + 110),
              "HOURS",
              font=font(FONT_BOLD, 52),
              fill=fade_color(DARK, SAND, hours_p))

    # Arabic translation
    ar_p = ease_out(progress(t, 1.3, 2.3))
    ar_text = ar("جاهز خلال 48 ساعة")
    bbox2 = draw.textbbox((0, 0), ar_text, font=font(FONT_ARABIC, 38))
    center_text(draw, ar_text, font(FONT_ARABIC, 38),
                H // 2 + 178, fade_color(DARK, ROSE, ar_p))

    # Accent line
    line_p2 = ease_out(progress(t, 1.6, 2.4))
    ll = int(400 * line_p2)
    draw.rectangle([W // 2 - ll // 2, H // 2 + 164,
                    W // 2 + ll // 2, H // 2 + 168], fill=ROSE)

    # — Wujood logo —
    logo_p = ease_out(progress(t, 2.0, 3.0))
    center_text(draw, "WUJOOD", font(FONT_BOLD, 42),
                H // 2 + 240, fade_color(DARK, SAND, logo_p))

    # — CTA —
    cta_p = ease_out(progress(t, 2.6, 3.8))
    cta_text = "wujood.agency  |  " + ar("ابدأ مشروعك اليوم")
    center_text(draw, cta_text, font(FONT_REG, 22),
                H // 2 + 298, fade_color(DARK, ROSE, cta_p))

    # Fade to black in last 0.6 s
    fade_out_p = progress(t, dur - 0.7, dur)
    if fade_out_p > 0:
        overlay = Image.new("RGB", (W, H), DARK)
        img = Image.blend(img, overlay, ease_in_out(fade_out_p))

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# Assemble & render
# ═══════════════════════════════════════════════════════════════════════════════
SEGMENTS = [
    (seg1_logo,     4.0),
    (seg2_phone,    8.0),
    (seg3_cards,    8.0),
    (seg4_whatsapp, 5.0),
    (seg5_title,    5.0),
]

def build_clip(fn, dur):
    return VideoClip(lambda t: fn(t), duration=dur).with_fps(FPS)

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "wujood_demo.mp4")

    print("Building Wujood demo video …")
    clips = [build_clip(fn, dur) for fn, dur in SEGMENTS]

    total = sum(d for _, d in SEGMENTS)
    print(f"  Segments: {len(clips)}  |  Total duration: {total}s")

    final = concatenate_videoclips(clips)
    print(f"  Rendering {W}×{H} @ {FPS}fps → {out_path}")
    final.write_videofile(
        out_path,
        fps=FPS,
        codec="libx264",
        audio=False,
        preset="medium",
        ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
        logger="bar",
    )
    print(f"\n✓ Done → {out_path}")
