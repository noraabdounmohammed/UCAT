// Quick script to create placeholder PNG icons for iOS PWA
// Run with: node scripts/create-placeholder-icons.js

const fs = require('fs');
const path = require('path');

// Create a simple SVG that we'll convert to PNG using canvas
const createSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect fill="#1c1917" width="${size}" height="${size}"/>
  <text x="50%" y="50%" font-size="${size * 0.6}" text-anchor="middle" dominant-baseline="middle" fill="#fafaf9" font-family="Arial, sans-serif" font-weight="bold">M</text>
</svg>
`.trim();

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'favicon-32x32.png', size: 32 }
];

console.log('📱 Creating placeholder PNG icons for iOS PWA...\n');

// Create SVG files temporarily
sizes.forEach(({ name, size }) => {
  const svgContent = createSVG(size);
  const svgPath = path.join(__dirname, '..', 'public', name.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Created SVG: ${name.replace('.png', '.svg')} (${size}x${size})`);
});

console.log('\n⚠️  Note: These are SVG files. iOS needs PNG files.');
console.log('📝 To convert to PNG:');
console.log('   1. Open scripts/generate-ios-pwa-icons.html in browser');
console.log('   2. Click "Generate All Icons"');
console.log('   3. Download each PNG to /public folder');
console.log('\n🚀 Or use an online converter:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - https://www.aconvert.com/image/svg-to-png/');
