#!/usr/bin/env python3
"""
Wujood Hologram Demo Video — 30s, 1920×1080, H264
5 scenes: Phone Flip → Hologram → Price Reveal → CTA → End Card
"""

import math, os, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import VideoClip, concatenate_videoclips, AudioFileClip, CompositeAudioClip

# ── Constants ────────────────────────────────────────────────────────────────
W, H   = 1920, 1080
FPS    = 30
OUT    = os.path.join(os.path.dirname(__file__), "wujood-hologram", "wujood_hologram_final.mp4")
MUSIC  = os.path.join(os.path.dirname(__file__), "wujood-hologram", "music_hologram.wav")

# Palette
ROSE      = (212, 165, 165)
CLAY      = (184, 125, 109)
SAND      = (232, 213, 196)
BURGUNDY  = (93,  46,  70)
BG        = (8,   4,   10)
BG_WARM   = (22,  10,  30)
BG_MID    = (42,  18,  55)
CYAN      = (100, 220, 230)
WHITE     = (255, 255, 255)
BLACK     = (0,   0,   0)

# Font paths
FONT_DIR = "/usr/share/fonts/truetype"
def _find(candidates):
    for p in candidates:
        if os.path.exists(p): return p
    return None

FB  = _find([f"{FONT_DIR}/liberation/LiberationSans-Bold.ttf",
             f"{FONT_DIR}/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"])
