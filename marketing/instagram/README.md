# Instagram Graphics — Export Guide

20 ready-to-screenshot Instagram graphics for the Lusail launch:

| | English | Arabic (RTL) |
|---|---|---|
| Feed posts (1080×1350) | `posts.html` — 6 frames | `ar/posts.html` — 6 frames |
| Stories (1080×1920) | `stories.html` — 4 frames | `ar/stories.html` — 4 frames |

Plus a standalone confirmation page: `../thank-you.html` (bilingual, with `?lang=ar` switch).
And an animated MP4 export script for stories: `export.js`.

All match the dark brand theme from the app and the captions in `marketing/social-captions.md`.

---

## Frame index

### Feed posts (`posts.html` / `ar/posts.html`)
| # | Frame | Pairs with caption |
|---|---|---|
| 1 | The hook ("Group chat is just your mum?") | Day 1 |
| 2 | How it works — 3 steps | Day 2 |
| 3 | Lusail venues showcase | Day 3 |
| 4 | The expat truth (quote) | Day 4 |
| 5 | QAR 50 founding offer | Day 5 |
| 6 | Welcome / sign-up confirmation | Post-signup share |

### Stories (`stories.html` / `ar/stories.html`)
| # | Frame | Use for |
|---|---|---|
| 1 | "LUSAIL. SOON." teaser | Pre-launch hype |
| 2 | QAR 50 founding offer | Waitlist driver |
| 3 | 3-step how-it-works | Always-on highlight |
| 4 | Welcome / sign-up confirmation | User-generated repost asset |

---

## How to export to PNG (no design tool needed)

### Method 1 — Chrome DevTools (recommended, free, pixel-perfect)
1. Serve the folder locally:
   ```bash
   cd marketing && python3 -m http.server 8080
   ```
2. Open **one frame at full size** in Chrome:
   - Post 1: `http://localhost:8080/instagram/posts.html?solo=1`
   - Post 2: `?solo=2` … through `?solo=5`
   - Story 1: `http://localhost:8080/instagram/stories.html?solo=1` … through `?solo=3`
3. Open DevTools (`F12` or `Cmd+Opt+I`).
4. Open the command menu: `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win).
5. Type **"Capture full size screenshot"** → Enter.
6. PNG downloads at exact 1080×1350 (posts) or 1080×1920 (stories).

### Method 2 — Right-click element
1. Open any frame URL with `?solo=N`.
2. DevTools → Elements panel → right-click the `<div class="frame">` element.
3. Choose **"Capture node screenshot"**.
4. PNG saves at exact frame dimensions.

### Method 3 — Headless screenshot (batch export, optional)
If you have Node + Puppeteer installed:
```js
// save as export.js, then `node export.js`
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // posts
  await page.setViewport({ width: 1080, height: 1350 });
  for (let i = 1; i <= 5; i++) {
    await page.goto(`http://localhost:8080/instagram/posts.html?solo=${i}`);
    await page.screenshot({ path: `post-${i}.png` });
  }
  // stories
  await page.setViewport({ width: 1080, height: 1920 });
  for (let i = 1; i <= 3; i++) {
    await page.goto(`http://localhost:8080/instagram/stories.html?solo=${i}`);
    await page.screenshot({ path: `story-${i}.png` });
  }
  await browser.close();
})();
```

---

---

## Animated MP4 stories (auto-export)

The 4 stories include a built-in staggered reveal animation (logo → eyebrow → headline → sub → CTA → bouncing swipe-up). Trigger it with `?animate=1`, e.g. `stories.html?solo=2&animate=1`.

To batch-export all 8 stories (EN × 4 + AR × 4) as 1080×1920 MP4 files:

```bash
# 1. Install dependencies (one-time)
cd marketing/instagram
npm init -y
npm install puppeteer puppeteer-screen-recorder

# 2. Start the dev server in another terminal
cd marketing && python3 -m http.server 8080

# 3. Run the export
node export.js
```

Output lands in `marketing/instagram/output/story-{en,ar}-{1..4}.mp4`. Each is 5 seconds long — re-upload directly to Instagram Stories or Reels.

> Requires `ffmpeg` installed (puppeteer-screen-recorder uses it under the hood). On macOS: `brew install ffmpeg`. On Ubuntu: `sudo apt install ffmpeg`.

---

## Tips
- Upload PNGs at native resolution. Instagram will compress, but starting at 1080px keeps the most fidelity.
- For the **carousel** version of Post 3 (one venue per slide), open `?solo=3`, then take 4 separate screenshots — or duplicate the frame and remove 3 of the 4 venue rows each time.
- Stories with the swipe-up arrow are aimed at the **link sticker** placement — it overlays in roughly the bottom 1/6, so we kept it clear.
- Post a static graphic + the caption from `social-captions.md` together — captions and creative are designed to pair 1-to-1.
