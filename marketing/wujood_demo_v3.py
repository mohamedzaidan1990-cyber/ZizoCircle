#!/usr/bin/env python3
"""
Wujood Web Agency — "A Website Coming to Life"
Complete rebuild v3 | 30s | 1920×1080 | 30fps | Desert Rose | English only

Scene 1  0–4s    Blank canvas: cursor types getwujood.com, browser draws itself
Scene 2  4–12s   Inside the browser: website builds itself element by element
Scene 3 12–20s   Browser flies into phone; tap → chat notification; rose glow
Scene 4 20–26s   Three stats count up: 48h / 2,000 QAR / +974 7727 7292
Scene 5 26–30s   WUJOOD assembles from particles; tagline; URL glows; fade black
"""

import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import VideoClip, concatenate_videoclips

# ── Palette ───────────────────────────────────────────────────────────────────
ROSE     = (212, 165, 165)
CLAY     = (184, 125, 109)
SAND     = (232, 213, 196)
BURGUNDY = (93,  46,  70)
BG       = (14,  8,   12)
BG_WARM  = (28,  14,  22)
BG_MID   = (52,  24,  40)
WHITE    = (255, 255, 255)
WA_GREEN = (37,  211, 102)
CHROME   = (30,  14,  24)   # browser chrome color

W, H = 1920, 1080
FPS  = 30

# ── Fonts ─────────────────────────────────────────────────────────────────────
FB   = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FR   = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FM   = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"
FMB  = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"

def fnt(path, size): return ImageFont.truetype(path, max(6, int(size)))


# ── Math ──────────────────────────────────────────────────────────────────────
def clamp(v, lo=0.0, hi=1.0): return max(lo, min(hi, v))

def ease_out(t, exp=3):   return 1 - (1 - clamp(t)) ** exp
def ease_in(t, exp=2):    return clamp(t) ** exp
def ease_in_out(t):
    t = clamp(t); return t*t*(3 - 2*t)
def spring(t, bounce=8):  # overshoot spring
    t = clamp(t)
    return 1 - math.exp(-8*t) * math.cos(bounce * t)

def prog(t, s, e): return clamp((t - s) / max(e - s, 1e-9))


# ── Colour ────────────────────────────────────────────────────────────────────
def blend(a, b, alpha):
    alpha = clamp(alpha)
    return tuple(int(a[i] + (b[i] - a[i]) * alpha) for i in range(3))

def fade(col, alpha):    return blend(BG, col, alpha)
def fadew(col, alpha):   return blend(BG_WARM, col, alpha)


# ── Drawing ───────────────────────────────────────────────────────────────────
def new_frame(bg=BG):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)

def fill_gradient(img, top, bot):
    arr = np.zeros((H, W, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = np.linspace(top[c], bot[c], H)[:, None]
    img.paste(Image.fromarray(arr.astype(np.uint8)))

def glow(img, cx, cy, r, col, strength=0.5, squeeze=1.5):
    if r < 1: return
    arr = np.array(img, dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - cx)**2 + ((yy - cy)*squeeze)**2)
    f = np.clip(1 - d/r, 0, 1)**2.5
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + col[c]*f*strength, 0, 255)
    img.paste(Image.fromarray(arr.astype(np.uint8)))

