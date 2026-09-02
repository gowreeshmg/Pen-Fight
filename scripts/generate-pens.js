const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputDir = path.join(__dirname, '../public/pens');

async function createTintedPen(sourceName, destName, tintFunc) {
  const sourcePath = path.join(inputDir, sourceName);
  const destPath = path.join(inputDir, destName);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source ${sourcePath} not found!`);
    return;
  }

  const img = await loadImage(sourcePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] > 0) { // If not transparent
      const { r, g, b } = tintFunc(data[i], data[i+1], data[i+2]);
      data[i] = r;
      data[i+1] = g;
      data[i+2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(destPath, buffer);
  console.log(`Created ${destName}`);
}

async function run() {
  // Pinpoint: Make it completely black/dark grey (from butterflow)
  await createTintedPen('butterflow.png', 'pinpoint.png', (r, g, b) => {
    const avg = (r + g + b) / 3;
    return { r: avg * 0.3, g: avg * 0.3, b: avg * 0.3 };
  });

  // Trimax: Make it blue (from gripper)
  await createTintedPen('gripper.png', 'trimax.png', (r, g, b) => {
    // Gripper is mostly dark/red. Let's make it bright blue
    return { r: Math.min(255, b), g: Math.min(255, r), b: Math.min(255, g * 1.5 + 50) };
  });

  // V7: Make it green (from parker)
  await createTintedPen('parker.png', 'v7.png', (r, g, b) => {
    // Parker is red. Shift red to green
    return { r: g, g: r + 50, b: b };
  });
}

run().catch(console.error);
