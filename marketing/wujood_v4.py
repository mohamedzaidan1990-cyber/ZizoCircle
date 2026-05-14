#!/usr/bin/env python3
"""
Wujood v4 — patched: real cv2 phone flip, upward hologram, rich website cards.
Scenes 3-5 unchanged from v3 hologram build.
"""

import cv2
import math, os, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip, concatenate_videoclips

# ── Constants ────────────────────────────────────────────────────────────────
W, H   = 1920, 1080
FPS    = 30
OUTDIR = os.path.join(os.path.dirname(__file__), "wujood-hologram")
OUT    = os.path.join(OUTDIR, "wujood_v4.mp4")
MUSIC  = os.path.join(OUTDIR, "music_v4.wav")

# Palette
ROSE     = (212, 165, 165)
CLAY     = (184, 125, 109)
SAND     = (232, 213, 196)
BURGUNDY = (93,  46,  70)
BG       = (8,   4,   10)
BG_WARM  = (22,  10,  30)
BG_MID   = (42,  18,  55)
CYAN     = (100, 220, 230)
WHITE    = (255, 255, 255)

# Font paths
FONT_DIR = "/usr/share/fonts/truetype"
def _find(candidates):
    for p in candidates:
        if os.path.exists(p): return p
    return None

FB = _find([f"{FONT_DIR}/liberation/LiberationSans-Bold.ttf",
            f"{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"])
FM = _find([f"{FONT_DIR}/liberation/LiberationSans-Regular.ttf",
            f"{FONT_DIR}/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf"])

def fnt(path, size): return ImageFont.truetype(path, size)

# ── Easing ───────────────────────────────────────────────────────────────────
def ease_out(p, exp=2): return 1 - (1 - min(p, 1)) ** exp
def ease_in(p, exp=2):  return min(p, 1) ** exp
def ease_in_out(p, exp=2):
    p = min(p, 1)
    return (2 * p) ** exp / 2 if p < 0.5 else 1 - ((-2 * p + 2) ** exp) / 2

# ── Helpers ──────────────────────────────────────────────────────────────────
def new_frame(bg=BG):
    return Image.new("RGB", (W, H), bg)

def fill_gradient(img, top_col, bot_col):
    arr = np.array(img, dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = np.linspace(top_col[c], bot_col[c], H)[:, None]
    img.paste(Image.fromarray(arr.astype(np.uint8)))

def glow(img, cx, cy, radius, color, strength=0.55):
    arr = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[:H, :W]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip(1 - d / radius, 0, 1) ** 2 * strength
    for c, v in enumerate(color):
        arr[:, :, c] = np.clip(arr[:, :, c] + a * v, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))

def glow_on_arr(arr, cx, cy, radius, color, strength=0.55):
    yy, xx = np.mgrid[: arr.shape[0], : arr.shape[1]]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip(1 - d / radius, 0, 1) ** 2 * strength
    for c, v in enumerate(color):
        arr[:, :, c] = np.clip(arr[:, :, c] + a * v, 0, 255)

def centered_text(draw, y, text, font, color, img_w=W):
    bb = draw.textbbox((0, 0), text, font=font)
    x  = (img_w - (bb[2] - bb[0])) // 2
    draw.text((x, y), text, font=font, fill=color)
    return bb[3] - bb[1]

# ── Particle system ───────────────────────────────────────────────────────────
def _compute_wujood_particles(n=600):
    tw, th = 1200, 260
    tmp = Image.new("L", (tw, th), 0)
    td  = ImageDraw.Draw(tmp)
    f   = fnt(FB, 200)
    bb  = td.textbbox((0, 0), "WUJOOD", font=f)
    tx  = (tw - (bb[2] - bb[0])) // 2
    ty  = (th - (bb[3] - bb[1])) // 2 - bb[1]
    td.text((tx, ty), "WUJOOD", font=f, fill=255)
    arr = np.array(tmp)
    ys, xs = np.where(arr > 80)
    if len(xs) > n:
        idx = np.random.choice(len(xs), n, replace=False)
        xs, ys = xs[idx], ys[idx]
    scale = W * 0.68 / tw
    ox    = (W - tw * scale) / 2
    oy    = H * 0.42
    ptx   = (xs * scale + ox).astype(int)
    pty   = (ys * scale + oy).astype(int)
    rng   = np.random.RandomState(7)
    psx   = rng.randint(0, W, len(ptx))
    psy   = rng.randint(0, H, len(pty))
    return ptx, pty, psx, psy

PTX, PTY, PSX, PSY = _compute_wujood_particles(600)

def draw_particles(img, progress, colors=None):
    arr = np.array(img)
    p   = ease_out(progress, 2.5)
    cx  = (PSX + (PTX - PSX) * p).astype(int)
    cy  = (PSY + (PTY - PSY) * p).astype(int)
    mask = (cx >= 0) & (cx < W) & (cy >= 0) & (cy < H)
    cx, cy = cx[mask], cy[mask]
    alpha  = min(progress * 3, 1)
    if colors is None:
        colors = [ROSE, SAND, CLAY]
    for i, (x, y) in enumerate(zip(cx, cy)):
        col = colors[i % len(colors)]
        arr[y, x] = np.clip(np.array(arr[y, x], float) + np.array(col) * alpha * 0.9, 0, 255)
        if x + 1 < W: arr[y, x+1] = np.clip(np.array(arr[y, x+1], float) + np.array(col) * alpha * 0.4, 0, 255)
        if y + 1 < H: arr[y+1, x] = np.clip(np.array(arr[y+1, x], float) + np.array(col) * alpha * 0.4, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))

