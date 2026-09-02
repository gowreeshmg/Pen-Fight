const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BRAIN_DIR = '/Users/gowreeshmg/.gemini/antigravity-ide/brain/aff0e86e-bec9-4beb-b52f-e9b239589b2c';
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'pens');

const penMap = [
  { pattern: 'pen_reynolds_transparent', output: 'reynolds.png' },
  { pattern: 'pen_gripper_transparent', output: 'gripper.png' },
  { pattern: 'pen_parker_transparent', output: 'parker.png' },
  { pattern: 'pen_butterflow_transparent', output: 'butterflow.png' },
  { pattern: 'pen_hero_transparent', output: 'hero.png' },
];

async function convertToPNG() {
  for (const item of penMap) {
    const files = fs.readdirSync(BRAIN_DIR).filter(f => f.startsWith(item.pattern));
    if (files.length === 0) {
      console.log(`No file found matching: ${item.pattern}`);
      continue;
    }
    const src = path.join(BRAIN_DIR, files[files.length - 1]); // Use latest
    const dst = path.join(PUBLIC_DIR, item.output);
    
    // Use sharp to convert JPG to PNG. The JPEG won't have real alpha, but we use 
    // mix-blend-mode multiply on a dark/colored background in CSS to drop white.
    // More importantly, for canvas rendering we'll use a custom draw approach.
    await sharp(src).png().toFile(dst);
    console.log(`Converted ${files[files.length - 1]} -> ${item.output}`);
  }
  console.log('Done.');
}

convertToPNG().catch(console.error);
