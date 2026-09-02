const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const sourcePath = process.argv[2];
const publicDir = path.join(__dirname, '../public');

async function createIcon(size, name) {
  const img = await loadImage(sourcePath);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw scaled
  ctx.drawImage(img, 0, 0, size, size);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, name), buffer);
  console.log(`Created ${name}`);
}

async function run() {
  await createIcon(192, 'icon-192.png');
  await createIcon(512, 'icon-512.png');
  await createIcon(180, 'apple-icon.png'); // Apple standard
}

run().catch(console.error);