# ── Phone rendering ───────────────────────────────────────────────────────────
PHONE_W = 320
PHONE_H = 640
PHONE_R = 36

def _draw_phone_front():
    img = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, PHONE_W-1, PHONE_H-1], radius=PHONE_R,
                         fill=(30, 18, 40), outline=ROSE, width=3)
    d.rounded_rectangle([PHONE_W//2-40, 4, PHONE_W//2+40, 22], radius=8, fill=(20, 10, 28))
    sx, sy = 14, 36
    sw, sh = PHONE_W - 28, PHONE_H - 80
    d.rectangle([sx, sy, sx+sw, sy+sh], fill=(18, 10, 28))
    # WUJOOD on screen
    sf = fnt(FB, 28)
    sbb = d.textbbox((0, 0), "WUJOOD", font=sf)
    d.text(((PHONE_W-(sbb[2]-sbb[0]))//2, sy+sh//2-20), "WUJOOD", font=sf, fill=ROSE)
    d.rounded_rectangle([PHONE_W//2-50, PHONE_H-28, PHONE_W//2+50, PHONE_H-18],
                         radius=4, fill=ROSE)
    return img

def _draw_phone_back():
    """Phone back face — camera bump + WUJOOD logo, darker body."""
    img = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, PHONE_W-1, PHONE_H-1], radius=PHONE_R,
                         fill=(18, 8, 28), outline=ROSE, width=3)
    # Camera module (top center)
    cam_cx, cam_cy = PHONE_W // 2, 55
    d.ellipse([cam_cx-22, cam_cy-22, cam_cx+22, cam_cy+22], fill=(10, 5, 18), outline=(80, 60, 90), width=2)
    d.ellipse([cam_cx-14, cam_cy-14, cam_cx+14, cam_cy+14], fill=(5, 3, 12), outline=CYAN, width=1)
    # Lens shine
    d.ellipse([cam_cx-6, cam_cy-10, cam_cx-2, cam_cy-6], fill=(180, 200, 220))
    # Flash dot
    d.ellipse([cam_cx+16, cam_cy-10, cam_cx+24, cam_cy-2], fill=(220, 200, 140))
    # Rose accent lines
    d.rectangle([PHONE_W//2-60, PHONE_H//2-2, PHONE_W//2+60, PHONE_H//2+2], fill=(*ROSE, 120))
    # WUJOOD branding
    bf = fnt(FB, 26)
    bbb = d.textbbox((0, 0), "WUJOOD", font=bf)
    bx  = (PHONE_W - (bbb[2]-bbb[0])) // 2
    d.text((bx, PHONE_H//2+20), "WUJOOD", font=bf, fill=(*ROSE, 200))
    return img

PHONE_FRONT = _draw_phone_front()
PHONE_BACK  = _draw_phone_back()

# Camera position on phone back (center of camera lens in phone back coords)
CAMERA_Y_ON_PHONE = 55  # y offset from phone top

def _cv2_warp_phone_on_canvas(phone_rgba, h_scale, canvas_cx, canvas_cy,
                               perspective_lean=0.0):
    """
    Warp PHONE_W×PHONE_H phone face onto the canvas with height squished by h_scale.
    h_scale=1 → full height; h_scale=0 → edge (nothing); negative → not called.
    perspective_lean: positive=top tilts right, negative=top tilts left (slight 3D depth).
    Returns RGBA numpy array (H×W×4) with phone placed.
    """
    pw, ph = PHONE_W, PHONE_H
    ph_scaled = max(int(ph * h_scale), 2)
    tw  = int(pw + abs(perspective_lean) * 2)  # canvas tile size
    # Perspective tilt: top of phone is shifted by lean amount
    tilt = int(perspective_lean)
    src = np.float32([[0, 0], [pw, 0], [pw, ph], [0, ph]])
    dst = np.float32([
        [tilt, 0],
        [pw - tilt, 0],
        [pw, ph_scaled],
        [0,  ph_scaled],
    ])
    M   = cv2.getPerspectiveTransform(src, dst)
    phone_cv2 = np.array(phone_rgba)   # PHONE_W×PHONE_H×4
    warped = cv2.warpPerspective(phone_cv2, M, (pw, ph_scaled),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=(0, 0, 0, 0))
    # Place on canvas
    canvas = np.zeros((H, W, 4), dtype=np.uint8)
    px = canvas_cx - pw // 2
    py = canvas_cy - ph_scaled // 2
    # Clip to canvas bounds
    x0, y0 = max(px, 0), max(py, 0)
    x1 = min(px + pw, W)
    y1 = min(py + ph_scaled, H)
    wx0, wy0 = x0 - px, y0 - py
    wx1, wy1 = wx0 + (x1 - x0), wy0 + (y1 - y0)
    if x1 > x0 and y1 > y0:
        canvas[y0:y1, x0:x1] = warped[wy0:wy1, wx0:wx1]
    return canvas   # H×W×4 RGBA

def _composite_rgba(base_img, rgba_arr):
    """Alpha-composite RGBA numpy array over PIL RGB image."""
    base = np.array(base_img, dtype=np.float32)
    a    = rgba_arr[:, :, 3:4].astype(np.float32) / 255.0
    rgb  = rgba_arr[:, :, :3].astype(np.float32)
    out  = base * (1 - a) + rgb * a
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))

# ── Scene 1: Phone Flip (0-4s) ───────────────────────────────────────────────
S1_DUR = 4.0
FLIP_START = 1.8   # when flip begins (s)
FLIP_MID   = 2.3   # mid-flip — height=0, ROSE flare (s)
FLIP_END   = 3.2   # back face fully visible (s)

def scene1_frame(t):
    img = new_frame(BG)
    fill_gradient(img, BG, BG_WARM)
    glow(img, W//2, H//2, 600, ROSE, 0.15)

    cx, cy = W // 2, H // 2

    if t < FLIP_START:
        # ── Phase 1: slide in from right with motion blur ──────────────────
        p     = ease_out(t / FLIP_START)
        # Slide distance
        n_sub = 8
        result = new_frame(BG)
        fill_gradient(result, BG, BG_WARM)
        glow(result, W//2, H//2, 600, ROSE, 0.15)
        # Stack sub-frames back to front
        for k in range(n_sub):
            sub_t  = max(t - (n_sub - 1 - k) * (FLIP_START * 0.012), 0)
            sub_p  = ease_out(sub_t / FLIP_START)
            slide  = int(W * 0.82 * (1 - sub_p))
            alpha  = (k + 1) / n_sub * 255
            layer  = new_frame(BG)
            fill_gradient(layer, BG, BG_WARM)
            glow(layer, W//2, H//2, 600, ROSE, 0.15)
            phone_arr = _cv2_warp_phone_on_canvas(PHONE_FRONT, 1.0,
                                                   cx + slide, cy, 0)
            layer = _composite_rgba(layer, phone_arr)
            result = Image.blend(result, layer, 1 / (n_sub - k))
        img = result

    elif t < FLIP_END:
        # ── Phase 2: actual 3D flip ────────────────────────────────────────
        if t < FLIP_MID:
            # Front face squishing to 0
            flip_p = (t - FLIP_START) / (FLIP_MID - FLIP_START)  # 0→1
            angle  = flip_p * math.pi / 2           # 0 → π/2
        else:
            # Back face expanding from 0
            flip_p = (t - FLIP_MID) / (FLIP_END - FLIP_MID)      # 0→1
            angle  = math.pi / 2 + flip_p * math.pi / 2  # π/2 → π

        h_scale = abs(math.cos(angle))  # 1→0 (front) / 0→1 (back)
        front_face = angle < math.pi / 2

        # Slight perspective lean increases toward mid-flip
        lean = int(20 * (1 - h_scale))  # max tilt at edge
        face = PHONE_FRONT if front_face else PHONE_BACK

        if h_scale > 0.02:
            phone_arr = _cv2_warp_phone_on_canvas(face, h_scale, cx, cy, lean)
            img = _composite_rgba(img, phone_arr)

        # ── ROSE LENS FLARE at mid-flip (height ≈ 0) ──────────────────────
        if h_scale < 0.25:
            flare_str = (0.25 - h_scale) / 0.25   # 0→1 as h_scale→0
            # White core
            glow(img, cx, cy, 60,  WHITE, flare_str * 1.1)
            # Rose rings
            glow(img, cx, cy, 200, ROSE,  flare_str * 0.9)
            glow(img, cx, cy, 500, ROSE,  flare_str * 0.45)
            glow(img, cx, cy, 900, ROSE,  flare_str * 0.20)
            # Horizontal streak
            arr = np.array(img, dtype=np.float32)
            streak_y  = cy
            streak_hw = int(W * 0.4 * flare_str)
            if streak_hw > 0:
                xs = np.arange(W)
                dx = np.abs(xs - cx)
                falloff = np.clip(1 - dx / streak_hw, 0, 1) ** 1.5
                for c, v in enumerate((*ROSE[:2], 255)):
                    arr[streak_y - 2:streak_y + 3, :, c] = np.clip(
                        arr[streak_y - 2:streak_y + 3, :, c] + falloff * v * flare_str * 0.8, 0, 255)
            img = Image.fromarray(arr.astype(np.uint8))

    else:
        # ── Phase 3: back face holds, hologram glow begins ────────────────
        phone_arr = _cv2_warp_phone_on_canvas(PHONE_BACK, 1.0, cx, cy, 0)
        img = _composite_rgba(img, phone_arr)
        # Early hologram camera glow
        cam_x = cx
        cam_y = cy - PHONE_H // 2 + CAMERA_Y_ON_PHONE
        build_p = (t - FLIP_END) / (S1_DUR - FLIP_END)
        glow(img, cam_x, cam_y, 80, CYAN, ease_out(build_p) * 0.7)
        glow(img, cam_x, cam_y, 200, ROSE, ease_out(build_p) * 0.3)

    return np.array(img)


# ── Website Cards (400×600) ───────────────────────────────────────────────────
CW, CH = 400, 600

CARD_SPECS = [
    {
        "title":    "Al Nakheel Restaurant",
        "subtitle": "Authentic Gulf Cuisine",
        "hero_top":  (180,  90,  30),
        "hero_bot":  (120,  50,  10),
        "rows":     ["Grilled Hammour", "Lamb Ouzi", "Seafood Maqbous"],
        "prices":   ["85 QAR", "120 QAR", "95 QAR"],
    },
    {
        "title":    "Glow Beauty Studio",
        "subtitle": "Premium Salon Services",
        "hero_top":  (180,  80, 120),
        "hero_bot":  (100,  30,  80),
        "rows":     ["Bridal Packages", "Hair & Color", "Nail Art"],
        "prices":   ["800 QAR", "250 QAR", "120 QAR"],
    },
    {
        "title":    "Elite Auto Services",
        "subtitle": "Premium Car Care",
        "hero_top":  (25,  60, 120),
        "hero_bot":  (10,  25,  60),
        "rows":     ["Full Detailing", "Engine Service", "Window Tint"],
        "prices":   ["350 QAR", "200 QAR", "180 QAR"],
    },
]

def _make_card(spec):
    """Draw a 400×600 premium website mockup card (PIL RGBA)."""
    img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    # Drop shadow (done as a blurred rectangle behind the card)
    shadow = Image.new("RGBA", (CW + 20, CH + 20), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([6, 6, CW + 14, CH + 14], radius=20, fill=(0, 0, 0, 160))
    shadow = shadow.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(8))
    img.paste(shadow, (-10, -10), shadow)

    # Card body
    d.rounded_rectangle([0, 0, CW - 1, CH - 1], radius=14,
                         fill=(12, 6, 20, 245), outline=(*ROSE, 120), width=2)

    # Header bar (60px)
    HEADER_H = 60
    d.rectangle([2, 2, CW - 2, HEADER_H], fill=(22, 8, 36, 255))
    # Traffic lights
    for i, col in enumerate([(220, 80, 80), (220, 180, 60), (80, 200, 80)]):
        d.ellipse([14 + i * 22, 20, 14 + i * 22 + 12, 32], fill=col)
    # WUJOOD brand
    hf = fnt(FB, 16)
    d.text((80, 18), "WUJOOD", font=hf, fill=(*ROSE, 230))
    # Nav items
    nf = fnt(FM, 12)
    for i, nav in enumerate(["Home", "Services", "Gallery", "Contact"]):
        d.text((CW - 220 + i * 56, 22), nav, font=nf, fill=(*SAND, 200))

    # Hero section (190px gradient)
    HERO_T = HEADER_H + 2
    HERO_B = HERO_T + 190
    hero = Image.new("RGBA", (CW - 4, 190), (0, 0, 0, 0))
    hero_arr = np.array(hero, dtype=np.float32)
    for c in range(3):
        hero_arr[:, :, c] = np.linspace(spec["hero_top"][c], spec["hero_bot"][c], 190)[:, None]
    hero_arr[:, :, 3] = 255
    hero = Image.fromarray(hero_arr.astype(np.uint8))
    img.paste(hero, (2, HERO_T))
    # Subtle hero overlay pattern
    hd = ImageDraw.Draw(img)
    for yi in range(HERO_T, HERO_B, 6):
        hd.line([(2, yi), (CW - 2, yi)], fill=(255, 255, 255, 12), width=1)
    # Hero headline
    title_f = fnt(FB, 28)
    # Wrap title at ~22 chars
    title = spec["title"]
    if len(title) > 18:
        parts = title.rsplit(" ", 1)
        lines = [parts[0], parts[1]] if len(parts) == 2 else [title]
    else:
        lines = [title]
    for li, line in enumerate(lines):
        hd.text((14, HERO_T + 24 + li * 34), line, font=title_f, fill=(*WHITE, 240))
    sub_f = fnt(FM, 16)
    hd.text((14, HERO_T + 100), spec["subtitle"], font=sub_f, fill=(*SAND, 200))
    # Star rating
    for si in range(5):
        hd.text((14 + si * 22, HERO_T + 128), "★", font=fnt(FM, 18), fill=(255, 210, 60, 220))
    hd.text((130, HERO_T + 130), "4.9 (238 reviews)", font=fnt(FM, 14), fill=(*SAND, 180))

    # Divider
    DIVIDER_Y = HERO_B + 2
    hd.line([(2, DIVIDER_Y), (CW - 2, DIVIDER_Y)], fill=(*ROSE, 60), width=1)

    # Content rows (3 service rows with price)
    ROW_START = DIVIDER_Y + 10
    rf  = fnt(FM, 15)
    pf  = fnt(FB, 15)
    for ri, (row, price) in enumerate(zip(spec["rows"], spec["prices"])):
        ry = ROW_START + ri * 52
        # Row background
        hd.rounded_rectangle([8, ry, CW - 8, ry + 42], radius=6,
                               fill=(22, 10, 36, 180))
        # Icon placeholder
        hd.rounded_rectangle([14, ry + 10, 36, ry + 32], radius=4,
                               fill=(*ROSE, 120))
        # Service name
        hd.text((44, ry + 12), row, font=rf, fill=(*SAND, 230))
        # Price
        pbb = hd.textbbox((0, 0), price, font=pf)
        hd.text((CW - 16 - (pbb[2] - pbb[0]), ry + 12), price, font=pf, fill=(*ROSE, 230))
        # Divider between rows
        if ri < len(spec["rows"]) - 1:
            hd.line([(8, ry + 44), (CW - 8, ry + 44)], fill=(40, 20, 60, 80), width=1)

    # CTA Button (rose, bottom 50px)
    BTN_Y = CH - 62
    BTN_M = 12
    hd.rounded_rectangle([BTN_M, BTN_Y, CW - BTN_M, BTN_Y + 46], radius=10,
                           fill=(*ROSE, 220))
    btn_f  = fnt(FB, 18)
    btn_bb = hd.textbbox((0, 0), "Book Now →", font=btn_f)
    hd.text(((CW - (btn_bb[2] - btn_bb[0])) // 2, BTN_Y + 12),
            "Book Now →", font=btn_f, fill=(*BG, 255))

    return img

# Pre-render all 3 cards at full resolution
CARD_IMGS = [_make_card(spec) for spec in CARD_SPECS]


def _apply_holotint(card_arr):
    """Apply cyan/rose holographic tint at 0.3 opacity + scanlines."""
    arr = card_arr.astype(np.float32)
    # Tint: add cyan cast
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.7 + 100 * 0.3, 0, 255)   # R: reduce
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.85 + 220 * 0.3, 0, 255)  # G: boost
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.85 + 230 * 0.3, 0, 255)  # B: boost
    # Scanlines
    yy = np.arange(arr.shape[0])
    scan = (np.sin(yy * 1.5) * 0.08 + 0.92)
    arr[:, :, :3] *= scan[:, None, None]
    return arr.clip(0, 255).astype(np.uint8)


def _warp_card_to_canvas(card_pil, dst_quad, scroll_offset=0, pulse_glow=0.0):
    """
    Perspective-warp card_pil (CW×CH RGBA) into a full-canvas RGBA layer.
    dst_quad: list of 4 (x,y) tuples for TL, TR, BR, BL in canvas coords.
    scroll_offset: pixels to vertically scroll content (card 1 animation).
    pulse_glow: 0-1 extra glow on CTA button (card 2 animation).
    """
    # Apply scroll: shift card content upward by creating a new view
    if scroll_offset > 0:
        scroll_offset = scroll_offset % CH
        top   = card_pil.crop((0, scroll_offset, CW, CH))
        bot   = card_pil.crop((0, 0, CW, scroll_offset))
        scrolled = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        scrolled.paste(top, (0, 0))
        scrolled.paste(bot, (0, CH - scroll_offset))
        card_pil = scrolled

    # Apply button pulse glow for card 2
    if pulse_glow > 0:
        overlay = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        btn_y = CH - 62
        glow_col = (*ROSE, int(pulse_glow * 180))
        od.rounded_rectangle([12, btn_y, CW - 12, btn_y + 46], radius=10, fill=glow_col)
        card_pil = Image.alpha_composite(card_pil, overlay)

    # Apply holographic tint
    card_arr = np.array(card_pil)
    card_arr = _apply_holotint(card_arr)

    # cv2 perspective warp
    src = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
    dst = np.float32(dst_quad)
    M   = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(card_arr, M, (W, H),
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=(0, 0, 0, 0))
    return warped  # H×W×4 RGBA on full canvas


def _draw_hologram_cone_up(img, apex_x, apex_y, progress):
    """Hologram beam shooting UPWARD from apex (back camera)."""
    if progress <= 0: return img
    arr  = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[:H, :W]

    # Cone: upward from apex
    cone_h     = int(H * 0.80 * progress)
    cone_half_w = int(cone_h * 0.55)

    dy   = (apex_y - yy).astype(float)   # positive = above apex (upward on screen)
    dx   = (xx - apex_x).astype(float)

    # Angular limit: atan(cone_half_w / cone_h)
    half_angle = math.atan2(cone_half_w, cone_h)
    angle_px   = np.arctan2(np.abs(dx), np.maximum(dy, 1))
    in_cone    = (dy > 0) & (angle_px < half_angle) & (dy < cone_h)

    # Intensity: axis bright, edges dim, fades at top
    axis_ratio = np.abs(dx) / (np.maximum(dy, 1) * math.tan(half_angle) + 1e-9)
    intensity  = np.clip(1 - axis_ratio, 0, 1) ** 1.5
    fade_top   = np.clip(1 - dy / cone_h, 0.04, 1) ** 0.5
    intensity  = intensity * fade_top * 0.60 * progress

    # Animated scanlines along beam
    scan = (np.sin(yy * 0.6 + time.time() * 3) * 0.12 + 0.88)

    for c, v in enumerate(CYAN):
        arr[:, :, c] = np.where(in_cone,
                                 np.clip(arr[:, :, c] + intensity * scan * v, 0, 255),
                                 arr[:, :, c])

    # Bright core line along axis
    core_hw = max(1, int(4 * progress))
    in_core = in_cone & (np.abs(dx) < core_hw)
    arr[:, :, 0] = np.where(in_core, np.clip(arr[:, :, 0] + 80 * progress, 0, 255), arr[:, :, 0])
    arr[:, :, 1] = np.where(in_core, np.clip(arr[:, :, 1] + 180 * progress, 0, 255), arr[:, :, 1])
    arr[:, :, 2] = np.where(in_core, np.clip(arr[:, :, 2] + 200 * progress, 0, 255), arr[:, :, 2])

    return Image.fromarray(arr.astype(np.uint8))


def _chromatic_aberration(img, amount=4):
    r, g, b = img.split()
    r = r.transform(r.size, Image.AFFINE, (1, 0, -amount, 0, 1, 0), Image.BILINEAR)
    b = b.transform(b.size, Image.AFFINE, (1, 0,  amount, 0, 1, 0), Image.BILINEAR)
    return Image.merge("RGB", (r, g, b))


# ── Scene 2: Hologram (4-18s) ────────────────────────────────────────────────
S2_DUR = 14.0

# Phone sits near bottom-center showing back face
PHONE_Y2  = H - PHONE_H - 40   # top-y of phone in scene 2
PHONE_CX2 = W // 2
# Camera position on canvas (apex of hologram)
APEX_X = PHONE_CX2
APEX_Y = PHONE_Y2 + CAMERA_Y_ON_PHONE

# Card quads: TL, TR, BR, BL in canvas pixels
# Cards float in the upper portion of the hologram beam
# Card center heights: left/center/right staggered for depth
def _card_quad(center_x, center_y, card_scale, lean_x, lean_y):
    """
    Build dst quad for a card centered at (center_x, center_y),
    scaled by card_scale, with lean offsets for 3D feel.
    lean_x: positive = top-right, negative = top-left tilt
    lean_y: positive = top-closer (trapezoid), negative = top-farther
    """
    dw = int(CW * card_scale)
    dh = int(CH * card_scale)
    # Base rect corners then shift top/bottom by lean
    tl = [center_x - dw // 2 + lean_x, center_y - dh // 2 + lean_y]
    tr = [center_x + dw // 2 + lean_x, center_y - dh // 2 - lean_y]
    br = [center_x + dw // 2 - lean_x, center_y + dh // 2 - lean_y]
    bl = [center_x - dw // 2 - lean_x, center_y + dh // 2 + lean_y]
    return [tl, tr, br, bl]

CARD_SCALE = 0.58
CARD1_CX, CARD1_CY = W // 2 - 390, H // 2 - 40
CARD2_CX, CARD2_CY = W // 2,       H // 2 - 80
CARD3_CX, CARD3_CY = W // 2 + 390, H // 2 - 30

QUAD1 = _card_quad(CARD1_CX, CARD1_CY, CARD_SCALE, -18, 22)   # left lean
QUAD2 = _card_quad(CARD2_CX, CARD2_CY, CARD_SCALE,   0, 30)   # center, top-closer
QUAD3 = _card_quad(CARD3_CX, CARD3_CY, CARD_SCALE,  18, 22)   # right lean


def scene2_frame(t):
    p = t / S2_DUR
    img = new_frame(BG)
    fill_gradient(img, BG, (15, 5, 25))
    glow(img, W // 2, H * 0.8, 500, BURGUNDY, 0.22)
    glow(img, APEX_X, APEX_Y, 300, CYAN, 0.08 * ease_out(p))

    # Phone back face at bottom
    phone_arr = _cv2_warp_phone_on_canvas(PHONE_BACK, 1.0, PHONE_CX2, PHONE_Y2 + PHONE_H // 2, 0)
    img = _composite_rgba(img, phone_arr)

    # Camera glow on back
    cam_canvas_x = PHONE_CX2
    cam_canvas_y = PHONE_Y2 + CAMERA_Y_ON_PHONE
    glow(img, cam_canvas_x, cam_canvas_y, 30,  WHITE, 0.8)
    glow(img, cam_canvas_x, cam_canvas_y, 100, CYAN,  0.6 * ease_out(p))

    # Hologram beam shooting UPWARD
    cone_p = ease_out(min(p / 0.20, 1), 2)
    img    = _draw_hologram_cone_up(img, APEX_X, APEX_Y, cone_p)

    # ── Floating website cards (appear at t=1, fully visible by t=4) ───────
    # card 1 at t=1, card 2 at t=1, card 3 fades in at t=3
    cards_global_p = ease_out(max(t - 1.0, 0) / 3.0)  # 0→1 over t=1 to t=4
    card3_p        = ease_out(max(t - 3.0, 0) / 2.0)  # card 3 only after t=3

    if cards_global_p > 0:
        # Card 1 (left): scrolls content upward
        scroll1 = int(t * 18) % CH   # 18 px/s scroll
        q1 = QUAD1
        w1 = _warp_card_to_canvas(CARD_IMGS[0], q1, scroll_offset=scroll1)
        # Fade alpha
        w1[:, :, 3] = (w1[:, :, 3] * cards_global_p).clip(0, 255).astype(np.uint8)
        img = _composite_rgba(img, w1)

        # Card 2 (center): pulsing button glow
        pulse2 = 0.5 + 0.5 * math.sin(t * 3.5)
        q2     = QUAD2
        w2 = _warp_card_to_canvas(CARD_IMGS[1], q2, pulse_glow=pulse2)
        w2[:, :, 3] = (w2[:, :, 3] * cards_global_p).clip(0, 255).astype(np.uint8)
        img = _composite_rgba(img, w2)

        # Card 3 (right): fades in last
        if card3_p > 0:
            q3 = QUAD3
            w3 = _warp_card_to_canvas(CARD_IMGS[2], q3)
            w3[:, :, 3] = (w3[:, :, 3] * card3_p).clip(0, 255).astype(np.uint8)
            img = _composite_rgba(img, w3)

    # Rising particles in beam
    rng      = np.random.RandomState(99)
    n_parts  = int(180 * cone_p)
    arr      = np.array(img, dtype=np.float32)
    cone_h   = int(H * 0.80 * cone_p)
    cone_hw  = int(cone_h * 0.55)
    if n_parts > 0:
        px_base = rng.uniform(APEX_X - cone_hw * 0.8, APEX_X + cone_hw * 0.8, 200).astype(int)
        py_base = rng.uniform(APEX_Y - cone_h, APEX_Y, 200).astype(int)
        rise    = (t * 45) % cone_h
        for i in range(n_parts):
            px = int(px_base[i] + math.sin(t * 1.8 + i * 0.7) * 25)
            py = py_base[i] - int(rise)
            if py < APEX_Y - cone_h: py += cone_h
            if 0 <= px < W and 0 <= py < H:
                col = ROSE if i % 3 == 0 else (SAND if i % 3 == 1 else CYAN)
                a   = (0.5 + 0.5 * math.sin(t * 2.5 + i)) * cone_p
                arr[py, px] = np.clip(arr[py, px] + np.array(col) * a, 0, 255)
                if px + 1 < W:
                    arr[py, px+1] = np.clip(arr[py, px+1] + np.array(col) * a * 0.4, 0, 255)
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))

    # Chromatic aberration
    if cone_p > 0.15:
        img = _chromatic_aberration(img, amount=int(3 * cone_p))

    # Global scanline overlay
    arr = np.array(img, dtype=np.float32)
    yy  = np.arange(H)
    scan = (np.sin(yy * 0.7 + t * 4) * 0.05 + 0.95)
    arr  *= scan[:, None, None]
    img   = Image.fromarray(arr.clip(0, 255).astype(np.uint8))

    return np.array(img)


# ── Scenes 3-5: UNCHANGED from hologram v1 ────────────────────────────────────
S3_DUR = 6.0

def scene3_frame(t):
    p = t / S3_DUR
    img = new_frame(BG)
    fill_gradient(img, BG, BG_WARM)
    glow(img, W//2, H // 3, 450, ROSE, 0.20)

    d = ImageDraw.Draw(img)

    label_f = fnt(FM, 32)
    if p > 0.05:
        a = min((p - 0.05) / 0.15, 1)
        col = tuple(int(c * a) for c in SAND)
        centered_text(d, H // 2 - 200, "What others charge:", label_f, col)

    price_f = fnt(FB, 120)
    strike_p = ease_out(max(p - 0.2, 0) / 0.4)

    if p > 0.1:
        a = min((p - 0.1) / 0.2, 1)
        gray = tuple(int(c * a) for c in (180, 180, 180))
        price_text = "$20,000 USD"
        bb = d.textbbox((0, 0), price_text, font=price_f)
        tx = (W - (bb[2] - bb[0])) // 2
        ty = H // 2 - 130
        d.text((tx, ty), price_text, font=price_f, fill=gray)
        if strike_p > 0:
            line_y  = ty + (bb[3] - bb[1]) // 2 + 8
            line_x1 = tx - 10
            line_x2 = tx + int((bb[2] - bb[0] + 20) * strike_p)
            d.line([(line_x1, line_y - 3), (line_x2, line_y - 3)], fill=(220, 60, 60), width=8)
            d.line([(line_x1, line_y + 3), (line_x2, line_y + 3)], fill=(220, 60, 60), width=8)

    div_p = ease_out(max(p - 0.45, 0) / 0.2)
    if div_p > 0:
        dx = int((W - 600) * div_p / 2)
        d.line([(dx + (W - 600) // 2, H // 2 + 10),
                (W - dx - (W - 600) // 2, H // 2 + 10)], fill=(*CLAY, int(200 * div_p)), width=2)

    qar_p = ease_out(max(p - 0.55, 0) / 0.3)
    if qar_p > 0:
        qar_f    = fnt(FB, 130)
        qar_text = "2,000 QAR"
        bb2      = d.textbbox((0, 0), qar_text, font=qar_f)
        qx       = (W - (bb2[2] - bb2[0])) // 2
        qy       = H // 2 + 40
        pulse    = 0.5 + 0.5 * math.sin(t * 6)
        glow(img, W // 2, qy + 60, 320 + int(pulse * 60), ROSE, 0.30 * qar_p)
        glow(img, W // 2, qy + 60, 120, ROSE, 0.50 * qar_p * pulse)
        d = ImageDraw.Draw(img)
        d.text((qx, qy), qar_text, font=qar_f, fill=(*ROSE, int(255 * qar_p)))

    tag_p = ease_out(max(p - 0.82, 0) / 0.15)
    if tag_p > 0:
        tag_f = fnt(FM, 38)
        a     = int(255 * tag_p)
        centered_text(d, H // 2 + 210, "Same result. Fraction of the price.", tag_f, (*SAND, a))

    return np.array(img)


S4_DUR = 4.0

def scene4_frame(t):
    p   = t / S4_DUR
    img = new_frame(BG)
    arr = np.zeros((H, W, 3), dtype=np.float32)
    yy, xx = np.mgrid[:H, :W]
    d1 = np.sqrt(((xx - W * 0.35) / 500) ** 2 + ((yy - H * 0.4) / 400) ** 2)
    d2 = np.sqrt(((xx - W * 0.65) / 500) ** 2 + ((yy - H * 0.6) / 400) ** 2)
    g1 = np.exp(-d1 * 1.5) * 0.3
    g2 = np.exp(-d2 * 1.5) * 0.25
    for c, v in enumerate(BURGUNDY): arr[:, :, c] += g1 * v
    for c, v in enumerate((50, 20, 70)): arr[:, :, c] += g2 * v
    arr = np.clip(arr, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))

    particle_p = ease_out(min(p * 2.5, 1), 2.5)
    draw_particles(img, particle_p, colors=[ROSE, SAND, CLAY])

    d = ImageDraw.Draw(img)
    url_full  = "getwujood.com"
    url_p     = ease_out(max(p - 0.3, 0) / 0.45)
    url_chars = int(len(url_full) * url_p)
    if url_chars > 0:
        url_f   = fnt(FB, 58)
        url_txt = url_full[:url_chars]
        cursor  = "_" if int(t * 2) % 2 == 0 and url_chars < len(url_full) else ""
        glow(img, W // 2, H * 0.66, 200, ROSE, 0.35 * url_p)
        d = ImageDraw.Draw(img)
        bb  = d.textbbox((0, 0), url_txt + cursor, font=url_f)
        ux  = (W - (bb[2] - bb[0])) // 2
        d.text((ux, int(H * 0.63)), url_txt + cursor, font=url_f, fill=(*ROSE, int(240 * url_p)))

    ph_p = ease_out(max(p - 0.6, 0) / 0.35)
    if ph_p > 0:
        ph_f = fnt(FM, 44)
        a    = int(220 * ph_p)
        centered_text(d, int(H * 0.73), "+974 7727 7292", ph_f, (*SAND, a))

    return np.array(img)


S5_DUR = 2.0

def scene5_frame(t):
    p = t / S5_DUR
    if p < 0.3:
        bright = ease_in_out(p / 0.3)
    elif p < 0.6:
        bright = 1.0
    else:
        bright = 1 - ease_in((p - 0.6) / 0.4)

    bg_val = int(bright * 255)
    img    = Image.new("RGB", (W, H), (bg_val, bg_val, bg_val))
    d      = ImageDraw.Draw(img)

    text_alpha = 0
    if 0.15 < p < 0.85:
        inner_p    = (p - 0.15) / 0.7
        text_alpha = int(math.sin(inner_p * math.pi) * 255)

    if text_alpha > 0:
        txt        = "Your business deserves to exist online."
        f          = fnt(FM, 52)
        text_gray  = int((1 - bright) * 50 + 20)
        col        = (text_gray, text_gray, text_gray, text_alpha)
        bb         = d.textbbox((0, 0), txt, font=f)
        tx         = (W - (bb[2] - bb[0])) // 2
        ty         = H // 2 - (bb[3] - bb[1]) // 2
        overlay    = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od         = ImageDraw.Draw(overlay)
        od.text((tx, ty), txt, font=f, fill=col)
        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay).convert("RGB")

    return np.array(img)


# ── Export ────────────────────────────────────────────────────────────────────
def make_clip(fn, dur):
    return VideoClip(lambda t: fn(t), duration=dur).with_fps(FPS)


def main():
    t0 = time.time()

    print("Scene 1: Phone Flip (4s)…")
    c1 = make_clip(scene1_frame, S1_DUR)

    print("Scene 2: Hologram + Website Cards (14s)…")
    c2 = make_clip(scene2_frame, S2_DUR)

    print("Scene 3: Price Reveal (6s)…")
    c3 = make_clip(scene3_frame, S3_DUR)

    print("Scene 4: CTA (4s)…")
    c4 = make_clip(scene4_frame, S4_DUR)

    print("Scene 5: End Card (2s)…")
    c5 = make_clip(scene5_frame, S5_DUR)

    final        = concatenate_videoclips([c1, c2, c3, c4, c5])
    total        = final.duration
    silent_path  = os.path.join(OUTDIR, "wujood_v4_silent.mp4")

    os.makedirs(OUTDIR, exist_ok=True)
    print(f"Rendering silent → {silent_path}")
    final.write_videofile(silent_path, fps=FPS, codec="libx264",
                          ffmpeg_params=["-crf", "17", "-preset", "fast"],
                          logger=None)

    print("Mixing music (volume 0.45)…")
    fade_out_start = total - 3
    cmd = [
        "ffmpeg", "-y",
        "-i", silent_path,
        "-i", MUSIC,
        "-filter_complex",
        f"[1:a]afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start:.1f}:d=3,volume=0.45[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
        OUT
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print("FFmpeg error:", result.stderr.decode()[-400:])
        sys.exit(1)

    elapsed = time.time() - t0
    size    = os.path.getsize(OUT) / 1024 / 1024
    print(f"\nDone in {elapsed:.0f}s  →  {OUT}  ({size:.1f} MB)")


if __name__ == "__main__":
    main()
