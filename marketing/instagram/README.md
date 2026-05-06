# Instagram Graphics — Export Guide

8 ready-to-screenshot Instagram graphics for the Lusail launch:
- **5 feed posts** (1080×1350) → `posts.html`
- **3 stories** (1080×1920) → `stories.html`

All match the dark brand theme from the app and the captions in `marketing/social-captions.md`.

---

## Frame index

### Feed posts (`posts.html`)
| # | Frame | Pairs with caption |
|---|---|---|
| 1 | The hook ("Group chat is just your mum?") | Day 1 |
| 2 | How it works — 3 steps | Day 2 |
| 3 | Lusail venues showcase | Day 3 |
| 4 | The expat truth (quote) | Day 4 |
| 5 | QAR 50 founding offer | Day 5 |

### Stories (`stories.html`)
| # | Frame | Use for |
|---|---|---|
| 1 | "LUSAIL. SOON." teaser | Pre-launch hype |
| 2 | QAR 50 founding offer | Waitlist driver |
| 3 | 3-step how-it-works | Always-on highlight |

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

## Tips
- Upload PNGs at native resolution. Instagram will compress, but starting at 1080px keeps the most fidelity.
- For the **carousel** version of Post 3 (one venue per slide), open `?solo=3`, then take 4 separate screenshots — or duplicate the frame and remove 3 of the 4 venue rows each time.
- Stories with the swipe-up arrow are aimed at the **link sticker** placement — it overlays in roughly the bottom 1/6, so we kept it clear.
- Post a static graphic + the caption from `social-captions.md` together — captions and creative are designed to pair 1-to-1.