def text_cx(draw, txt, f, y, col, xc=W//2):
    bb = draw.textbbox((0,0), txt, font=f)
    draw.text((xc - (bb[2]-bb[0])//2, y), txt, font=f, fill=col)
    return bb[2]-bb[0]

def rrect(draw, x0,y0,x1,y1, r=12, fill=None, outline=None, lw=2):
    draw.rounded_rectangle([x0,y0,x1,y1], radius=r, fill=fill,
                            outline=outline, width=lw)

def diamond(draw, cx,cy,s, col):
    draw.polygon([(cx,cy-s),(cx+s,cy),(cx,cy+s),(cx-s,cy)], fill=col)

def fade_in(img, p):
    if p >= 1: return img
    return Image.blend(Image.new("RGB",(W,H),BG), img, ease_in_out(p))

def fade_out(img, p):
    if p <= 0: return img
    return Image.blend(img, Image.new("RGB",(W,H),BG), ease_in_out(p))

def flash(img, p, col=SAND):
    if p <= 0: return img
    overlay = Image.new("RGB",(W,H), col)
    return Image.blend(img, overlay, clamp(p)*0.85)


# ── Pre-compute WUJOOD particle targets ───────────────────────────────────────
def _compute_particles(n=700):
    tw, th = 1300, 280
    tmp = Image.new("L", (tw, th), 0)
    td  = ImageDraw.Draw(tmp)
    f   = fnt(FB, 230)
    bb  = td.textbbox((0,0), "WUJOOD", font=f)
    tx  = (tw - (bb[2]-bb[0])) // 2
    ty  = (th - (bb[3]-bb[1])) // 2
    td.text((tx, ty), "WUJOOD", font=f, fill=255)
    arr = np.array(tmp)
    ys, xs = np.where(arr > 80)
    rng = np.random.RandomState(7)
    idx = rng.choice(len(xs), min(n, len(xs)), replace=False)
    sx, sy = xs[idx].astype(float), ys[idx].astype(float)
    # Scale to screen coords
    scale  = W * 0.68 / tw
    off_x  = (W - tw*scale) / 2
    off_y  = (H/2 - th*scale/2) - 40
    tx_s   = sx*scale + off_x
    ty_s   = sy*scale + off_y
    # Random starts scattered across screen
    rx = rng.uniform(W*0.1, W*0.9, len(tx_s))
    ry = rng.uniform(H*0.1, H*0.9, len(ty_s))
    return tx_s, ty_s, rx, ry

PTX, PTY, PSX, PSY = _compute_particles()


# ── Website snapshot (reused across Scene 2 and 3) ───────────────────────────
def render_website(w, h, headline_chars=999, progress=1.0, show_wa=True):
    """Draw the website content at given size. Returns a PIL Image."""
    img  = Image.new("RGB", (w, h), BG_MID)
    draw = ImageDraw.Draw(img)

    # Scale factor for all sizes relative to 1400x820 design
    sx = w / 1400
    sy = h / 820

    def s(v): return int(v * sx)
    def sv(v): return int(v * sy)

    # ── Nav bar ──────────────────────────────────────────────────────────────
    nav_h = sv(70)
    draw.rectangle([0, 0, w, nav_h], fill=blend(BG, BURGUNDY, 0.92))
    draw.line([(0, nav_h), (w, nav_h)], fill=blend(BG_MID, ROSE, 0.4), width=1)

    f_nav = fnt(FB, s(22))
    draw.text((s(28), sv(22)), "WUJOOD", font=f_nav, fill=SAND)

    nav_items = ["Services", "Portfolio", "Pricing", "Contact"]
    f_ni = fnt(FR, s(16))
    nx = w - s(20)
    for item in reversed(nav_items):
        bb = draw.textbbox((0,0), item, font=f_ni)
        iw = bb[2]-bb[0]
        nx -= iw + s(28)
        draw.text((nx, sv(26)), item, font=f_ni, fill=blend(BG_MID, ROSE, 0.85))

    # ── Hero section ─────────────────────────────────────────────────────────
    hero_top = nav_h
    hero_bot = sv(420)
    # Gradient: burgundy → rose-tinted dark
    for y in range(hero_top, hero_bot):
        tt = (y - hero_top) / (hero_bot - hero_top)
        row_col = blend(blend(BG, BURGUNDY, 0.6), blend(BG, ROSE, 0.15), tt)
        draw.line([(0, y), (w, y)], fill=row_col)

    # Tagline above headline
    f_tag = fnt(FR, s(18))
    draw.text((s(60), hero_top + sv(48)),
              "QATAR'S FASTEST WEB AGENCY", font=f_tag,
              fill=blend(BG_MID, ROSE, 0.9))
    draw.line([(s(60), hero_top + sv(70)), (s(60) + s(220), hero_top + sv(70))],
              fill=blend(BG_MID, CLAY, 0.7), width=1)

    # Headline — typewriter
    headline_full = "Your Business. Online. In 48 Hours."
    headline_show = headline_full[:max(0, headline_chars)]
    f_hl = fnt(FB, s(52))
    # word-wrap at midpoint
    words   = headline_show.split()
    lines   = []
    current = ""
    for w_text in words:
        test = (current + " " + w_text).strip()
        bb   = draw.textbbox((0,0), test, font=f_hl)
        if bb[2]-bb[0] > w - s(120):
            lines.append(current)
            current = w_text
        else:
            current = test
    if current: lines.append(current)

    for li, line in enumerate(lines):
        draw.text((s(60), hero_top + sv(90) + li * sv(68)),
                  line, font=f_hl, fill=SAND)

    # Cursor blink at end of typed text
    if headline_chars < len(headline_full):
        cur_x = s(60)
        cur_line = lines[-1] if lines else ""
        bb = draw.textbbox((0,0), cur_line, font=f_hl)
        cur_x += bb[2] - bb[0] + 4
        cur_y  = hero_top + sv(90) + (len(lines)-1)*sv(68)
        draw.line([(cur_x, cur_y), (cur_x, cur_y + sv(55))],
                  fill=ROSE, width=max(1, s(3)))

    # Sub-headline
    if headline_chars >= 20:
        f_sub = fnt(FR, s(22))
        draw.text((s(60), hero_top + sv(230)),
                  "Professional websites built in Qatar",
                  font=f_sub, fill=blend(BG_MID, SAND, 0.65))

    # WhatsApp CTA button
    if show_wa:
        bw, bh = s(240), sv(52)
        bx, by = s(60), hero_top + sv(282)
        rrect(draw, bx, by, bx+bw, by+bh, r=sv(10),
              fill=WA_GREEN, outline=None)
        f_btn = fnt(FB, s(18))
        bb = draw.textbbox((0,0), "WhatsApp Us", font=f_btn)
        draw.text((bx + (bw-(bb[2]-bb[0]))//2, by+(bh-(bb[3]-bb[1]))//2),
                  "WhatsApp Us", font=f_btn, fill=WHITE)

    # ── Below hero: content blocks ───────────────────────────────────────────
    below_y = hero_bot
    draw.rectangle([0, below_y, w, h], fill=blend(BG, BG_MID, 0.5))

    f_blk = fnt(FR, s(15))
    f_blk_hd = fnt(FB, s(18))
    blocks = [
        ("48-Hour Delivery", "From wireframe to live site\nin 2 days."),
        ("Qatar-Based Team",  "We understand your market\nand your customers."),
        ("Full Ownership",    "Your domain, your hosting,\nyour code — always."),
    ]
    bblock_w = (w - s(80)) // 3
    for bi, (title, body) in enumerate(blocks):
        bx = s(40) + bi * (bblock_w + s(20))
        by = below_y + sv(32)
        rrect(draw, bx, by, bx+bblock_w, by+sv(140), r=sv(8),
              fill=blend(BG, BURGUNDY, 0.55))
        draw.text((bx+s(18), by+sv(16)), title, font=f_blk_hd, fill=ROSE)
        draw.text((bx+s(18), by+sv(46)), body,  font=f_blk,    fill=blend(BG_MID, SAND, 0.75))

    # ── Progress bar (bottom strip) ──────────────────────────────────────────
    bar_y = h - sv(10)
    draw.rectangle([0, bar_y, w, h], fill=blend(BG, BG_MID, 0.8))
    bar_fill = int(w * clamp(progress))
    if bar_fill > 0:
        draw.rectangle([0, bar_y, bar_fill, h],
                       fill=blend(BG_MID, ROSE, 0.85))

    return img


# ── Browser chrome wrapper ────────────────────────────────────────────────────
BROW_L, BROW_T = 160,  40     # browser outer top-left
BROW_W, BROW_H = 1600, 980    # browser outer size
CHROME_H       = 88           # chrome header height

def render_browser(website_img, chrome_alpha=1.0):
    """Wrap a website PIL image in a browser chrome. Returns full 1920×1080 frame."""
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Outer shadow
    for sh in range(12, 0, -3):
        sc = blend(BG, (40,20,32), sh/12*0.5)
        rrect(draw, BROW_L-sh, BROW_T-sh, BROW_L+BROW_W+sh, BROW_T+BROW_H+sh,
              r=16+sh, fill=sc)

    # Chrome header
    rrect(draw, BROW_L, BROW_T, BROW_L+BROW_W, BROW_T+CHROME_H, r=14,
          fill=blend(CHROME, WHITE, 0.02))

    # Traffic lights
    for ti, col in enumerate([(220,60,60),(220,180,60),(80,200,80)]):
        cx = BROW_L + 28 + ti*24
        cy = BROW_T + CHROME_H//2
        draw.ellipse([cx-7,cy-7,cx+7,cy+7], fill=col)

    # URL bar
    url_x, url_y = BROW_L+240, BROW_T+18
    url_w, url_h  = BROW_W-480, 52
    rrect(draw, url_x, url_y, url_x+url_w, url_y+url_h, r=26,
          fill=blend(CHROME, BG_MID, 0.6), outline=blend(BG_MID, ROSE, 0.25), lw=1)
    f_url = fnt(FM, 20)
    bb = draw.textbbox((0,0), "getwujood.com", font=f_url)
    draw.text((url_x + (url_w-(bb[2]-bb[0]))//2, url_y+14),
              "getwujood.com", font=f_url, fill=blend(BG_MID, SAND, 0.75))

    # Divider line under chrome
    draw.line([(BROW_L, BROW_T+CHROME_H), (BROW_L+BROW_W, BROW_T+CHROME_H)],
              fill=blend(BG_MID, ROSE, 0.2), width=1)

    # Paste website content
    content_y = BROW_T + CHROME_H
    content_h  = BROW_H - CHROME_H
    site_img   = website_img.resize((BROW_W, content_h), Image.LANCZOS)
    img.paste(site_img, (BROW_L, content_y))

    # Outer border
    rrect(draw, BROW_L, BROW_T, BROW_L+BROW_W, BROW_T+BROW_H, r=14,
          outline=blend(BG_MID, ROSE, 0.35*chrome_alpha), lw=2)

    return img


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 1 — Blank Canvas: typewriter + browser draws itself  (0–4 s)
# ═══════════════════════════════════════════════════════════════════════════════
URL_FULL   = "www.getwujood.com"
CURSOR_STR = "|"

def scene1(t):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    cx, cy = W//2, H//2

    # ── Typewriter ────────────────────────────────────────────────────────────
    f_type = fnt(FMB, 64)
    # Phase 1: "www."  t=0.2 → 1.4 (4 chars, 0.3s each)
    p1 = prog(t, 0.2, 1.4)
    chars_www  = int(4  * ease_out(p1, 2))
    # Phase 2: pause t=1.4 → 1.8
    # Phase 3: "getwujood.com"  t=1.8 → 3.4 (13 chars, ~0.12s each)
    p3 = prog(t, 1.8, 3.4)
    chars_url  = int(13 * ease_out(p3, 2))

    text_shown = "www."[:chars_www] + "getwujood.com"[:chars_url]

    # Cursor blinks at 1.1 Hz
    cursor_on = (t * 1.1 % 1.0) < 0.55 and t < 3.5

    f_www = fnt(FM, 64)
    f_url = fnt(FMB, 64)

    # Measure both parts
    bb_www = draw.textbbox((0,0), "www.", font=f_www)
    bb_url = draw.textbbox((0,0), "getwujood.com", font=f_url)
    www_w  = bb_www[2]-bb_www[0]
    url_w  = bb_url[2]-bb_url[0]
    total_w = www_w + url_w

    base_x = cx - total_w//2
    base_y = cy - 36

    # Draw typed characters
    if chars_www > 0:
        draw.text((base_x, base_y), "www."[:chars_www],
                  font=f_www, fill=blend(BG, SAND, 0.7))
    if chars_url > 0:
        draw.text((base_x + www_w, base_y), "getwujood.com"[:chars_url],
                  font=f_url, fill=blend(BG, ROSE, 0.95))

    # Cursor
    if cursor_on:
        cur_x = base_x
        if chars_www > 0:
            bb = draw.textbbox((0,0), "www."[:chars_www], font=f_www)
            cur_x = base_x + (bb[2]-bb[0])
        if chars_url > 0:
            bb = draw.textbbox((0,0), "getwujood.com"[:chars_url], font=f_url)
            cur_x = base_x + www_w + (bb[2]-bb[0])
        draw.line([(cur_x+4, base_y+4), (cur_x+4, base_y+64)],
                  fill=ROSE, width=3)

    # ── Browser outline draws itself ──────────────────────────────────────────
    br_p = prog(t, 2.8, 3.7)
    if br_p > 0:
        # Animate border draw: clockwise from top-left
        bx0, by0 = BROW_L, BROW_T
        bx1, by1 = BROW_L+BROW_W, BROW_T+BROW_H
        perimeter = 2*(BROW_W + BROW_H)
        drawn = ease_out(br_p) * perimeter

        col = blend(BG_MID, ROSE, ease_out(br_p) * 0.8)
        segments = [
            ((bx0, by0), (bx1, by0), BROW_W),           # top
            ((bx1, by0), (bx1, by1), BROW_H),           # right
            ((bx1, by1), (bx0, by1), BROW_W),           # bottom
            ((bx0, by1), (bx0, by0), BROW_H),           # left
        ]
        remaining = drawn
        for (sx,sy),(ex,ey),seg_len in segments:
            if remaining <= 0: break
            frac = clamp(remaining / seg_len)
            mx = sx + (ex-sx)*frac
            my = sy + (ey-sy)*frac
            draw.line([(sx,sy),(int(mx),int(my))], fill=col, width=3)
            remaining -= seg_len

        # Chrome area top
        if br_p > 0.5:
            ca = ease_out(prog(t, 3.0, 3.7))
            chrome_col = blend(BG, CHROME, ca)
            rrect(draw, bx0+2, by0+2, bx1-2, by0+CHROME_H, r=12,
                  fill=chrome_col)
            # URL in the box
            f_u = fnt(FM, 22)
            uc = blend(BG_MID, SAND, ca * 0.6)
            text_cx(draw, "getwujood.com", f_u, by0+30, uc)

    # ── Cinematic flash at cut ────────────────────────────────────────────────
    flash_p = prog(t, 3.65, 4.0)
    if flash_p > 0:
        img = flash(img, ease_in_out(flash_p) * 0.9, SAND)

    img = fade_in(img, prog(t, 0, 0.2))
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 2 — The Website Builds Itself  (4–12 s, local t 0–8)
# ═══════════════════════════════════════════════════════════════════════════════
HL_FULL = "Your Business. Online. In 48 Hours."
HL_LEN  = len(HL_FULL)

def scene2(t):
    # Fade in from the flash
    fade_from_flash = 1 - ease_out(prog(t, 0, 0.4))

    # How many headline chars to show (types t=1.5-4.5, 36 chars over 3s)
    hl_chars = int(HL_LEN * ease_out(prog(t, 1.5, 4.5), 2))

    # Progress bar (fills t=4.0-7.5)
    bar_prog = ease_in_out(prog(t, 4.0, 7.5))

    # WhatsApp button appears (t=4.0-5.0)
    wa_visible = hl_chars >= HL_LEN

    # Render website
    site = render_website(
        BROW_W, BROW_H - CHROME_H,
        headline_chars=hl_chars,
        progress=bar_prog,
        show_wa=wa_visible,
    )
    img = render_browser(site)
    draw = ImageDraw.Draw(img)

    # Nav bar slides in (t=0.3-1.2)
    nav_slide = ease_out(prog(t, 0.3, 1.2))
    if nav_slide < 1.0:
        # Cover part of nav with BG to simulate slide-down
        cover_h = int((CHROME_H + 72) * (1 - nav_slide))
        if cover_h > 0:
            draw.rectangle([BROW_L, BROW_T+CHROME_H,
                            BROW_L+BROW_W, BROW_T+CHROME_H+cover_h],
                           fill=BG)

    # Hero fades in (t=0.8-1.8)
    hero_fade = ease_out(prog(t, 0.8, 1.8))
    if hero_fade < 1.0:
        cover_y = BROW_T + CHROME_H + 72  # below nav
        cover_h = int((BROW_H - CHROME_H - 72) * (1 - hero_fade))
        if cover_h > 0:
            draw.rectangle([BROW_L, cover_y, BROW_L+BROW_W, cover_y+cover_h],
                           fill=BG_MID)

    # Rose glow on hero area (visible once hero is in)
    if hero_fade > 0:
        hero_cx = W // 2
        hero_cy = BROW_T + CHROME_H + 250
        glow(img, hero_cx, hero_cy, 500, ROSE, strength=0.18*hero_fade, squeeze=2.0)
        draw = ImageDraw.Draw(img)

    # WhatsApp button pulse when it appears
    wa_p = ease_out(prog(t, 4.0, 5.0))
    if wa_p > 0 and wa_p < 1:
        # Extra glow ring around the WA button
        btn_x = BROW_L + int(60 * BROW_W/1400) + int(120 * BROW_W/1400)
        btn_y = BROW_T + CHROME_H + int(282 * (BROW_H-CHROME_H)/820) + 26
        for ring in range(3):
            rr = int((50 + ring*30) * wa_p)
            ra = (1-wa_p) * (0.5 - ring*0.12)
            if ra > 0:
                draw.ellipse([btn_x-rr, btn_y-rr, btn_x+rr, btn_y+rr],
                             outline=blend(BG, WA_GREEN, ra), width=2)

    # Progress bar label
    if bar_prog > 0.05:
        pct = int(bar_prog * 100)
        f_pct = fnt(FB, 16)
        draw.text((BROW_L + BROW_W - 60, BROW_T + BROW_H - 20),
                  f"{pct}%", font=f_pct,
                  fill=blend(BG_MID, ROSE, min(1.0, bar_prog*3)))

    # Flash-out at end
    flash_out = prog(t, 7.5, 8.0)
    if flash_out > 0:
        img = flash(img, ease_in_out(flash_out) * 0.75, SAND)

    # Recover from Scene 1 flash
    if fade_from_flash > 0:
        img = flash(img, fade_from_flash * 0.85, SAND)

    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 3 — The Phone Receives It  (12–20 s, local t 0–8)
# ═══════════════════════════════════════════════════════════════════════════════
PHONE_W, PHONE_H = 340, 680
PHONE_CX, PHONE_CY = W//2, H//2 + 10

def draw_phone_shell(draw, cx, cy, pw, ph, col_border, fill_col):
    x0, y0 = cx - pw//2, cy - ph//2
    x1, y1 = cx + pw//2, cy + ph//2
    rrect(draw, x0, y0, x1, y1, r=44, fill=fill_col, outline=col_border, lw=3)
    # Notch
    nw = 80
    rrect(draw, cx-nw//2, y0-2, cx+nw//2, y0+22, r=10, fill=BG)
    # Home bar
    draw.rounded_rectangle([cx-40, y1-18, cx+40, y1-8], radius=4,
                            fill=blend(BG_MID, SAND, 0.5))
    return x0, y0, x1, y1

def draw_phone_website(draw, img, sx, sy, sw, sh, tap_p=0, notif_p=0):
    """Draw website content inside phone screen."""
    site = render_website(sw, sh,
                          headline_chars=999, progress=1.0, show_wa=True)
    img.paste(site, (sx, sy))
    draw = ImageDraw.Draw(img)

    # Tap ripple on WhatsApp button
    if tap_p > 0:
        # WA button approx position inside phone content
        btn_cx = sx + int(sw * 0.22)
        btn_cy = sy + int(sh * 0.47)
        for ri in range(3):
            rr  = int((20 + ri*18) * tap_p)
            ra  = (1 - tap_p) * (0.7 - ri*0.2)
            if ra > 0:
                draw.ellipse([btn_cx-rr, btn_cy-rr, btn_cx+rr, btn_cy+rr],
                             outline=blend(BG, WA_GREEN, ra), width=2)

    # Notification card
    if notif_p > 0:
        notif_slide = ease_out(notif_p)
        nw_n, nh_n = sw - 20, 60
        nx = sx + 10
        ny = int(sy + nh_n * (notif_slide - 1))  # slides down from above screen
        ny = max(sy + 4, ny)
        rrect(draw, nx, ny, nx+nw_n, ny+nh_n, r=12,
              fill=blend(BG_WARM, BG_MID, 0.9),
              outline=blend(BG_MID, ROSE, 0.6), lw=1)
        # Bell circle icon
        draw.ellipse([nx+8, ny+12, nx+36, ny+48],
                     fill=blend(BG_MID, ROSE, 0.8))
        draw.text((nx+44, ny+8), "New customer inquiry!",
                  font=fnt(FB, max(8, sw//22)), fill=SAND)
        draw.text((nx+44, ny+28), "via getwujood.com",
                  font=fnt(FR, max(6, sw//28)), fill=blend(BG_MID, CLAY, 0.85))
    return draw


def scene3(t):
    img, draw = new_frame(BG)
    cx_ph, cy_ph = PHONE_CX, PHONE_CY

    # ── Phase A: browser pull-back (t=0-1.5) ─────────────────────────────────
    pullback = ease_in_out(prog(t, 0.0, 1.5))
    fly_in   = ease_out(prog(t, 0.5, 2.2), 3)     # phone slides in

    # Browser scale + fade
    browser_alpha = 1 - ease_out(prog(t, 0.8, 2.2))
    if browser_alpha > 0:
        scale = 1.0 - 0.35 * pullback
        site  = render_website(BROW_W, BROW_H-CHROME_H,
                                headline_chars=999, progress=1.0)
        full  = render_browser(site)
        # Scale down
        nw2 = int(W * scale)
        nh2 = int(H * scale)
        scaled = full.resize((nw2, nh2), Image.LANCZOS)
        px2 = (W - nw2) // 2
        py2 = (H - nh2) // 2
        # Darken the scaled version slightly
        overlay_dark = Image.new("RGB", (nw2, nh2), BG)
        scaled = Image.blend(scaled, overlay_dark, 1 - browser_alpha)
        img.paste(scaled, (px2, py2))
        draw = ImageDraw.Draw(img)

    # ── Phase B: Phone slides in from right ──────────────────────────────────
    phone_x_start = W + PHONE_W
    phone_cx_cur  = int(phone_x_start + (cx_ph - phone_x_start) * fly_in)
    phone_cy_cur  = cy_ph

    if fly_in > 0:
        pw, ph = PHONE_W, PHONE_H

        # Phone glow
        phone_vis = ease_out(prog(t, 1.0, 2.5))
        if phone_vis > 0:
            glow(img, phone_cx_cur, phone_cy_cur,
                 400, ROSE, strength=0.28*phone_vis, squeeze=1.4)

        draw = ImageDraw.Draw(img)
        shell_col = blend(BG_MID, BURGUNDY, fly_in * 0.95)
        x0, y0, x1, y1 = draw_phone_shell(
            draw, phone_cx_cur, phone_cy_cur, pw, ph,
            blend(BG_MID, ROSE, fly_in), shell_col)

        # Screen
        sx, sy   = x0+16, y0+28
        sw2, sh2 = pw-32, ph-54
        rrect(draw, sx, sy, sx+sw2, sy+sh2, r=10,
              fill=blend(BG_MID, blend(BURGUNDY, ROSE, 0.05), 0.7))

        # Website appears inside phone screen (t=2.2+)
        site_vis = ease_out(prog(t, 2.2, 3.2))
        if site_vis > 0 and sw2 > 20 and sh2 > 20:
            # Tap effect (t=4.0-5.5)
            tap_p   = ease_out(prog(t, 4.0, 5.5))
            # Notification (t=5.5-8.0)
            notif_p = ease_out(prog(t, 5.5, 6.8))
            draw = draw_phone_website(draw, img, sx, sy, sw2, sh2,
                                      tap_p=tap_p, notif_p=notif_p)
            draw = ImageDraw.Draw(img)

            # Darken site to apply fade-in
            if site_vis < 1:
                overlay = Image.new("RGB", (sw2, sh2), blend(BG_MID, BURGUNDY, 0.5))
                img.paste(Image.blend(overlay,
                                       img.crop((sx, sy, sx+sw2, sy+sh2)),
                                       site_vis),
                          (sx, sy))

        # Rose screen glow (t=5.5+)
        rose_glow_p = ease_out(prog(t, 5.0, 6.5))
        if rose_glow_p > 0:
            glow(img, phone_cx_cur, phone_cy_cur, 500,
                 ROSE, strength=0.40*rose_glow_p, squeeze=1.3)
            draw = ImageDraw.Draw(img)

    img = fade_in(img, prog(t, 0, 0.25))
    img = fade_out(img, prog(t, 7.5, 8.0))
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 4 — The Results  (20–26 s, local t 0–6)
# ═══════════════════════════════════════════════════════════════════════════════
STATS_S4 = [
    ("48",          "h",        "Delivery"),
    ("2,000",       " QAR",     "Full Website"),
    ("+974 7727 7292", "",      "Call or WhatsApp"),
]

def count_up(val, p):
    p = clamp(p)
    try:
        n = int(val.replace(",", ""))
        result = int(n * ease_out(p, 2))
        if "," in val:
            return f"{result:,}"
        return str(result)
    except ValueError:
        # Phone number — typewriter
        chars = int(len(val) * ease_out(p, 2))
        return val[:chars]

def scene4(t):
    img, draw = new_frame(BG)

    fill_gradient(img,
                  blend(BG, BG_WARM, 0.9),
                  blend(BG, BG_MID,  0.5))
    bg_glow = ease_out(prog(t, 0, 2.0))
    if bg_glow > 0:
        glow(img, W//2, H//2, 700, ROSE, strength=0.15*bg_glow, squeeze=1.3)
    draw = ImageDraw.Draw(img)

    # Heading
    hdr_p = ease_out(prog(t, 0.3, 1.4))
    if hdr_p > 0:
        text_cx(draw, "THE NUMBERS",
                fnt(FR, 24), 78, fade(CLAY, hdr_p*0.8))
        text_cx(draw, "Results That Speak",
                fnt(FB, 52), 110, fade(SAND, hdr_p))
        rl = int(300 * hdr_p)
        draw.rectangle([W//2-rl, 176, W//2+rl, 180], fill=fade(CLAY, hdr_p))

    # Three stat columns
    col_w    = W // 3
    stagger  = 0.35

    for idx, (val, unit, label) in enumerate(STATS_S4):
        cx_col = col_w//2 + idx * col_w
        cp     = ease_out(prog(t, 0.8 + idx*stagger, 2.2 + idx*stagger))
        num_p  = prog(t,  0.8 + idx*stagger, 4.5)
        if cp <= 0:
            continue

        # Column separator (not for first)
        if idx > 0:
            sep_h = int(300 * cp)
            draw.rectangle([cx_col - col_w//2 - 1, H//2 - sep_h//2,
                            cx_col - col_w//2 + 1, H//2 + sep_h//2],
                           fill=fade(BURGUNDY, cp*0.6))

        # Big number / phone typewriter
        num_str = count_up(val, num_p)
        is_phone = idx == 2
        f_num    = fnt(FM if is_phone else FB, 92 if not is_phone else 62)
        num_col  = fade(ROSE if is_phone else SAND, cp)
        text_cx(draw, num_str + unit, f_num, H//2 - 80, num_col, xc=cx_col)

        # Label
        if cp > 0.2:
            f_lbl = fnt(FR, 26)
            text_cx(draw, label, f_lbl,
                    H//2 + 44, fade(CLAY, cp*0.9), xc=cx_col)

        # Animated rose underline (t=3.0+)
        line_p = ease_out(prog(t, 3.0 + idx*0.25, 4.2 + idx*0.2))
        if line_p > 0:
            lw_half = int(120 * line_p)
            ly      = H//2 + 88
            draw.rectangle([cx_col - lw_half, ly, cx_col + lw_half, ly+3],
                           fill=fade(ROSE, line_p*0.85))
            # Small diamond at endpoints
            if line_p > 0.7:
                diamond(draw, cx_col - lw_half, ly+1, 5, fade(ROSE, line_p*0.7))
                diamond(draw, cx_col + lw_half, ly+1, 5, fade(ROSE, line_p*0.7))

    img = fade_in(img, prog(t, 0, 0.3))
    img = fade_out(img, prog(t, 5.7, 6.0))
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# SCENE 5 — WUJOOD Assembles from Particles  (26–30 s, local t 0–4)
# ═══════════════════════════════════════════════════════════════════════════════
def scene5(t):
    img, draw = new_frame(BG)

    fill_gradient(img,
                  blend(BG, BG_WARM, ease_out(prog(t, 0, 2))),
                  BG)

    cx, cy = W//2, H//2 - 60

    # ── Particle convergence → WUJOOD ────────────────────────────────────────
    p_conv  = ease_out(prog(t, 0.1, 2.2), 3)
    p_glow  = ease_out(prog(t, 0.5, 2.5))

    # Background glow
    if p_glow > 0:
        glow(img, cx, cy, int(600 * p_glow), ROSE,
             strength=0.22*p_glow, squeeze=1.5)
        glow(img, cx, cy, int(300 * p_glow), CLAY,
             strength=0.15*p_glow, squeeze=1.4)
    draw = ImageDraw.Draw(img)

    # Draw particles converging to letter positions
    if p_conv > 0:
        cur_x = PSX + (PTX - PSX) * p_conv
        cur_y = PSY + (PTY - PSY) * p_conv

        # Colour: early = dim rose/clay, late = sand/rose
        for i in range(len(cur_x)):
            px, py = int(cur_x[i]), int(cur_y[i])
            if 0 <= px < W and 0 <= py < H:
                brightness = 0.3 + 0.7 * p_conv
                col = (SAND if i%3==0 else ROSE if i%3==1 else CLAY)
                c   = fade(col, brightness)
                r   = max(1, int(2.5 * (1 - p_conv*0.4)))
                draw.ellipse([px-r, py-r, px+r, py+r], fill=c)

    # When particles are ~80% converged, draw clean text on top
    if p_conv > 0.78:
        text_alpha = ease_out(prog(p_conv, 0.78, 1.0), 2)
        f_logo = fnt(FB, 230)
        bb = draw.textbbox((0,0), "WUJOOD", font=f_logo)
        lx = cx - (bb[2]-bb[0])//2
        ly = cy - (bb[3]-bb[1])//2

        # Slight shadow
        draw.text((lx+4, ly+4), "WUJOOD", font=f_logo,
                  fill=fade(BURGUNDY, text_alpha*0.5))
        # Main text
        main_col = blend(ROSE, SAND, text_alpha)
        draw.text((lx, ly), "WUJOOD", font=f_logo,
                  fill=fade(main_col, text_alpha))

    # ── Tagline ───────────────────────────────────────────────────────────────
    tag_p = ease_out(prog(t, 2.0, 3.1))
    if tag_p > 0:
        tagline = "Your business deserves to exist online."
        f_tl = fnt(FR, 38)
        text_cx(draw, tagline, f_tl, cy + 155, fade(SAND, tag_p))

    # ── Horizontal rule ───────────────────────────────────────────────────────
    hr_p = ease_out(prog(t, 2.3, 3.2))
    if hr_p > 0:
        rl = int(400 * hr_p)
        draw.rectangle([cx-rl, cy+206, cx+rl, cy+210],
                       fill=fade(CLAY, hr_p * 0.7))

    # ── URL glow ──────────────────────────────────────────────────────────────
    url_p = ease_out(prog(t, 2.6, 3.5))
    pulse = (math.sin(t * 3.5) + 1) / 2
    if url_p > 0:
        glow(img, cx, cy+258, int(240 + 40*pulse), ROSE,
             strength=0.45*url_p*(0.6+0.4*pulse), squeeze=3.5)
        draw = ImageDraw.Draw(img)

        # URL pill
        pw2, ph2 = 520, 72
        px2, py2 = cx-pw2//2, cy+224
        for bw in range(8, 0, -2):
            ba = url_p*(0.5+0.4*pulse)*(1-bw/10)
            rrect(draw, px2-bw, py2-bw, px2+pw2+bw, py2+ph2+bw,
                  r=36+bw, outline=fade(ROSE, ba), lw=1)
        rrect(draw, px2, py2, px2+pw2, py2+ph2, r=36,
              fill=blend(BG_WARM, BURGUNDY, url_p*0.9),
              outline=fade(ROSE, url_p), lw=3)
        text_cx(draw, "getwujood.com", fnt(FMB, 38), py2+17, fade(SAND, url_p))

    img = fade_in(img, prog(t, 0, 0.25))
    img = fade_out(img, prog(t, 3.5, 4.0))
    return np.array(img)


# ═══════════════════════════════════════════════════════════════════════════════
# Assemble + export
# ═══════════════════════════════════════════════════════════════════════════════
SCENES = [
    (scene1, 4.0),
    (scene2, 8.0),
    (scene3, 8.0),
    (scene4, 6.0),
    (scene5, 4.0),
]

if __name__ == "__main__":
    base      = os.path.dirname(os.path.abspath(__file__))
    silent    = os.path.join(base, "wujood_v3_silent.mp4")
    final     = os.path.join(base, "wujood_final_v3.mp4")
    music_wav = os.path.join(base, "music_v3.wav")

    print("Building Wujood — 'A Website Coming to Life' v3")
    clips = [VideoClip(lambda t, fn=fn: fn(t), duration=dur).with_fps(FPS)
             for fn, dur in SCENES]
    total = sum(d for _, d in SCENES)
    print(f"  5 scenes | {total}s | {W}×{H} @ {FPS}fps")

    concatenate_videoclips(clips).write_videofile(
        silent, fps=FPS, codec="libx264", audio=False,
        preset="medium", ffmpeg_params=["-crf","15","-pix_fmt","yuv420p"],
        logger="bar",
    )
    print(f"✓ Silent → {silent}")

    # Mix music
    if os.path.exists(music_wav):
        import subprocess
        cmd = [
            "ffmpeg", "-y",
            "-i", silent,
            "-i", music_wav,
            "-filter_complex",
            f"[1:a]afade=t=in:d=1,afade=t=out:st={total-3}:d=3,volume=0.30[a]",
            "-map","0:v","-map","[a]",
            "-c:v","copy","-c:a","aac","-shortest",
            final,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            print(f"✓ Final with music → {final}")
        else:
            print("FFmpeg mix error:", r.stderr[-300:])
            import shutil; shutil.copy(silent, final)
    else:
        import shutil; shutil.copy(silent, final)
        print("No music file found — copied silent version as final")
