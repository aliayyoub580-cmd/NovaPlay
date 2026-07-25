/**
 * Generates a simple NovaPlay icon PNG using pure Node.js (no native deps).
 * Writes assets/icon.png (256x256) as a minimal valid PNG.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

// Build RGBA pixel buffer
const buf = Buffer.alloc(SIZE * SIZE * 4);

const cx = SIZE / 2, cy = SIZE / 2;
const R = SIZE / 2 - 4;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Background: transparent
    buf[idx + 3] = 0;

    // Dark circle background
    if (dist < R) {
      buf[idx]     = 26;   // R
      buf[idx + 1] = 26;   // G
      buf[idx + 2] = 26;   // B
      buf[idx + 3] = 255;  // A
    }

    // Orange ring
    if (dist >= R - 8 && dist < R) {
      buf[idx]     = 248;
      buf[idx + 1] = 124;
      buf[idx + 2] = 46;
      buf[idx + 3] = 255;
    }

    // Play triangle: points at (80,72), (80,184), (188,128)
    const tx1 = 80, ty1 = 72;
    const tx2 = 80, ty2 = 184;
    const tx3 = 188, ty3 = 128;
    const d1 = (x - tx3) * (ty1 - ty3) - (tx1 - tx3) * (y - ty3);
    const d2 = (x - tx1) * (ty2 - ty1) - (tx2 - tx1) * (y - ty1);
    const d3 = (x - tx2) * (ty3 - ty2) - (tx3 - tx2) * (y - ty2);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    if (!(hasNeg && hasPos) && dist < R - 8) {
      buf[idx]     = 248;
      buf[idx + 1] = 124;
      buf[idx + 2] = 46;
      buf[idx + 3] = 255;
    }
  }
}

// Encode PNG manually
function crc32(data) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return ((c ^ 0xFFFFFFFF) >>> 0);
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const crcBuf    = Buffer.alloc(4);
  const combined  = Buffer.concat([typeBytes, data]);
  crcBuf.writeUInt32BE(crc32(combined));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE,  0);
ihdr.writeUInt32BE(SIZE,  4);
ihdr[8]  = 8;  // bit depth
ihdr[9]  = 6;  // RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// Raw image data with filter bytes
const rawLines = [];
for (let y = 0; y < SIZE; y++) {
  rawLines.push(Buffer.from([0]));  // filter type: None
  rawLines.push(buf.slice(y * SIZE * 4, (y + 1) * SIZE * 4));
}
const raw      = Buffer.concat(rawLines);
const deflated = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', deflated),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '../assets/icon.png');
fs.writeFileSync(outPath, png);
console.log('Icon written:', outPath, `(${png.length} bytes)`);
