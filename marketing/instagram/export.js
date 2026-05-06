// Zizo Circle — Instagram MP4 export script
// Records all 4 stories (EN + AR) as 5-second MP4 files at native 1080×1920.
//
// Setup (run once):
//   cd marketing/instagram
//   npm init -y
//   npm install puppeteer puppeteer-screen-recorder
//
// Then in another terminal start the dev server from marketing/:
//   cd marketing && python3 -m http.server 8080
//
// Run the export:
//   node export.js
//
// Output: marketing/instagram/output/story-{en,ar}-{1..4}.mp4
//
// Each MP4 plays the staggered-reveal animation (logo → eyebrow → headline →
// sub → CTA → swipe-up arrow), then loops the bouncing arrow until time runs
// out — perfect for re-uploading as Instagram Story video.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const OUT_DIR = path.join(__dirname, 'output');
const DURATION_MS = 5000;

const recorderConfig = {
  followNewTab: false,
  fps: 30,
  videoFrame: { width: 1080, height: 1920 },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'medium',
  videoBitrate: 8000,
  aspectRatio: '9:16',
};

const targets = [
  { lang: 'en', path: '/instagram/stories.html', frames: 4 },
  { lang: 'ar', path: '/instagram/ar/stories.html', frames: 4 },
];

async function record(page, url, outputPath) {
  const recorder = new PuppeteerScreenRecorder(page, recorderConfig);
  await recorder.start(outputPath);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, DURATION_MS));
  await recorder.stop();
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1080, height: 1920 },
  });

  for (const { lang, path: storyPath, frames } of targets) {
    for (let i = 1; i <= frames; i++) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
      const url = `${BASE_URL}${storyPath}?solo=${i}&animate=1`;
      const out = path.join(OUT_DIR, `story-${lang}-${i}.mp4`);
      console.log(`▶ Recording ${lang} story ${i} → ${out}`);
      await record(page, url, out);
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n✓ Done. ${OUT_DIR}`);
})();
