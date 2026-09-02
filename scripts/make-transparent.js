const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const inputDir = path.join(__dirname, '../public/pens');

async function processImages() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.jpg'));

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(inputDir, file.replace('.jpg', '.png'));

    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Strict threshold for white background
    const threshold = 210;

    const w = canvas.width;
    const h = canvas.height;
    const visited = new Uint8Array(w * h);
    const stack = [[0, 0], [w-1, 0], [0, h-1], [w-1, h-1]];
    
    while(stack.length > 0) {
       const [x, y] = stack.pop();
       if (x < 0 || x >= w || y < 0 || y >= h) continue;
       const idx = y * w + x;
       if (visited[idx]) continue;
       visited[idx] = 1;
       
       const dIdx = idx * 4;
       // If pixel is light enough (white/grey background)
       if (data[dIdx] > threshold && data[dIdx+1] > threshold && data[dIdx+2] > threshold) {
         data[dIdx+3] = 0; // Make completely transparent
         stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
       }
    }

    // Do NOT soften edges to avoid leaving a semi-transparent white border.
    // The strict threshold + pure 0 alpha ensures the border is completely gone.

    ctx.putImageData(imageData, 0, 0);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Converted ${file} to PNG (Strict transparent)`);
  }
}

processImages().catch(console.error);
