// 앱 아이콘(PNG)을 도트 그림 데이터로부터 생성한다. 외부 라이브러리 없이 동작.
// 사용법: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ART = [
  '................................',
  '................................',
  '................................',
  '...............kk...............',
  '.............kkrrkk.............',
  '...........kkrrrrrrkk...........',
  '.........kkrrrrrrrrrrkk.........',
  '.......kkrrrrrrrrrrrrrrkk.......',
  '.....kkrrrrrrrrrrrrrrrrrrkk.....',
  '....krrrrrrrrrrrrrrrrrrrrrrk....',
  '....kkkkkkkkkkkkkkkkkkkkkkkk....',
  '.....kwwwwwwwwwwwwwwwwwwwwk.....',
  '.....kwwwwwwwwwwwwwwwwwwwwk.....',
  '.....kwwkkkkwwwwwwwwkkkkwwk.....',
  '.....kwwkbbkwwwkkwwwkbbkwwk.....',
  '.....kwwkbbkwwkppkwwkbbkwwk.....',
  '.....kwwkkkkwkppppkwkkkkwwk.....',
  '.....kwwwwwwwkppppkwwwwwwwk.....',
  '.....kwwwwwwwwkppkwwwwwwwwk.....',
  '.....kwwwwwwwwwkkwwwwwwwwwk.....',
  '.....kwwwwwwwwwwwwwwwwwwwwk.....',
  '.....kwwwwwwwkkkkkkwwwwwwwk.....',
  '.....kwwwwwwwkddddkwwwwwwwk.....',
  '.....kwwwwwwwkddddkwwwwwwwk.....',
  '.....kwwwwwwwkddydkwwwwwwwk.....',
  '.....kwwwwwwwkddddkwwwwwwwk.....',
  '.....kkkkkkkkkkkkkkkkkkkkkk.....',
  '...gggggggggggggggggggggggggg...',
  '................................',
  '................................',
  '................................',
  '................................',
];

const PAL = {
  '.': [255, 233, 239],
  k: [59, 37, 48],
  r: [255, 143, 177],
  w: [255, 248, 238],
  b: [143, 211, 255],
  p: [239, 111, 108],
  d: [217, 162, 115],
  y: [255, 216, 102],
  g: [127, 216, 181],
};

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const scale = size / ART.length;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor(y / scale)][Math.floor(x / scale)];
      const [r, g, b] = PAL[ch];
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 192],
]) {
  writeFileSync(`public/icons/${name}`, png(size));
  console.log('wrote', name);
}