FM  = _find([f"{FONT_DIR}/liberation/LiberationSans-Regular.ttf",
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
    img = Image.new("RGB", (W, H), bg)
    return img

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

def alpha_composite(base, overlay, pos=(0, 0)):
    if overlay.mode != "RGBA":
        overlay = overlay.convert("RGBA")
    base.paste(overlay, pos, overlay)

def centered_text(draw, y, text, font, color, img_w=W):
    bb = draw.textbbox((0, 0), text, font=font)
    x = (img_w - (bb[2] - bb[0])) // 2
    draw.text((x, y), text, font=font, fill=color)
    return bb[3] - bb[1]

# ── Particle system (WUJOOD letters) ─────────────────────────────────────────
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
    scale  = W * 0.68 / tw
    ox     = (W - tw * scale) / 2
    oy     = H * 0.42
    ptx = (xs * scale + ox).astype(int)
    pty = (ys * scale + oy).astype(int)
    rng = np.random.RandomState(7)
    psx = rng.randint(0, W, len(ptx))
    psy = rng.randint(0, H, len(pty))
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
        # pixel + 1-px spread
        arr[y, x] = np.clip(np.array(arr[y, x], float) + np.array(col) * alpha * 0.9, 0, 255)
        if x + 1 < W: arr[y, x+1] = np.clip(np.array(arr[y, x+1], float) + np.array(col) * alpha * 0.4, 0, 255)
        if y + 1 < H: arr[y+1, x] = np.clip(np.array(arr[y+1, x], float) + np.array(col) * alpha * 0.4, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))

# ── Phone drawing ─────────────────────────────────────────────────────────────
PHONE_W  = 320
PHONE_H  = 640
PHONE_R  = 36
SCREEN_PAD = 14

def _draw_phone_img(screen_content=None):
    """Return a phone image (RGBA) at PHONE_W × PHONE_H."""
    img = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    # Body
    d.rounded_rectangle([0, 0, PHONE_W-1, PHONE_H-1], radius=PHONE_R,
                         fill=(30, 18, 40), outline=ROSE, width=3)
    # Notch
    d.rounded_rectangle([PHONE_W//2 - 40, 4, PHONE_W//2 + 40, 22], radius=8, fill=(20, 10, 28))
    # Screen area
    sx, sy = SCREEN_PAD, 36
    sw, sh = PHONE_W - SCREEN_PAD * 2, PHONE_H - 80
    if screen_content:
        sc = screen_content.resize((sw, sh), Image.LANCZOS)
        img.paste(sc, (sx, sy))
    else:
        d.rectangle([sx, sy, sx + sw, sy + sh], fill=(18, 10, 28))
    # Home bar
    d.rounded_rectangle([PHONE_W//2 - 50, PHONE_H - 28, PHONE_W//2 + 50, PHONE_H - 18],
                         radius=4, fill=ROSE)
    return img

def _perspective_warp(img_pil, src_pts, dst_pts):
    """8-point perspective warp using PIL PERSPECTIVE transform."""
    # PIL wants coeffs for PERSPECTIVE: maps dst → src
    # Solve using numpy
    def get_matrix(src, dst):
        A = []
        for (x, y), (u, v) in zip(dst, src):
            A.append([u, v, 1, 0, 0, 0, -x*u, -x*v])
            A.append([0, 0, 0, u, v, 1, -y*u, -y*v])
        A = np.array(A, dtype=float)
        b = np.array([[x] for (x, y) in dst for _ in range(1)] +
                     [[y] for (x, y) in dst for _ in range(1)])
        # interleave x, y
        b2 = []
        for (x, y) in dst:
            b2.append(x)
            b2.append(y)
        b2 = np.array(b2, dtype=float)
        # solve A h = b2  (8×8)
        # use least squares
        h, _, _, _ = np.linalg.lstsq(A, b2, rcond=None)
        return h
    h = get_matrix(src_pts, dst_pts)
    coeffs = list(h)
    return img_pil.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

# ── Scene 1: Phone Flip (0-4s) ───────────────────────────────────────────────
S1_DUR = 4.0

def scene1_frame(t):
    img = new_frame(BG)
    fill_gradient(img, BG, BG_WARM)

    # Background glow
    glow(img, W//2, H//2, 500, ROSE, 0.18)

    p = t / S1_DUR  # 0→1
    phone = _draw_phone_img()

    # Phase 1 (0→0.5): phone enters from right, full front face
    # Phase 2 (0.5→0.8): 3D flip — shrink width (perspective)
    # Phase 3 (0.8→1.0): back face visible briefly → flip completes to front
    pw, ph = PHONE_W, PHONE_H
    cx, cy = W // 2, H // 2

    if p < 0.5:
        # Slide in from right
        slide = ease_out(p / 0.5)
        rx = int(W * 0.85 * (1 - slide))
        draw_x = cx - pw // 2 + rx
        draw_y = cy - ph // 2
        # Motion blur: blend 8 sub-frames
        result = Image.new("RGB", (W, H), (0, 0, 0))
        for k in range(8):
            sub_p = (p - (1 - k / 8) * 0.12)
            sub_slide = ease_out(max(sub_p, 0) / 0.5)
            sub_rx = int(W * 0.85 * (1 - sub_slide))
            sub_x = cx - pw // 2 + sub_rx
            blur_alpha = int(255 * (k + 1) / 8)
            phone_rgba = phone.copy()
            frame_layer = img.copy()
            frame_layer.paste(phone_rgba, (sub_x, cy - ph // 2), phone_rgba)
            result = Image.blend(result, frame_layer, 1 / (8 - k + 1))
        img = result
    else:
        # 3D flip: cosine squeeze
        flip_p = (p - 0.5) / 0.5  # 0→1
        angle  = flip_p * math.pi  # 0 → π
        cos_a  = math.cos(angle)
        # Squeezed width
        squeezed_w = max(int(abs(cos_a) * pw), 2)
        # Perspective: top is narrower
        top_w    = max(int(abs(cos_a) * pw * 0.7), 2)
        top_x    = cx - top_w // 2
        bot_x    = cx - squeezed_w // 2
        top_y    = cy - ph // 2
        bot_y    = cy + ph // 2
        # warp phone
        src = [(0, 0), (pw, 0), (pw, ph), (0, ph)]
        dst = [(top_x, top_y), (top_x + top_w, top_y),
               (bot_x + squeezed_w, bot_y), (bot_x, bot_y)]
        # choose face
        if cos_a >= 0:
            face = phone.convert("RGB").resize((W, H), Image.NEAREST)
            warped = _perspective_warp(face, src, dst)
        else:
            # Back face (dark with logo)
            back = Image.new("RGB", (PHONE_W, PHONE_H), (20, 8, 30))
            bd   = ImageDraw.Draw(back)
            bf   = fnt(FB, 38)
            bb   = bd.textbbox((0, 0), "WUJOOD", font=bf)
            bx   = (PHONE_W - (bb[2] - bb[0])) // 2
            by   = PHONE_H // 2 - 20
            bd.text((bx, by), "WUJOOD", font=bf, fill=ROSE)
            back_r = back.resize((W, H), Image.NEAREST)
            warped = _perspective_warp(back_r, src, dst)
        img.paste(warped, (0, 0))

        # Lens flare burst at midpoint of flip
        if 0.4 < flip_p < 0.6:
            flare_str = 1 - abs(flip_p - 0.5) * 10
            glow(img, cx, cy, 300, WHITE, flare_str * 0.6)
            glow(img, cx, cy, 80, WHITE, flare_str * 0.9)

    return np.array(img)


# ── Scene 2: Hologram (4-18s) ────────────────────────────────────────────────
S2_DUR = 14.0

CARD_LABELS = ["Restaurant", "Beauty Salon", "Retail Store"]

def _make_website_card(label, w=420, h=280):
    """Fake floating website card for the hologram."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    # Card body with glass effect
    d.rounded_rectangle([0, 0, w-1, h-1], radius=16,
                         fill=(15, 8, 25, 220), outline=(*CYAN, 160), width=2)
    # Header bar
    d.rectangle([2, 2, w-2, 44], fill=(*BURGUNDY, 200))
    # Title
    f_title = fnt(FB, 22)
    bb = d.textbbox((0, 0), label, font=f_title)
    d.text(((w - (bb[2]-bb[0])) // 2, 12), label, font=f_title, fill=(*SAND, 240))
    # Fake nav items
    nav_f = fnt(FM, 14)
    for i, txt in enumerate(["Home", "Services", "Contact"]):
        nx = 16 + i * 100
        d.text((nx, 56), txt, font=nav_f, fill=(*ROSE, 200))
    # Fake content lines
    line_f = fnt(FM, 13)
    lines = ["Premium quality service", "Fast & reliable", "24/7 support", "Get started today"]
    for i, ln in enumerate(lines):
        d.text((16, 88 + i * 28), ln, font=line_f, fill=(*SAND, 180))
    # Bottom button
    d.rounded_rectangle([16, h-52, w-16, h-16], radius=8, fill=(*ROSE, 200))
    btn_f = fnt(FB, 16)
    btn_bb = d.textbbox((0, 0), "Visit Site →", font=btn_f)
    d.text(((w - (btn_bb[2]-btn_bb[0])) // 2, h - 48), "Visit Site →", font=btn_f, fill=(*BG, 255))
    return img

CARDS = [_make_website_card(lbl) for lbl in CARD_LABELS]

def _draw_hologram_cone(img, phone_cx, phone_bot_y, progress):
    """Draw hologram beam coming from phone back."""
    arr = np.array(img, dtype=np.float32)
    # Cone apex at phone center bottom, fans out upward
    apex_x, apex_y = phone_cx, phone_bot_y
    cone_h = int(H * 0.6 * progress)
    cone_top_w = int(cone_h * 1.2)
    if cone_h < 2: return img

    yy, xx = np.mgrid[:H, :W]
    dy = (apex_y - yy).astype(float)
    dx = (xx - apex_x).astype(float)

    # Points inside cone: angle check
    half_angle = math.atan2(cone_top_w / 2, cone_h)
    angle = np.arctan2(np.abs(dx), np.maximum(dy, 1))
    in_cone = (dy > 0) & (angle < half_angle) & (dy < cone_h)

    # Intensity: stronger near center axis, fades with height
    axis_dist = np.abs(dx) / np.maximum(dy, 1) / math.tan(half_angle)
    intensity = np.clip(1 - axis_dist, 0, 1) * np.clip(1 - dy / cone_h, 0.05, 1) * 0.55

    # Scanlines
    scanlines = (np.sin(yy * 0.5 - time.time() * 2) * 0.5 + 0.5) * 0.3 + 0.7

    for c, v in enumerate(CYAN):
        arr[:, :, c] = np.where(in_cone, np.clip(arr[:, :, c] + intensity * scanlines * v * progress, 0, 255), arr[:, :, c])

    return Image.fromarray(arr.astype(np.uint8))

def _chromatic_aberration(img, amount=4):
    """RGB channel offset for hologram glitch effect."""
    r, g, b = img.split()
    r = r.transform(r.size, Image.AFFINE, (1, 0, -amount, 0, 1, 0), Image.BILINEAR)
    b = b.transform(b.size, Image.AFFINE, (1, 0,  amount, 0, 1, 0), Image.BILINEAR)
    return Image.merge("RGB", (r, g, b))

def scene2_frame(t):
    p = t / S2_DUR
    img = new_frame(BG)
    fill_gradient(img, BG, (18, 6, 28))
    glow(img, W//2, H//2, 600, BURGUNDY, 0.18)
    glow(img, W//2, H//2, 250, CYAN, 0.10 * ease_out(p))

    # Phone in upper center
    phone_x = W // 2 - PHONE_W // 2
    phone_y = int(H * 0.08)
    phone   = _draw_phone_img()
    img.paste(phone, (phone_x, phone_y), phone)
    phone_cx  = W // 2
    phone_bot = phone_y + PHONE_H

    # Hologram cone appears after 0.5s
    cone_p = ease_out(max(p - 0.04, 0) / 0.96)
    img = _draw_hologram_cone(img, phone_cx, phone_bot, cone_p)

    # Floating particles
    rng = np.random.RandomState(99)
    n_parts = int(200 * cone_p)
    arr = np.array(img, dtype=np.float32)
    if n_parts > 0:
        px_base = rng.uniform(phone_cx - 400, phone_cx + 400, 200).astype(int)
        py_base = rng.uniform(phone_bot, phone_bot + int(H * 0.55), 200).astype(int)
        rise    = (t * 40) % (H * 0.55)
        for i in range(n_parts):
            px = int(px_base[i] + math.sin(t * 1.5 + i) * 30)
            py = int(py_base[i] - rise) % H
            if 0 <= px < W and 0 <= py < H:
                col = ROSE if i % 3 == 0 else (SAND if i % 3 == 1 else CYAN)
                a   = 0.6 + 0.4 * math.sin(t * 3 + i)
                arr[py, px] = np.clip(arr[py, px] + np.array(col) * a, 0, 255)
                if px+1 < W: arr[py, px+1] = np.clip(arr[py, px+1] + np.array(col) * a * 0.4, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))

    # 3 rotating website cards
    card_y_center = int(phone_bot + H * 0.28)
    card_spacing  = 480
    card_w, card_h = 420, 280
    for i, card in enumerate(CARDS):
        # Orbit angle
        base_angle = (i * 2 * math.pi / 3) + t * 0.4
        cx_card = int(W // 2 + math.sin(base_angle) * card_spacing * 0.5)
        depth   = (math.cos(base_angle) + 1) / 2  # 0(back)→1(front)
        scale   = 0.65 + depth * 0.35
        alpha   = int((0.4 + depth * 0.6) * 255 * cone_p)
        alpha   = min(alpha, 255)

        cw = int(card_w * scale)
        ch = int(card_h * scale)
        if cw < 4 or ch < 4: continue
        card_scaled = card.resize((cw, ch), Image.LANCZOS)
        # adjust alpha
        r, g, b, a = card_scaled.split()
        a = a.point(lambda x: min(x, alpha))
        card_scaled = Image.merge("RGBA", (r, g, b, a))

        cx_off = cx_card - cw // 2
        cy_off = card_y_center - ch // 2
        if 0 <= cx_off < W - cw and 0 <= cy_off < H - ch:
            img.paste(card_scaled, (cx_off, cy_off), card_scaled)

    # Chromatic aberration on whole image
    if cone_p > 0.1:
        img = _chromatic_aberration(img, amount=int(3 * cone_p))

    # Scanline overlay
    arr = np.array(img, dtype=np.float32)
    yy = np.arange(H)
    scan = (np.sin(yy * 0.8 + t * 5) * 0.04 + 0.96)
    arr *= scan[:, None, None]
    img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))

    return np.array(img)


# ── Scene 3: Price Reveal (18-24s) ───────────────────────────────────────────
S3_DUR = 6.0

def scene3_frame(t):
    p = t / S3_DUR
    img = new_frame(BG)
    fill_gradient(img, BG, BG_WARM)
    glow(img, W//2, H // 3, 450, ROSE, 0.20)

    d = ImageDraw.Draw(img)

    # "What others charge" label
    label_f = fnt(FM, 32)
    if p > 0.05:
        a = min((p - 0.05) / 0.15, 1)
        col = tuple(int(c * a) for c in SAND)
        centered_text(d, H // 2 - 200, "What others charge:", label_f, col)

    # $20,000 USD — appears then gets struck through
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

        # Animated strikethrough
        if strike_p > 0:
            line_y = ty + (bb[3] - bb[1]) // 2 + 8
            line_x1 = tx - 10
            line_x2 = tx + int((bb[2] - bb[0] + 20) * strike_p)
            d.line([(line_x1, line_y - 3), (line_x2, line_y - 3)], fill=(220, 60, 60), width=8)
            d.line([(line_x1, line_y + 3), (line_x2, line_y + 3)], fill=(220, 60, 60), width=8)

    # Divider
    div_p = ease_out(max(p - 0.45, 0) / 0.2)
    if div_p > 0:
        dx = int((W - 600) * div_p / 2)
        d.line([(dx + (W - 600) // 2, H // 2 + 10),
                (W - dx - (W - 600) // 2, H // 2 + 10)], fill=(*CLAY, int(200 * div_p)), width=2)

    # 2,000 QAR — rose glow pulse
    qar_p = ease_out(max(p - 0.55, 0) / 0.3)
    if qar_p > 0:
        qar_f = fnt(FB, 130)
        qar_text = "2,000 QAR"
        bb2 = d.textbbox((0, 0), qar_text, font=qar_f)
        qx = (W - (bb2[2] - bb2[0])) // 2
        qy = H // 2 + 40
        # Glow pulse
        pulse = 0.5 + 0.5 * math.sin(t * 6)
        glow(img, W // 2, qy + 60, 320 + int(pulse * 60), ROSE, 0.30 * qar_p)
        glow(img, W // 2, qy + 60, 120, ROSE, 0.50 * qar_p * pulse)
        d = ImageDraw.Draw(img)
        d.text((qx, qy), qar_text, font=qar_f, fill=(*ROSE, int(255 * qar_p)))

    # Tagline
    tag_p = ease_out(max(p - 0.82, 0) / 0.15)
    if tag_p > 0:
        tag_f = fnt(FM, 38)
        a = int(255 * tag_p)
        centered_text(d, H // 2 + 210, "Same result. Fraction of the price.", tag_f, (*SAND, a))

    return np.array(img)


# ── Scene 4: CTA (24-28s) ────────────────────────────────────────────────────
S4_DUR = 4.0

def scene4_frame(t):
    p = t / S4_DUR
    img = new_frame(BG)

    # Luxury dark background with radial glow
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

    # WUJOOD particle assembly
    particle_p = ease_out(min(p * 2.5, 1), 2.5)
    draw_particles(img, particle_p, colors=[ROSE, SAND, CLAY])

    d = ImageDraw.Draw(img)

    # getwujood.com typewriter
    url_full = "getwujood.com"
    url_p    = ease_out(max(p - 0.3, 0) / 0.45)
    url_chars = int(len(url_full) * url_p)
    if url_chars > 0:
        url_f  = fnt(FB, 58)
        url_txt = url_full[:url_chars]
        cursor  = "_" if int(t * 2) % 2 == 0 and url_chars < len(url_full) else ""
        glow(img, W // 2, H * 0.66, 200, ROSE, 0.35 * url_p)
        d = ImageDraw.Draw(img)
        bb = d.textbbox((0, 0), url_txt + cursor, font=url_f)
        ux = (W - (bb[2] - bb[0])) // 2
        d.text((ux, int(H * 0.63)), url_txt + cursor, font=url_f, fill=(*ROSE, int(240 * url_p)))

    # Phone number fade in
    ph_p = ease_out(max(p - 0.6, 0) / 0.35)
    if ph_p > 0:
        ph_f = fnt(FM, 44)
        a = int(220 * ph_p)
        centered_text(d, int(H * 0.73), "+974 7727 7292", ph_f, (*SAND, a))

    return np.array(img)


# ── Scene 5: End Card (28-30s) ───────────────────────────────────────────────
S5_DUR = 2.0

def scene5_frame(t):
    p = t / S5_DUR
    # Fade white → hold → fade black
    if p < 0.3:
        bright = ease_in_out(p / 0.3)
    elif p < 0.6:
        bright = 1.0
    else:
        bright = 1 - ease_in((p - 0.6) / 0.4)

    bg_val = int(bright * 255)
    img    = Image.new("RGB", (W, H), (bg_val, bg_val, bg_val))
    d      = ImageDraw.Draw(img)

    # Text appears at peak brightness
    text_alpha = 0
    if 0.15 < p < 0.85:
        inner_p    = (p - 0.15) / 0.7
        text_alpha = int(math.sin(inner_p * math.pi) * 255)

    if text_alpha > 0:
        txt  = "Your business deserves to exist online."
        f    = fnt(FM, 52)
        # text color opposite to background brightness
        text_gray = int((1 - bright) * 50 + 20)
        col  = (text_gray, text_gray, text_gray, text_alpha)
        bb   = d.textbbox((0, 0), txt, font=f)
        tx   = (W - (bb[2] - bb[0])) // 2
        ty   = H // 2 - (bb[3] - bb[1]) // 2
        # draw with alpha via overlay
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.text((tx, ty), txt, font=f, fill=col)
        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay).convert("RGB")

    return np.array(img)


# ── Build & Export ────────────────────────────────────────────────────────────
def make_clip(fn, dur):
    return VideoClip(lambda t: fn(t), duration=dur).with_fps(FPS)


def main():
    t0 = time.time()
    print("Rendering Scene 1: Phone Flip (4s)…")
    c1 = make_clip(scene1_frame, S1_DUR)

    print("Rendering Scene 2: Hologram (14s)…")
    c2 = make_clip(scene2_frame, S2_DUR)

    print("Rendering Scene 3: Price Reveal (6s)…")
    c3 = make_clip(scene3_frame, S3_DUR)

    print("Rendering Scene 4: CTA (4s)…")
    c4 = make_clip(scene4_frame, S4_DUR)

    print("Rendering Scene 5: End Card (2s)…")
    c5 = make_clip(scene5_frame, S5_DUR)

    print("Concatenating…")
    final = concatenate_videoclips([c1, c2, c3, c4, c5])
    total = final.duration

    # Silent render first
    silent_path = OUT.replace("_final.mp4", "_silent.mp4")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    print(f"Exporting silent video → {silent_path}")
    final.write_videofile(silent_path, fps=FPS, codec="libx264",
                          ffmpeg_params=["-crf", "18", "-preset", "fast"],
                          logger=None)

    # Mix music with ffmpeg
    print("Mixing music…")
    fade_out_start = total - 3
    cmd = [
        "ffmpeg", "-y",
        "-i", silent_path,
        "-i", MUSIC,
        "-filter_complex",
        f"[1:a]afade=t=in:st=0:d=1,afade=t=out:st={fade_out_start:.1f}:d=3,volume=0.28[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        OUT
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        print("FFmpeg error:", result.stderr.decode()[-300:])
        sys.exit(1)

    elapsed = time.time() - t0
    size    = os.path.getsize(OUT) / 1024 / 1024
    print(f"\nDone in {elapsed:.0f}s → {OUT} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
