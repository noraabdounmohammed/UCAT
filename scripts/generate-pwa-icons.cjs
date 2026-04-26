const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

console.log('🎨 Generating PWA icons for iOS compatibility...\n');

const icons = [
  { name: 'apple-touch-icon.png', size: 180, desc: 'iOS Home Screen' },
  { name: 'pwa-192x192.png', size: 192, desc: 'PWA Manifest Small' },
  { name: 'pwa-512x512.png', size: 512, desc: 'PWA Manifest Large' },
  { name: 'favicon-32x32.png', size: 32, desc: 'Browser Favicon' }
];

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

icons.forEach(({ name, size, desc }) => {
  console.log(`📱 Creating ${name} (${size}x${size}) - ${desc}...`);
  
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Dark background (stone-900: #1c1917)
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, size, size);
  
  // White "M" letter (stone-50: #fafaf9)
  ctx.fillStyle = '#fafaf9';
  ctx.font = `bold ${size * 0.6}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size / 2, size / 2);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(publicDir, name);
  fs.writeFileSync(filePath, buffer);
  
  console.log(`   ✅ Saved: ${filePath}`);
});

console.log('\n🎉 All icons generated successfully!');
console.log('\n📁 Icons saved to: /public');
console.log('   - apple-touch-icon.png (180x180)');
console.log('   - pwa-192x192.png (192x192)');
console.log('   - pwa-512x512.png (512x512)');
console.log('   - favicon-32x32.png (32x32)');
console.log('\n🚀 Next steps:');
console.log('   1. npm run build');
console.log('   2. netlify deploy --prod');
console.log('   3. Test on iOS Safari!');
