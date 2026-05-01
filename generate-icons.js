const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsPath = path.join(__dirname, 'assets', 'images');

// Main icon SVG — Z inside circle, purple rounded square
const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="224" fill="#7B5CF6"/>
  <circle cx="512" cy="512" r="320" fill="#8B6CF8"/>
  <circle cx="512" cy="512" r="320" fill="none" stroke="#3BF5C8" stroke-width="12" opacity="0.7"/>
  <circle cx="512" cy="512" r="384" fill="none" stroke="white" stroke-width="8" opacity="0.15"/>
  <path d="M300 360 L724 360 L300 664 L724 664" fill="none" stroke="white" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="820" cy="204" r="60" fill="#3BF5C8"/>
</svg>`;

// Foreground (same as icon but no rounded rect — Android uses its own mask)
const foregroundSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#7B5CF6"/>
  <circle cx="512" cy="512" r="320" fill="#8B6CF8"/>
  <circle cx="512" cy="512" r="320" fill="none" stroke="#3BF5C8" stroke-width="12" opacity="0.7"/>
  <path d="M300 360 L724 360 L300 664 L724 664" fill="none" stroke="white" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="820" cy="204" r="60" fill="#3BF5C8"/>
</svg>`;

// Background — solid purple
const backgroundSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#7B5CF6"/>
</svg>`;

// Monochrome — white Z on black
const monochromeSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="black"/>
  <circle cx="512" cy="512" r="320" fill="none" stroke="white" stroke-width="12" opacity="0.6"/>
  <path d="M300 360 L724 360 L300 664 L724 664" fill="none" stroke="white" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Favicon — small Z only
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#7B5CF6"/>
  <circle cx="32" cy="32" r="20" fill="#8B6CF8"/>
  <path d="M18 22 L46 22 L18 42 L46 42" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Splash icon
const splashSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#7B5CF6"/>
  <circle cx="100" cy="100" r="62" fill="#8B6CF8"/>
  <circle cx="100" cy="100" r="62" fill="none" stroke="#3BF5C8" stroke-width="2.5" opacity="0.7"/>
  <path d="M58 70 L142 70 L58 130 L142 130" fill="none" stroke="white" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="160" cy="40" r="12" fill="#3BF5C8"/>
</svg>`;

async function generate() {
  console.log('🎨 Generating Zizo Circle icons...\n');

  const icons = [
    { svg: iconSVG, file: 'icon.png', size: 1024 },
    { svg: foregroundSVG, file: 'android-icon-foreground.png', size: 1024 },
    { svg: backgroundSVG, file: 'android-icon-background.png', size: 1024 },
    { svg: monochromeSVG, file: 'android-icon-monochrome.png', size: 1024 },
    { svg: faviconSVG, file: 'favicon.png', size: 64 },
    { svg: splashSVG, file: 'splash-icon.png', size: 200 },
  ];

  for (const icon of icons) {
    const outputPath = path.join(assetsPath, icon.file);
    await sharp(Buffer.from(icon.svg))
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${icon.file} (${icon.size}x${icon.size})`);
  }

  console.log('\n🚀 All icons generated! Restart Expo to see the new icon.');
}

generate().catch(console.error);
