// 타이틀 이미지(src/assets/title.webp)에서 캐릭터·집 부분을 잘라 앱 아이콘(PNG)을 만든다.
// 헤드리스 크롬(Playwright)이 필요하다. 사용법: npm run icons
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const CROP = { x: 800, y: 40, size: 468 }; // 원본 1536×1024 기준
const OUT = [
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-192.png', 192],
  ['public/icons/apple-touch-icon.png', 180],
];

const src = `data:image/webp;base64,${readFileSync('src/assets/title.webp').toString('base64')}`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const [file, size] of OUT) {
  const dataUrl = await page.evaluate(
    async ({ src, crop, size }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f6ecdb';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
      return c.toDataURL('image/png');
    },
    { src, crop: CROP, size },
  );
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', file);
}
await browser.close();
